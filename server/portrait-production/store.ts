import { del, get, list, put } from "@vercel/blob";
import type {
  PortraitCandidate,
  PortraitJob,
  SafePortraitJob,
  SafePortraitJobSummary,
} from "./types.js";
import { HttpError } from "./auth.js";

const ROOT = "portrait-production";

export function storageConfigured() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID),
  );
}

function statePrefix(jobId: string) {
  return `${ROOT}/jobs/${jobId}/state/`;
}

function assetUrl(jobId: string, asset: string, version: string) {
  const query = new URLSearchParams({ jobId, asset, v: version });
  return `/api/asset?${query.toString()}`;
}

export async function putPrivate(
  pathname: string,
  body: Blob | ArrayBuffer | Buffer | string,
  contentType: string,
) {
  const result = await put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    contentType,
  });
  return result.pathname;
}

export async function readPrivate(pathname: string) {
  if (!pathname.startsWith(`${ROOT}/`) || pathname.includes("..")) {
    throw new HttpError(400, "无效的私有资产路径。");
  }

  const result = await get(pathname, {
    access: "private",
    useCache: false,
  });
  if (!result || result.statusCode !== 200) {
    throw new HttpError(404, "私有资产不存在或已被删除。");
  }
  return result;
}

export async function readPrivateBytes(pathname: string) {
  const result = await readPrivate(pathname);
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

export async function saveJob(job: PortraitJob) {
  const updated: PortraitJob = {
    ...job,
    updatedAt: new Date().toISOString(),
  };
  const sortableTimestamp = Date.now().toString().padStart(13, "0");
  const pathname = `${statePrefix(job.id)}${sortableTimestamp}-${crypto.randomUUID()}.json`;
  await putPrivate(
    pathname,
    JSON.stringify(updated),
    "application/json; charset=utf-8",
  );
  return updated;
}

export async function loadJob(jobId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
    throw new HttpError(400, "订单编号格式无效。");
  }

  const result = await list({
    prefix: statePrefix(jobId),
    limit: 1000,
  });
  const latest = result.blobs
    .filter((blob) => blob.pathname.endsWith(".json"))
    .sort((left, right) => right.pathname.localeCompare(left.pathname))[0];

  if (!latest) {
    throw new HttpError(404, "没有找到这个生产订单。");
  }

  const object = await readPrivate(latest.pathname);
  const json = await new Response(object.stream).json();
  return json as PortraitJob;
}

export async function listJobs(limit = 100) {
  const latestByJob = new Map<
    string,
    { pathname: string; uploadedAt: Date }
  >();
  let cursor: string | undefined;
  let pageCount = 0;

  do {
    const result = await list({
      prefix: `${ROOT}/jobs/`,
      limit: 1000,
      cursor,
    });
    for (const blob of result.blobs) {
      const match = blob.pathname.match(
        /^portrait-production\/jobs\/([0-9a-f-]{36})\/state\/[^/]+\.json$/i,
      );
      if (!match) continue;
      const current = latestByJob.get(match[1]);
      if (!current || blob.pathname.localeCompare(current.pathname) > 0) {
        latestByJob.set(match[1], {
          pathname: blob.pathname,
          uploadedAt: blob.uploadedAt,
        });
      }
    }
    cursor = result.hasMore ? result.cursor : undefined;
    pageCount += 1;
  } while (cursor && pageCount < 20);

  const latestObjects = [...latestByJob.values()]
    .sort(
      (left, right) =>
        right.uploadedAt.getTime() - left.uploadedAt.getTime(),
    )
    .slice(0, Math.max(1, Math.min(limit, 100)));
  const jobs: PortraitJob[] = [];

  for (let index = 0; index < latestObjects.length; index += 10) {
    const batch = latestObjects.slice(index, index + 10);
    const results = await Promise.allSettled(
      batch.map(async ({ pathname }) => {
        const object = await readPrivate(pathname);
        return (await new Response(object.stream).json()) as PortraitJob;
      }),
    );
    for (const result of results) {
      if (result.status === "fulfilled") jobs.push(result.value);
    }
  }

  return jobs.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function toSafeJob(job: PortraitJob): SafePortraitJob {
  const publicJob = Object.fromEntries(
    Object.entries(job).filter(
      ([key]) => !["source", "candidates", "delivery"].includes(key),
    ),
  ) as Omit<PortraitJob, "source" | "candidates" | "delivery">;
  const source = {
    originalName: job.source.originalName,
    mimeType: job.source.mimeType,
    width: job.source.width,
    height: job.source.height,
    sizeBytes: job.source.sizeBytes,
    url: assetUrl(job.id, "source", job.updatedAt),
  };

  const candidates = job.candidates.map((candidate) => ({
    id: candidate.id,
    label: candidate.label,
    description: candidate.description,
    mimeType: candidate.mimeType,
    status: candidate.status,
    portraitDNAId: candidate.portraitDNAId,
    portraitDNAVersion: candidate.portraitDNAVersion,
    engineVersion: candidate.engineVersion,
    compilerVersion: candidate.compilerVersion,
    promptChecksum: candidate.promptChecksum,
    reviewChecklist: candidate.reviewChecklist,
    rejectionReasons: candidate.rejectionReasons,
    createdAt: candidate.createdAt,
    url: assetUrl(job.id, `candidate:${candidate.id}`, job.updatedAt),
  }));

  const safe: SafePortraitJob = {
    ...publicJob,
    source,
    candidates,
  };

  if (job.delivery) {
    safe.delivery = {
      createdAt: job.delivery.createdAt,
      filename: job.delivery.filename,
      url: assetUrl(job.id, "delivery", job.updatedAt),
    };
  }

  return safe;
}

export function toSafeJobSummary(
  job: PortraitJob,
): SafePortraitJobSummary {
  return {
    id: job.id,
    orderNo: job.orderNo,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    customerName: job.customerName,
    channel: job.channel,
    status: job.status,
    error: job.error,
    candidateCount: job.candidates.length,
    approvedCount: job.candidates.filter((candidate) =>
      ["approved", "selected"].includes(candidate.status),
    ).length,
    hasSelection: Boolean(job.selectedCandidateId),
    deliveryReady: Boolean(job.delivery),
  };
}

export function resolveJobAsset(job: PortraitJob, asset: string) {
  if (asset === "source") {
    return {
      pathname: job.source.pathname,
      contentType: job.source.mimeType,
      filename: "source-reference.jpg",
      download: false,
    };
  }

  if (asset === "delivery" && job.delivery) {
    return {
      pathname: job.delivery.pathname,
      contentType: "application/zip",
      filename: job.delivery.filename,
      download: true,
    };
  }

  if (asset.startsWith("candidate:")) {
    const candidateId = asset.slice("candidate:".length);
    const candidate = job.candidates.find((item) => item.id === candidateId);
    if (candidate) {
      return {
        pathname: candidate.pathname,
        contentType: candidate.mimeType,
        filename: `candidate-${candidate.id}.jpg`,
        download: false,
      };
    }
  }

  throw new HttpError(404, "订单中没有找到这个资产。");
}

export async function deleteJobAssets(job: PortraitJob) {
  const stateObjects = await list({
    prefix: `${ROOT}/jobs/${job.id}/`,
    limit: 1000,
  });
  const paths = new Set(stateObjects.blobs.map((blob) => blob.pathname));
  paths.add(job.source.pathname);
  for (const candidate of job.candidates) paths.add(candidate.pathname);
  if (job.delivery) paths.add(job.delivery.pathname);

  if (paths.size > 0) {
    await del([...paths]);
  }
}

export function candidateAssetPath(jobId: string, candidate: PortraitCandidate) {
  return `${ROOT}/jobs/${jobId}/candidates/${candidate.id}-${crypto.randomUUID()}.jpg`;
}

export function sourceAssetPath(jobId: string) {
  return `${ROOT}/jobs/${jobId}/source/reference.jpg`;
}

export function deliveryAssetPath(jobId: string) {
  return `${ROOT}/jobs/${jobId}/delivery/CATV-${jobId.slice(0, 8)}.zip`;
}
