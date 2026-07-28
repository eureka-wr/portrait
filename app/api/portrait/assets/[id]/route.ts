import { NextResponse } from "next/server";
import { getPortraitActor } from "../../../../../src/modules/portrait/auth";
import {
  readPrivateObject,
  verifySignedAssetPath,
} from "../../../../../src/modules/portrait/assets/storage";
import {
  getAssetStorageRecord,
  insertAudit,
} from "../../../../../src/modules/portrait/database/repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const actor = await getPortraitActor();
  const signed = await verifySignedAssetPath(
    id,
    url.searchParams.get("expires"),
    url.searchParams.get("signature"),
  );
  if (!actor && !signed) {
    return NextResponse.json({ error: "图片访问凭证已失效。" }, { status: 401 });
  }
  const asset = await getAssetStorageRecord(id);
  if (!asset || asset.deleted_at) {
    return NextResponse.json(
      { error: "图片已删除或已过保留期。" },
      { status: 404 },
    );
  }
  const object = await readPrivateObject(asset.storage_key);
  if (!object) {
    return NextResponse.json({ error: "私有存储中找不到图片。" }, { status: 404 });
  }
  if (actor) {
    await insertAudit(
      actor,
      asset.kind === "source" ? "view_source_image" : "download_preview",
      asset.order_id,
      asset.id,
      { kind: asset.kind },
    );
  }
  return new NextResponse(object.body, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType || asset.mime_type || "image/jpeg",
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

