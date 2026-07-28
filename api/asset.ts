import {
  HttpError,
  jsonError,
  requireAuthentication,
} from "../server/portrait-production/auth.js";
import {
  loadJob,
  readPrivate,
  resolveJobAsset,
} from "../server/portrait-production/store.js";

async function handle(request: Request) {
  try {
    if (request.method !== "GET") {
      throw new HttpError(405, "不支持的请求方法。");
    }
    requireAuthentication(request);

    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId") ?? "";
    const assetKey = url.searchParams.get("asset") ?? "";
    const job = await loadJob(jobId);
    const asset = resolveJobAsset(job, assetKey);
    const object = await readPrivate(asset.pathname);

    const headers = new Headers({
      "Content-Type": object.blob.contentType || asset.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    });
    if (asset.download) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${asset.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
      );
    } else {
      headers.set("Content-Disposition", "inline");
    }

    return new Response(object.stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    return jsonError(error);
  }
}

const handler = {
  fetch: handle,
};

export default handler;
