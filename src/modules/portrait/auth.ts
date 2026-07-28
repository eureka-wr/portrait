import { headers } from "next/headers";
import { getChatGPTUser, requireChatGPTUser } from "../../../app/chatgpt-auth";
import type { PortraitAdminRole } from "./domain/types";

export type PortraitActor = {
  email: string;
  displayName: string;
  role: PortraitAdminRole;
};

async function isLocalRequest() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

function roleForEmail(email: string): PortraitAdminRole {
  const configuredAdmin = process.env.PORTRAIT_ADMIN_EMAIL?.toLowerCase();
  return !configuredAdmin || configuredAdmin === email.toLowerCase()
    ? "admin"
    : "operator";
}

export async function getPortraitActor(): Promise<PortraitActor | null> {
  const user = await getChatGPTUser();
  if (user) {
    return {
      email: user.email,
      displayName: user.displayName,
      role: roleForEmail(user.email),
    };
  }
  if (await isLocalRequest()) {
    return {
      email: "dev.admin@catv.local",
      displayName: "CATV 开发管理员",
      role: "admin",
    };
  }
  return null;
}

export async function requirePortraitActor(returnTo: string) {
  const actor = await getPortraitActor();
  if (actor) return actor;
  const user = await requireChatGPTUser(returnTo);
  return {
    email: user.email,
    displayName: user.displayName,
    role: roleForEmail(user.email),
  } satisfies PortraitActor;
}

export function assertAdmin(actor: PortraitActor) {
  if (actor.role !== "admin") {
    throw new Error("只有 Admin 可以执行此操作。");
  }
}

