import { NextResponse } from "next/server";
import { getPortraitActor } from "../../../../src/modules/portrait/auth";
import { listStudioState } from "../../../../src/modules/portrait/database/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getPortraitActor();
  if (!actor) {
    return NextResponse.json({ error: "请先登录 CATV 肖像后台。" }, { status: 401 });
  }
  try {
    const state = await listStudioState(actor);
    return NextResponse.json(state, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "工作台数据加载失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}

