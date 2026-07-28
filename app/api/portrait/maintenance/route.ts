import { NextResponse } from "next/server";
import {
  assertAdmin,
  getPortraitActor,
} from "../../../../src/modules/portrait/auth";
import { deletePrivateObject } from "../../../../src/modules/portrait/assets/storage";
import {
  ensurePortraitDatabase,
  getPortraitDb,
  insertAudit,
  softDeleteAsset,
} from "../../../../src/modules/portrait/database/repository";

export const dynamic = "force-dynamic";

export async function POST() {
  const actor = await getPortraitActor();
  if (!actor) {
    return NextResponse.json({ error: "请先登录后台。" }, { status: 401 });
  }
  try {
    assertAdmin(actor);
    await ensurePortraitDatabase();
    const db = getPortraitDb();
    const expired = await db
      .prepare(
        `SELECT id, order_id, storage_key FROM portrait_assets
         WHERE deleted_at IS NULL AND expires_at IS NOT NULL AND expires_at < ?`,
      )
      .bind(new Date().toISOString())
      .all<{ id: string; order_id: string; storage_key: string }>();
    for (const asset of expired.results ?? []) {
      await deletePrivateObject(asset.storage_key);
      await softDeleteAsset(asset.id);
      await insertAudit(actor, "delete_asset", asset.order_id, asset.id, {
        reason: "retention_expired",
        physicalDelete: true,
      });
    }
    return NextResponse.json({
      ok: true,
      deleted: expired.results?.length ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "清理任务失败。" },
      { status: 400 },
    );
  }
}

