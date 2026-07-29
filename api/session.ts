import {
  authConfigured,
  clearSessionCookie,
  createSessionCookie,
  isAuthenticated,
  jsonError,
  requireSameOrigin,
  verifyAccessKey,
  HttpError,
} from "../server/portrait-production/auth.js";
import { providerConfigured } from "../server/portrait-production/generation.js";
import { storageConfigured } from "../server/portrait-production/store.js";

function status(request: Request) {
  return Response.json(
    {
      authenticated: isAuthenticated(request),
      configured: {
        access: authConfigured(),
        provider: providerConfigured(),
        storage: storageConfigured(),
      },
      model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function handle(request: Request) {
  try {
    if (request.method === "GET") return status(request);

    requireSameOrigin(request);

    if (request.method === "DELETE") {
      return Response.json(
        { authenticated: false },
        {
          headers: {
            "Set-Cookie": clearSessionCookie(),
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (request.method !== "POST") {
      throw new HttpError(405, "不支持的请求方法。");
    }
    if (!authConfigured()) {
      throw new HttpError(503, "工作台访问口令尚未配置。");
    }

    const body = (await request.json()) as { accessKey?: unknown };
    const candidate =
      typeof body.accessKey === "string" ? body.accessKey.trim() : "";
    if (candidate.length > 256 || !verifyAccessKey(candidate)) {
      throw new HttpError(401, "访问口令不正确。");
    }

    return Response.json(
      { authenticated: true },
      {
        headers: {
          "Set-Cookie": createSessionCookie(),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return jsonError(error);
  }
}

const handler = {
  fetch: handle,
};

export default handler;
