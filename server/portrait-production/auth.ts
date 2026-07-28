import {
  createHmac,
  createHash,
  timingSafeEqual,
} from "node:crypto";

const COOKIE_NAME = "catv_portrait_session";
const SESSION_SECONDS = 12 * 60 * 60;

function accessKey() {
  return process.env.PORTRAIT_ACCESS_KEY?.trim() ?? "";
}

function signature(expiresAt: string) {
  return createHmac("sha256", accessKey())
    .update(`catv-portrait:${expiresAt}`)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const pair of cookieHeader.split(";")) {
    const [key, ...value] = pair.trim().split("=");
    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }
  return null;
}

export function authConfigured() {
  return accessKey().length >= 12;
}

export function verifyAccessKey(candidate: string) {
  const expected = accessKey();
  return expected.length >= 12 && safeEqual(candidate, expected);
}

export function createSessionCookie() {
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const token = `${expiresAt}.${signature(expiresAt)}`;
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isAuthenticated(request: Request) {
  if (!authConfigured()) return false;

  const token = readCookie(request, COOKIE_NAME);
  if (!token) return false;

  const [expiresAt, suppliedSignature] = token.split(".");
  if (!expiresAt || !suppliedSignature) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;

  return safeEqual(suppliedSignature, signature(expiresAt));
}

export function requireAuthentication(request: Request) {
  if (!isAuthenticated(request)) {
    throw new HttpError(401, "登录已过期，请重新输入工作台访问口令。");
  }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return;

  try {
    if (new URL(origin).host !== host) {
      throw new HttpError(403, "请求来源未通过校验。");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(403, "请求来源未通过校验。");
  }
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return Response.json(
    { error: "服务器处理失败，请稍后重试；若持续发生，请查看运行日志。" },
    { status: 500 },
  );
}
