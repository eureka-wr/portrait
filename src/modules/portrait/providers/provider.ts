import { env } from "cloudflare:workers";
import { MockPortraitProvider } from "./mock";

export type GeneratePortraitInput = {
  orderId: string;
  source: Uint8Array;
  sourceMimeType: string;
  positivePrompt: string;
  negativePrompt: string;
  count: number;
  outputWidth: number;
  outputHeight: number;
  metadata: {
    portraitDNAId: string;
    portraitDNAVersion: string;
    compiledPromptId: string;
  };
  debugScenario?: string;
};

export type GeneratedPortraitResult = {
  bytes: Uint8Array;
  mimeType: string;
  providerName: string;
  providerModel: string;
  seed?: number;
};

export interface PortraitProvider {
  readonly providerName: string;
  generate(input: GeneratePortraitInput): Promise<GeneratedPortraitResult[]>;
  healthCheck?(): Promise<{ ok: boolean; message: string }>;
}

type OpenAIRuntimeEnv = {
  PORTRAIT_PROVIDER_API_KEY?: string;
  PORTRAIT_PROVIDER_BASE_URL?: string;
  PORTRAIT_PROVIDER_MODEL?: string;
  PORTRAIT_PROVIDER_TIMEOUT_MS?: string;
  PORTRAIT_PROVIDER_MAX_RETRIES?: string;
};

const runtime = env as unknown as OpenAIRuntimeEnv;

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export class OpenAIImageProvider implements PortraitProvider {
  readonly providerName = "openai_image_api";

  async generate(input: GeneratePortraitInput) {
    if (!runtime.PORTRAIT_PROVIDER_API_KEY) {
      throw new Error("OpenAI 图像 Provider 未配置 API Key，已停止真实调用。");
    }
    const model = runtime.PORTRAIT_PROVIDER_MODEL || "gpt-image-2";
    const baseUrl =
      runtime.PORTRAIT_PROVIDER_BASE_URL || "https://api.openai.com/v1";
    const timeout = Number(runtime.PORTRAIT_PROVIDER_TIMEOUT_MS || "120000");
    const maxRetries = Number(runtime.PORTRAIT_PROVIDER_MAX_RETRIES || "2");
    let lastError = "未知错误";

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const form = new FormData();
        form.append(
          "image",
          new Blob(
            [
              input.source.buffer.slice(
                input.source.byteOffset,
                input.source.byteOffset + input.source.byteLength,
              ) as ArrayBuffer,
            ],
            { type: input.sourceMimeType },
          ),
          `source.${input.sourceMimeType.split("/")[1] || "png"}`,
        );
        form.append("model", model);
        form.append(
          "prompt",
          `${input.positivePrompt}\n\nNEGATIVE RULES:\n${input.negativePrompt}`,
        );
        form.append("n", String(input.count));
        form.append("size", "1024x1536");
        form.append("quality", "high");
        form.append("input_fidelity", "high");
        form.append("output_format", "jpeg");

        const response = await fetch(`${baseUrl}/images/edits`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${runtime.PORTRAIT_PROVIDER_API_KEY}`,
          },
          body: form,
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(
            body?.error?.message || `Provider 返回 HTTP ${response.status}`,
          );
        }
        const result = (await response.json()) as {
          data?: Array<{ b64_json?: string }>;
        };
        const images = (result.data ?? [])
          .filter((item) => item.b64_json)
          .map((item) => ({
            bytes: decodeBase64(item.b64_json as string),
            mimeType: "image/jpeg",
            providerName: this.providerName,
            providerModel: model,
          }));
        if (images.length === 0) {
          throw new Error("Provider 未返回有效图片。");
        }
        return images;
      } catch (error) {
        lastError =
          error instanceof Error && error.name === "AbortError"
            ? "Provider 调用超时"
            : error instanceof Error
              ? error.message
              : "Provider 调用失败";
        if (attempt === maxRetries) break;
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`${lastError}。已达到有限重试上限。`);
  }

  async healthCheck() {
    return runtime.PORTRAIT_PROVIDER_API_KEY
      ? { ok: true, message: "OpenAI Image API 已配置" }
      : { ok: false, message: "未配置 API Key，将回退 Mock / Manual" };
  }
}

export class ManualUploadProvider implements PortraitProvider {
  readonly providerName = "manual_external";

  async generate(): Promise<GeneratedPortraitResult[]> {
    throw new Error("Manual Upload Provider 需要运营人员上传外部生成结果。");
  }
}

export function getPortraitProvider(preference?: string): PortraitProvider {
  if (
    preference === "openai" ||
    (preference !== "mock" && runtime.PORTRAIT_PROVIDER_API_KEY)
  ) {
    return new OpenAIImageProvider();
  }
  return new MockPortraitProvider();
}

export { MockPortraitProvider } from "./mock";
