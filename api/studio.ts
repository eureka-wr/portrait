import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  HttpError,
  jsonError,
  requireAuthentication,
  requireSameOrigin,
} from "../server/portrait-production/auth.js";
import {
  createDeliveryPackage,
  generateFourCandidates,
  providerConfigured,
} from "../server/portrait-production/generation.js";
import {
  deleteJobAssets,
  loadJob,
  putPrivate,
  saveJob,
  sourceAssetPath,
  toSafeJob,
} from "../server/portrait-production/store.js";
import type {
  CandidateStatus,
  PortraitJob,
} from "../server/portrait-production/types.js";

export const config = {
  maxDuration: 300,
};

const MAX_UPLOAD_BYTES = 4_000_000;
const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function cleanText(value: FormDataEntryValue | null, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function orderNumber() {
  const now = new Date();
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  return `${date}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

async function createJob(request: Request) {
  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) {
    throw new HttpError(400, "请选择一张客户原图。");
  }
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    throw new HttpError(415, "仅支持 JPEG、PNG 或 WebP 照片。");
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new HttpError(413, "处理后的照片必须小于 4MB。");
  }
  if (form.get("consentConfirmed") !== "true") {
    throw new HttpError(400, "需要确认客户授权与单人照片要求。");
  }

  const input = Buffer.from(await file.arrayBuffer());
  let normalized: Buffer;
  let width = 0;
  let height = 0;
  try {
    const source = sharp(input, {
      failOn: "warning",
      limitInputPixels: 50_000_000,
    }).rotate();
    const metadata = await source.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("missing dimensions");
    }
    if (Math.min(metadata.width, metadata.height) < 512) {
      throw new HttpError(400, "照片分辨率过低，短边至少需要 512px。");
    }
    normalized = await source
      .resize({
        width: 2048,
        height: 2048,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 94,
        chromaSubsampling: "4:4:4",
      })
      .toBuffer();
    const outputMetadata = await sharp(normalized).metadata();
    width = outputMetadata.width ?? 0;
    height = outputMetadata.height ?? 0;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "照片文件无法读取，请换一张清晰的原始照片。");
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const pathname = await putPrivate(
    sourceAssetPath(id),
    normalized,
    "image/jpeg",
  );

  const job: PortraitJob = {
    id,
    orderNo: orderNumber(),
    createdAt: now,
    updatedAt: now,
    customerName: cleanText(form.get("customerName"), 80),
    channel: cleanText(form.get("channel"), 60) || "职业主页",
    notes: cleanText(form.get("notes"), 600),
    consentConfirmed: true,
    status: "ready",
    source: {
      pathname,
      originalName: file.name.slice(0, 160),
      mimeType: "image/jpeg",
      width,
      height,
      sizeBytes: normalized.byteLength,
    },
    candidates: [],
  };

  return saveJob(job);
}

async function handleAction(body: Record<string, unknown>) {
  const action = typeof body.action === "string" ? body.action : "";
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  const job = await loadJob(jobId);

  if (action === "generate") {
    if (!providerConfigured()) {
      throw new HttpError(503, "OpenAI API Key 尚未配置，暂时不能生成照片。");
    }
    if (job.status === "generating") {
      throw new HttpError(409, "四张照片正在生成，请勿重复提交。");
    }
    if (!["ready", "failed", "review"].includes(job.status)) {
      throw new HttpError(409, "当前订单状态不能重新生成。");
    }

    let running = await saveJob({
      ...job,
      status: "generating",
      candidates: [],
      selectedCandidateId: undefined,
      delivery: undefined,
      error: undefined,
    });
    try {
      const generated = await generateFourCandidates(running);
      running = await saveJob({
        ...running,
        ...generated,
        status: "review",
      });
      return running;
    } catch (error) {
      await saveJob({
        ...running,
        status: "failed",
        error:
          error instanceof HttpError
            ? error.message
            : "本次生成没有完成，请稍后重试。",
      });
      throw error;
    }
  }

  if (action === "review") {
    if (job.status !== "review") {
      throw new HttpError(409, "只有待审核订单可以执行候选审核。");
    }
    const candidateId =
      typeof body.candidateId === "string" ? body.candidateId : "";
    const decision = body.decision;
    if (decision !== "approved" && decision !== "rejected") {
      throw new HttpError(400, "无效的审核结果。");
    }
    const candidate = job.candidates.find((item) => item.id === candidateId);
    if (!candidate) throw new HttpError(404, "没有找到这张候选图。");
    const candidates = job.candidates.map((item) =>
      item.id === candidateId
        ? { ...item, status: decision as CandidateStatus }
        : item,
    );
    return saveJob({ ...job, candidates });
  }

  if (action === "select") {
    if (job.status !== "review" && job.status !== "selected") {
      throw new HttpError(409, "当前订单还不能定稿。");
    }
    const candidateId =
      typeof body.candidateId === "string" ? body.candidateId : "";
    const target = job.candidates.find((item) => item.id === candidateId);
    if (!target || (target.status !== "approved" && target.status !== "selected")) {
      throw new HttpError(409, "候选图需要先通过人工审核，才能定稿。");
    }
    const candidates = job.candidates.map((item) => ({
      ...item,
      status:
        item.id === candidateId
          ? ("selected" as const)
          : item.status === "selected"
            ? ("approved" as const)
            : item.status,
    }));
    return saveJob({
      ...job,
      status: "selected",
      selectedCandidateId: candidateId,
      candidates,
      delivery: undefined,
    });
  }

  if (action === "deliver") {
    if (job.status === "delivered") return job;
    if (job.status !== "selected") {
      throw new HttpError(409, "请先完成最终照片选择。");
    }
    let delivering = await saveJob({ ...job, status: "delivering" });
    try {
      const delivery = await createDeliveryPackage(delivering);
      delivering = await saveJob({
        ...delivering,
        status: "delivered",
        delivery,
      });
      return delivering;
    } catch (error) {
      await saveJob({
        ...delivering,
        status: "selected",
        error: "交付包生成失败，请重新尝试。",
      });
      throw error;
    }
  }

  if (action === "delete") {
    await deleteJobAssets(job);
    return null;
  }

  throw new HttpError(400, "未知的工作台操作。");
}

async function handle(request: Request) {
  try {
    requireAuthentication(request);

    if (request.method === "GET") {
      const jobId = new URL(request.url).searchParams.get("jobId") ?? "";
      const job = await loadJob(jobId);
      return Response.json(
        { job: toSafeJob(job) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (request.method !== "POST") {
      throw new HttpError(405, "不支持的请求方法。");
    }
    requireSameOrigin(request);

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const job = await createJob(request);
      return Response.json(
        { job: toSafeJob(job) },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const job = await handleAction(body);
    return Response.json(
      job ? { job: toSafeJob(job) } : { deleted: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}

const handler = {
  fetch: handle,
};

export default handler;
