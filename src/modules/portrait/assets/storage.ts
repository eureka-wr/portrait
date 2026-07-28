import { env } from "cloudflare:workers";

type PortraitRuntimeEnv = {
  PORTRAIT_ASSETS?: R2Bucket;
  ASSET_SIGNING_SECRET?: string;
  MAX_UPLOAD_SIZE_MB?: string;
};

const runtime = env as unknown as PortraitRuntimeEnv;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ValidatedImage = {
  bytes: Uint8Array;
  mimeType: keyof typeof MIME_EXTENSIONS;
  extension: string;
  width: number | null;
  height: number | null;
};

function jpegDimensions(bytes: Uint8Array) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
      };
    }
    offset += 2 + Math.max(length, 2);
  }
  return { width: null, height: null };
}

function dimensions(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/png" && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mimeType === "image/jpeg") return jpegDimensions(bytes);
  return { width: null, height: null };
}

function signatureMatches(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (mimeType === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

export async function validateImageFile(file: File): Promise<ValidatedImage> {
  if (!(file.type in MIME_EXTENSIONS)) {
    throw new Error("仅支持 JPG、PNG 或 WebP 图片；SVG 和脚本文件不能上传。");
  }
  const maxBytes =
    Number(runtime.MAX_UPLOAD_SIZE_MB ?? "15") * 1024 * 1024;
  if (file.size === 0) throw new Error("图片文件为空，请重新选择。");
  if (file.size > maxBytes) {
    throw new Error(`图片超过 ${Math.round(maxBytes / 1024 / 1024)}MB 限制。`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatureMatches(bytes, file.type)) {
    throw new Error("图片内容与文件格式不一致，文件可能已损坏。");
  }
  const size = dimensions(bytes, file.type);
  if (size.width && size.height && Math.min(size.width, size.height) < 480) {
    throw new Error("图片分辨率过低；短边至少需要 480px。");
  }
  return {
    bytes,
    mimeType: file.type as keyof typeof MIME_EXTENSIONS,
    extension: MIME_EXTENSIONS[file.type],
    ...size,
  };
}

export function getAssetBucket() {
  if (!runtime.PORTRAIT_ASSETS) {
    throw new Error("私有图片存储尚未绑定，请检查 PORTRAIT_ASSETS 配置。");
  }
  return runtime.PORTRAIT_ASSETS;
}

export async function putPrivateObject(
  orderId: string,
  kind: string,
  data: Uint8Array,
  mimeType: string,
) {
  const extension = MIME_EXTENSIONS[mimeType] ?? "bin";
  const key = `portrait/${orderId}/${kind}/${crypto.randomUUID()}.${extension}`;
  await getAssetBucket().put(key, data, {
    httpMetadata: { contentType: mimeType },
    customMetadata: { orderId, kind, private: "true" },
  });
  return key;
}

export async function readPrivateObject(storageKey: string) {
  if (!storageKey.startsWith("portrait/") || storageKey.includes("..")) {
    throw new Error("无效的私有资产路径。");
  }
  return getAssetBucket().get(storageKey);
}

export async function deletePrivateObject(storageKey: string) {
  if (!storageKey.startsWith("portrait/") || storageKey.includes("..")) {
    throw new Error("无效的私有资产路径。");
  }
  await getAssetBucket().delete(storageKey);
}

async function hmac(value: string) {
  const secret = runtime.ASSET_SIGNING_SECRET ?? "catv-local-signed-url-key";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const result = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(result))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSignedAssetPath(
  assetId: string,
  expiresInSeconds = 900,
) {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signature = await hmac(`${assetId}:${expires}`);
  return `/api/portrait/assets/${encodeURIComponent(assetId)}?expires=${expires}&signature=${signature}`;
}

export async function verifySignedAssetPath(
  assetId: string,
  expires: string | null,
  signature: string | null,
) {
  if (!expires || !signature || Number(expires) < Date.now() / 1000) return false;
  const expected = await hmac(`${assetId}:${expires}`);
  if (expected.length !== signature.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return difference === 0;
}

