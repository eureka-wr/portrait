import { NextResponse } from "next/server";
import { getPortraitActor } from "../../../../src/modules/portrait/auth";
import {
  deletePrivateObject,
  putPrivateObject,
  validateImageFile,
} from "../../../../src/modules/portrait/assets/storage";
import {
  createOrderRecord,
  getPortraitStyleDefinition,
  insertAssetRecord,
  insertAudit,
} from "../../../../src/modules/portrait/database/repository";

export const dynamic = "force-dynamic";

function orderNumber() {
  const now = new Date();
  const date = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  return `CATV-${date}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

export async function POST(request: Request) {
  const actor = await getPortraitActor();
  if (!actor) {
    return NextResponse.json({ error: "请先登录后台。" }, { status: 401 });
  }

  let storageKey: string | null = null;
  try {
    const form = await request.formData();
    const file = form.get("sourceImage");
    if (!(file instanceof File)) {
      throw new Error("请上传一张客户原图。");
    }
    const styleId = String(form.get("styleId") || "");
    const style = await getPortraitStyleDefinition(styleId);
    const image = await validateImageFile(file);
    const orderId = crypto.randomUUID();
    const assetId = crypto.randomUUID();
    storageKey = await putPrivateObject(
      orderId,
      "source",
      image.bytes,
      image.mimeType,
    );
    await createOrderRecord({
      id: orderId,
      orderNumber: orderNumber(),
      customerNickname: String(form.get("customerNickname") || ""),
      customerContactNote: String(form.get("customerContactNote") || ""),
      sourceChannel: String(form.get("sourceChannel") || "xiaohongshu"),
      selectedStyleId: style.id,
      selectedStyleVersion: style.version,
      priceFen: Number(form.get("priceFen") || 990),
      paymentStatus: String(form.get("paymentStatus") || "unpaid"),
      customerRequirements: String(form.get("customerRequirements") || ""),
      internalNotes: String(form.get("internalNotes") || ""),
      assignedOperatorId: actor.email,
    });
    const retentionDays = Number(
      process.env.UNFINISHED_ORDER_RETENTION_DAYS || 14,
    );
    await insertAssetRecord({
      id: assetId,
      orderId,
      kind: "source",
      storageKey,
      mimeType: image.mimeType,
      width: image.width,
      height: image.height,
      sizeBytes: image.bytes.byteLength,
      expiresAt: new Date(
        Date.now() + retentionDays * 86_400_000,
      ).toISOString(),
    });
    await insertAudit(actor, "create_order", orderId, orderId, {
      sourceChannel: String(form.get("sourceChannel") || "xiaohongshu"),
      styleId: style.id,
      styleVersion: style.version,
    });
    await insertAudit(actor, "upload_source_image", orderId, assetId, {
      mimeType: image.mimeType,
      width: image.width,
      height: image.height,
      analysis:
        image.width && image.height
          ? "图片格式和基础尺寸检查通过；人脸检测使用 Mock Analyzer，需人工确认。"
          : "图片格式检查通过；尺寸将在生成前再次检查。",
    });
    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    if (storageKey) {
      await deletePrivateObject(storageKey).catch(() => undefined);
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "订单创建失败，请检查输入。",
      },
      { status: 400 },
    );
  }
}
