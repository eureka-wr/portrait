import { NextResponse } from "next/server";
import {
  assertAdmin,
  getPortraitActor,
} from "../../../../src/modules/portrait/auth";
import {
  deletePrivateObject,
  putPrivateObject,
  readPrivateObject,
  validateImageFile,
} from "../../../../src/modules/portrait/assets/storage";
import {
  countSelectedPreviews,
  createDnaDraft,
  createGenerationJob,
  ensurePortraitDatabase,
  getAssetStorageRecord,
  getCandidateRecord,
  getOrderAssetsForDeletion,
  getOrderRecord,
  getPortraitDb,
  getSourceAsset,
  insertAssetRecord,
  insertAudit,
  insertCandidateRecord,
  latestCompiledPrompt,
  markCustomerSelected,
  saveCompiledPrompt,
  softDeleteAsset,
  updateCandidateStatus,
  updateGenerationJob,
  updateOrderStatus,
} from "../../../../src/modules/portrait/database/repository";
import { compilePrompt } from "../../../../src/modules/portrait/prompts/compiler";
import { getPortraitProvider } from "../../../../src/modules/portrait/providers/provider";

export const dynamic = "force-dynamic";

type ActionBody = {
  action: string;
  orderId?: string;
  candidateId?: string;
  provider?: string;
  debugScenario?: string;
  reasons?: string[];
  notes?: string;
  positiveReasons?: string[];
  negativeReasons?: string[];
  freeText?: string;
  refinement?: string;
  styleId?: string;
};

function fail(error: unknown, status = 400) {
  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "当前操作未完成，请稍后重试。",
    },
    { status },
  );
}

async function compileForOrder(
  actor: NonNullable<Awaited<ReturnType<typeof getPortraitActor>>>,
  orderId: string,
  refinement?: string,
) {
  const order = await getOrderRecord(orderId);
  if (!order) throw new Error("订单不存在或已被删除。");
  const prompt = await compilePrompt({
    portraitDNAId: String(order.selected_style_id),
    portraitDNAVersion: String(order.selected_style_version),
    sourceContext:
      "A single customer-supplied source image is attached. Preserve identity exactly. Basic technical analysis passed; all quality and identity judgments remain subject to human review.",
    operatorPreferences: order.customer_requirements
      ? String(order.customer_requirements)
      : undefined,
    refinementRequest: refinement,
  });
  const promptId = await saveCompiledPrompt(orderId, prompt);
  await insertAudit(actor, "compile_prompt", orderId, promptId, {
    portraitDNAId: prompt.portraitDNAId,
    portraitDNAVersion: prompt.portraitDNAVersion,
    compilerVersion: prompt.compilerVersion,
    checksum: prompt.checksum.slice(0, 12),
    refinement: Boolean(refinement),
  });
  return { order, prompt: { ...prompt, id: promptId } };
}

async function generateCandidates(
  actor: NonNullable<Awaited<ReturnType<typeof getPortraitActor>>>,
  input: {
    orderId: string;
    provider?: string;
    debugScenario?: string;
    sourceCandidateId?: string;
    refinement?: string;
    count?: number;
  },
) {
  const compiled = await compileForOrder(
    actor,
    input.orderId,
    input.refinement,
  );
  const sourceRecord = input.sourceCandidateId
    ? await (async () => {
        const candidate = await getCandidateRecord(
          input.sourceCandidateId as string,
        );
        if (!candidate?.master_asset_id) {
          throw new Error("微调来源候选没有可用高清母图。");
        }
        const asset = await getAssetStorageRecord(
          String(candidate.master_asset_id),
        );
        return asset
          ? {
              id: asset.id,
              storage_key: asset.storage_key,
              mime_type: asset.mime_type,
            }
          : null;
      })()
    : await getSourceAsset(input.orderId);
  if (!sourceRecord) {
    throw new Error("客户原图已删除或过期，无法运行生成任务。");
  }
  const sourceObject = await readPrivateObject(sourceRecord.storage_key);
  if (!sourceObject) throw new Error("私有存储中找不到生成来源图片。");
  const source = new Uint8Array(await sourceObject.arrayBuffer());
  const provider = getPortraitProvider(input.provider);
  const jobId = crypto.randomUUID();
  const count = input.count ?? 4;
  await createGenerationJob({
    id: jobId,
    orderId: input.orderId,
    providerName: provider.providerName,
    requestedCount: count,
    maxRetries: 1,
    idempotencyKey: `${input.orderId}:${compiled.prompt.checksum}:${Date.now()}`,
  });
  await updateOrderStatus(input.orderId, "generating");
  await updateGenerationJob(jobId, "calling_provider");
  await insertAudit(actor, "start_generation", input.orderId, jobId, {
    provider: provider.providerName,
    requestedCount: count,
  });

  try {
    const results = await provider.generate({
      orderId: input.orderId,
      source,
      sourceMimeType: sourceRecord.mime_type,
      positivePrompt: compiled.prompt.positivePrompt,
      negativePrompt: compiled.prompt.negativePrompt,
      count,
      outputWidth: 1024,
      outputHeight: 1536,
      metadata: {
        portraitDNAId: String(compiled.order.selected_style_id),
        portraitDNAVersion: String(compiled.order.selected_style_version),
        compiledPromptId: compiled.prompt.id,
      },
      debugScenario: input.debugScenario,
    });
    if (input.debugScenario === "storage_failure") {
      throw new Error("模拟私有存储失败。Provider 成功结果未写入，可安全重试。");
    }
    await updateGenerationJob(jobId, "processing_assets");
    let completed = 0;
    for (const [index, result] of results.entries()) {
      const candidateId = crypto.randomUUID();
      const assetId = crypto.randomUUID();
      const storageKey = await putPrivateObject(
        input.orderId,
        "provider_output",
        result.bytes,
        result.mimeType,
      );
      await insertAssetRecord({
        id: assetId,
        orderId: input.orderId,
        candidateId,
        kind: "master",
        storageKey,
        mimeType: result.mimeType,
        sizeBytes: result.bytes.byteLength,
      });
      await insertCandidateRecord({
        id: candidateId,
        orderId: input.orderId,
        generationJobId: jobId,
        portraitDNAId: String(compiled.order.selected_style_id),
        portraitDNAVersion: String(compiled.order.selected_style_version),
        providerName: result.providerName,
        providerModel: result.providerModel,
        compiledPromptId: compiled.prompt.id,
        masterAssetId: assetId,
        status:
          input.debugScenario === "quality_failure" && index === 0
            ? "quality_failed"
            : "awaiting_review",
        qualityScore:
          input.debugScenario === "quality_failure" && index === 0
            ? 54
            : 91 - index * 2,
        variant: index + 1,
      });
      completed += 1;
    }
    await updateGenerationJob(
      jobId,
      completed < count ? "partially_completed" : "awaiting_review",
      completed,
      completed < count
        ? `图像模型本次只返回了 ${completed} 张有效结果。已保留成功结果，你可以补生成另外 ${count - completed} 张。`
        : null,
    );
    await updateOrderStatus(input.orderId, "awaiting_internal_review");
    return {
      jobId,
      completed,
      message:
        completed < count
          ? `已保留 ${completed} 张成功结果，可补生成 ${count - completed} 张。`
          : `已生成 ${completed} 张内部候选，等待人工审核。`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "图像 Provider 调用失败。";
    await updateGenerationJob(jobId, "failed", 0, message);
    await updateOrderStatus(input.orderId, "failed");
    throw error;
  }
}

async function handleManualUpload(
  actor: NonNullable<Awaited<ReturnType<typeof getPortraitActor>>>,
  form: FormData,
) {
  const orderId = String(form.get("orderId") || "");
  const file = form.get("candidateImage");
  if (!orderId || !(file instanceof File)) {
    throw new Error("请选择订单并上传一张外部生成结果。");
  }
  const image = await validateImageFile(file);
  const order = await getOrderRecord(orderId);
  if (!order) throw new Error("订单不存在。");
  const compiled =
    (await latestCompiledPrompt(orderId)) ??
    (await compileForOrder(actor, orderId)).prompt;
  const jobId = crypto.randomUUID();
  await createGenerationJob({
    id: jobId,
    orderId,
    providerName: "manual_external",
    requestedCount: 1,
    maxRetries: 0,
    idempotencyKey: `${orderId}:manual:${crypto.randomUUID()}`,
  });
  const candidateId = crypto.randomUUID();
  const assetId = crypto.randomUUID();
  const storageKey = await putPrivateObject(
    orderId,
    "manual_external",
    image.bytes,
    image.mimeType,
  );
  await insertAssetRecord({
    id: assetId,
    orderId,
    candidateId,
    kind: "master",
    storageKey,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    sizeBytes: image.bytes.byteLength,
  });
  await insertCandidateRecord({
    id: candidateId,
    orderId,
    generationJobId: jobId,
    portraitDNAId: String(order.selected_style_id),
    portraitDNAVersion: String(order.selected_style_version),
    providerName: "manual_external",
    providerModel: String(form.get("externalTool") || "external-tool"),
    compiledPromptId: String(compiled.id),
    masterAssetId: assetId,
    qualityScore: 86,
    variant: Number(Date.now() % 100),
  });
  await updateGenerationJob(jobId, "awaiting_review", 1);
  await updateOrderStatus(orderId, "awaiting_internal_review");
  await insertAudit(actor, "upload_manual_candidate", orderId, candidateId, {
    externalTool: String(form.get("externalTool") || "未备注"),
  });
  return { ok: true, candidateId };
}

export async function POST(request: Request) {
  const actor = await getPortraitActor();
  if (!actor) return fail(new Error("请先登录后台。"), 401);

  try {
    await ensurePortraitDatabase();
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json(
        await handleManualUpload(actor, await request.formData()),
      );
    }

    const body = (await request.json()) as ActionBody;
    const orderId = body.orderId || "";
    const candidateId = body.candidateId || "";

    switch (body.action) {
      case "compile": {
        if (!orderId) throw new Error("缺少订单 ID。");
        const { prompt } = await compileForOrder(actor, orderId);
        return NextResponse.json({ ok: true, promptId: prompt.id });
      }
      case "copy_prompt": {
        if (!orderId) throw new Error("缺少订单 ID。");
        await insertAudit(actor, "copy_prompt", orderId, body.candidateId, {
          copiedBy: actor.role,
        });
        return NextResponse.json({ ok: true });
      }
      case "generate": {
        if (!orderId) throw new Error("缺少订单 ID。");
        return NextResponse.json(
          await generateCandidates(actor, {
            orderId,
            provider: body.provider,
            debugScenario: body.debugScenario,
          }),
        );
      }
      case "approve_candidate": {
        if (!candidateId) throw new Error("缺少候选图 ID。");
        const candidate = await getCandidateRecord(candidateId);
        if (!candidate) throw new Error("候选图不存在。");
        await updateCandidateStatus(
          candidateId,
          "approved",
          [],
          body.notes,
        );
        await insertAudit(
          actor,
          "approve_candidate",
          String(candidate.order_id),
          candidateId,
        );
        return NextResponse.json({ ok: true });
      }
      case "reject_candidate": {
        if (!candidateId) throw new Error("缺少候选图 ID。");
        const candidate = await getCandidateRecord(candidateId);
        if (!candidate) throw new Error("候选图不存在。");
        await updateCandidateStatus(
          candidateId,
          "rejected",
          body.reasons ?? ["other"],
          body.notes,
        );
        await insertAudit(
          actor,
          "reject_candidate",
          String(candidate.order_id),
          candidateId,
          { reasons: body.reasons ?? ["other"] },
        );
        return NextResponse.json({ ok: true });
      }
      case "toggle_preview": {
        if (!candidateId) throw new Error("缺少候选图 ID。");
        const candidate = await getCandidateRecord(candidateId);
        if (!candidate) throw new Error("候选图不存在。");
        const current = String(candidate.status);
        if (current === "selected_for_preview") {
          await updateCandidateStatus(candidateId, "approved");
        } else {
          if (!["approved", "awaiting_review"].includes(current)) {
            throw new Error("只有通过审核的候选图可以发送给客户。");
          }
          const count = await countSelectedPreviews(String(candidate.order_id));
          if (count >= 2) throw new Error("每个订单最多选择两张客户预览。");
          await updateCandidateStatus(candidateId, "selected_for_preview");
          await updateOrderStatus(String(candidate.order_id), "preview_ready");
        }
        await insertAudit(
          actor,
          "select_for_preview",
          String(candidate.order_id),
          candidateId,
          { selected: current !== "selected_for_preview" },
        );
        return NextResponse.json({ ok: true });
      }
      case "preview_sent": {
        if (!orderId) throw new Error("缺少订单 ID。");
        const db = getPortraitDb();
        const selected = await countSelectedPreviews(orderId);
        if (selected !== 2) throw new Error("发送前必须正好选择两张客户预览。");
        await db
          .prepare(
            `UPDATE portrait_candidates SET status = 'sent_to_customer', updated_at = ?
             WHERE order_id = ? AND status = 'selected_for_preview'`,
          )
          .bind(new Date().toISOString(), orderId)
          .run();
        await updateOrderStatus(orderId, "awaiting_customer_selection");
        await insertAudit(actor, "download_preview", orderId, null, {
          count: 2,
          markedSent: true,
        });
        return NextResponse.json({ ok: true });
      }
      case "customer_select": {
        if (!orderId || !candidateId) throw new Error("缺少订单或候选图 ID。");
        await markCustomerSelected({
          orderId,
          candidateId,
          positiveReasons: body.positiveReasons ?? [],
          negativeReasons: body.negativeReasons ?? [],
          freeText: body.freeText ?? "",
        });
        await insertAudit(
          actor,
          "record_customer_selection",
          orderId,
          candidateId,
          { positiveReasons: body.positiveReasons ?? [] },
        );
        return NextResponse.json({ ok: true });
      }
      case "refine": {
        if (!orderId || !candidateId || !body.refinement) {
          throw new Error("请填写微调要求并选择来源候选图。");
        }
        const db = getPortraitDb();
        await db
          .prepare(
            `INSERT INTO portrait_refinements (id, order_id, source_candidate_id, request_json, created_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            orderId,
            candidateId,
            JSON.stringify({ freeText: body.refinement }),
            new Date().toISOString(),
          )
          .run();
        await insertAudit(actor, "create_refinement", orderId, candidateId, {
          fields: ["freeText"],
        });
        return NextResponse.json(
          await generateCandidates(actor, {
            orderId,
            provider: body.provider,
            sourceCandidateId: candidateId,
            refinement: body.refinement,
            count: 1,
          }),
        );
      }
      case "export_final": {
        if (!orderId || !candidateId) throw new Error("缺少最终候选图。");
        const candidate = await getCandidateRecord(candidateId);
        if (!candidate || String(candidate.status) !== "customer_selected") {
          throw new Error("只有客户最终选中的照片可以导出。");
        }
        await updateCandidateStatus(candidateId, "finalized");
        await updateOrderStatus(orderId, "ready_to_deliver");
        await insertAudit(actor, "export_final_assets", orderId, candidateId, {
          formats: [
            "hd_jpg",
            "hd_png",
            "square",
            "portrait",
            "resume",
            "white_background",
            "compressed",
            "zip",
          ],
        });
        return NextResponse.json({ ok: true });
      }
      case "complete": {
        if (!orderId) throw new Error("缺少订单 ID。");
        await updateOrderStatus(orderId, "completed", {
          completed: true,
          retentionDays: Number(
            process.env.COMPLETED_ORDER_IMAGE_RETENTION_DAYS || 7,
          ),
        });
        const db = getPortraitDb();
        await db
          .prepare(
            `UPDATE portrait_candidates SET status = 'delivered', updated_at = ?
             WHERE order_id = ? AND status = 'finalized'`,
          )
          .bind(new Date().toISOString(), orderId)
          .run();
        await insertAudit(actor, "complete_order", orderId, orderId, {
          retentionDays: Number(
            process.env.COMPLETED_ORDER_IMAGE_RETENTION_DAYS || 7,
          ),
        });
        return NextResponse.json({ ok: true });
      }
      case "delete_assets": {
        if (!orderId) throw new Error("缺少订单 ID。");
        const assets = await getOrderAssetsForDeletion(orderId);
        for (const asset of assets) {
          await deletePrivateObject(asset.storage_key);
          await softDeleteAsset(asset.id);
          await insertAudit(actor, "delete_asset", orderId, asset.id, {
            physicalDelete: true,
          });
        }
        return NextResponse.json({ ok: true, deleted: assets.length });
      }
      case "duplicate_dna": {
        assertAdmin(actor);
        if (!body.styleId) throw new Error("缺少风格 ID。");
        const draft = await createDnaDraft(body.styleId);
        await insertAudit(actor, "change_portrait_dna", null, draft.id, {
          action: "duplicate_as_draft",
          version: draft.version,
        });
        return NextResponse.json({ ok: true, draft });
      }
      default:
        throw new Error("不支持的后台操作。");
    }
  } catch (error) {
    return fail(error);
  }
}
