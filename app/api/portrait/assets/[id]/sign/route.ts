import { NextResponse } from "next/server";
import { getPortraitActor } from "../../../../../../src/modules/portrait/auth";
import { createSignedAssetPath } from "../../../../../../src/modules/portrait/assets/storage";
import {
  getAssetStorageRecord,
  insertAudit,
} from "../../../../../../src/modules/portrait/database/repository";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await getPortraitActor();
  if (!actor) {
    return NextResponse.json({ error: "请先登录后台。" }, { status: 401 });
  }
  const { id } = await context.params;
  const asset = await getAssetStorageRecord(id);
  if (!asset || asset.deleted_at) {
    return NextResponse.json({ error: "图片已删除或过期。" }, { status: 404 });
  }
  const expiresInSeconds = Number(
    process.env.SIGNED_URL_EXPIRATION_MINUTES || 15,
  ) * 60;
  const path = await createSignedAssetPath(id, expiresInSeconds);
  await insertAudit(actor, "download_preview", asset.order_id, id, {
    signedAccessCreated: true,
    expiresInSeconds,
  });
  return NextResponse.json({ path, expiresInSeconds });
}

