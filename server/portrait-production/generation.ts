import { createHash } from "node:crypto";
import { strToU8, zipSync } from "fflate";
import sharp from "sharp";
import { HttpError } from "./auth.js";
import {
  candidateAssetPath,
  deliveryAssetPath,
  putPrivate,
  readPrivateBytes,
} from "./store.js";
import type {
  PortraitCandidate,
  PortraitJob,
} from "./types.js";

const VARIANTS = [
  {
    id: "quiet-leader",
    label: "静默领导者",
    description: "灰蓝极简 · 克制自信 · 科技管理层",
    direction:
      "A quiet-leadership executive portrait. Cool pale gray-blue seamless studio background, soft directional key light, subtle fill, charcoal minimal business clothing, restrained and intelligent presence.",
  },
  {
    id: "global-professional",
    label: "国际职业形象",
    description: "明亮中性 · 可信亲和 · 国际化简历",
    direction:
      "An international professional portrait for a global company profile. Bright neutral light-gray studio background, clean softbox lighting, navy modern business clothing, open and trustworthy expression.",
  },
  {
    id: "executive-presence",
    label: "高管领导力",
    description: "温润棚拍 · 稳定权威 · 高管质感",
    direction:
      "A premium senior-executive portrait. Warm neutral studio background, sculpted but natural Rembrandt-inspired light, sophisticated dark business attire, calm authority without exaggeration.",
  },
  {
    id: "founder-studio",
    label: "创业者工作室",
    description: "现代空间 · 自然松弛 · 创始人气质",
    direction:
      "A contemporary founder portrait in a minimal creative studio. Soft daylight, subtle architectural blur, elevated smart-casual clothing, relaxed confidence and modern entrepreneurial energy.",
  },
] as const;

function providerModel() {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1.5";
}

export function providerConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function buildPrompt(direction: string, notes: string) {
  return [
    "IDENTITY PRESERVATION — NON-NEGOTIABLE.",
    "Edit the supplied reference photograph into a photorealistic professional headshot of the exact same real person.",
    "Preserve exact facial identity, facial geometry, apparent age, ethnicity, skin tone, eye shape, nose, mouth, jawline, hairline, and all distinctive natural characteristics.",
    "Do not beautify into a different person. Do not change body type. Keep realistic skin texture, pores, fine lines, and natural asymmetry. No plastic skin and no AI-looking artifacts.",
    "Frame from upper torso to head in a vertical 4:5 professional composition. Eyes sharp, natural camera optics, accurate anatomy, realistic hair, realistic ears and hands if visible.",
    direction,
    notes ? `Operator brief: ${notes}` : "",
    "No text, no logos, no watermark, no border, no collage, no duplicate person.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function callImageEdit(source: Buffer, prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new HttpError(503, "OpenAI API Key 尚未配置，暂时不能生成照片。");
  }

  let lastError = "图像模型调用失败。";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const form = new FormData();
    form.set("model", providerModel());
    form.set("prompt", prompt);
    form.set(
      "image",
      new Blob([Uint8Array.from(source).buffer], { type: "image/jpeg" }),
      "reference.jpg",
    );
    form.set("size", "1024x1536");
    form.set("quality", "high");
    form.set("output_format", "jpeg");
    form.set("output_compression", "92");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
      signal: AbortSignal.timeout(240_000),
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        data?: Array<{ b64_json?: string; url?: string }>;
      };
      const result = payload.data?.[0];
      if (result?.b64_json) {
        return Buffer.from(result.b64_json, "base64");
      }
      if (result?.url) {
        const remote = await fetch(result.url);
        if (remote.ok) {
          return Buffer.from(await remote.arrayBuffer());
        }
      }
      throw new Error("模型返回中没有可用的图像。");
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    lastError = payload?.error?.message || `OpenAI HTTP ${response.status}`;
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 1) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_200 * (attempt + 1)));
  }

  console.error("OpenAI image edit failed:", lastError);
  throw new Error("模型未能完成本次照片生成，请稍后重试。");
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
  return results;
}

export async function generateFourCandidates(job: PortraitJob) {
  const source = await readPrivateBytes(job.source.pathname);
  const prompts = VARIANTS.map((variant) =>
    buildPrompt(variant.direction, job.notes),
  );
  const promptHash = createHash("sha256")
    .update(prompts.join("\n---\n"))
    .digest("hex");

  const candidates = await mapWithConcurrency(
    VARIANTS,
    2,
    async (variant, index): Promise<PortraitCandidate> => {
      const bytes = await callImageEdit(source, prompts[index]);
      const candidate: PortraitCandidate = {
        id: variant.id,
        label: variant.label,
        description: variant.description,
        pathname: "",
        mimeType: "image/jpeg",
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      candidate.pathname = await putPrivate(
        candidateAssetPath(job.id, candidate),
        bytes,
        candidate.mimeType,
      );
      return candidate;
    },
  );

  return {
    candidates,
    model: providerModel(),
    promptHash,
  };
}

export async function createDeliveryPackage(job: PortraitJob) {
  const selected = job.candidates.find(
    (candidate) => candidate.id === job.selectedCandidateId,
  );
  if (!selected) {
    throw new HttpError(409, "请先确定一张最终照片。");
  }

  const source = await readPrivateBytes(selected.pathname);
  const image = sharp(source).rotate();
  const [jpg, png, square, portrait, resume, web] = await Promise.all([
    image.clone().jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toBuffer(),
    image.clone().png({ compressionLevel: 8 }).toBuffer(),
    image
      .clone()
      .resize(1024, 1024, { fit: "cover", position: "attention" })
      .jpeg({ quality: 93 })
      .toBuffer(),
    image
      .clone()
      .resize(1024, 1280, { fit: "cover", position: "attention" })
      .jpeg({ quality: 93 })
      .toBuffer(),
    image
      .clone()
      .resize(600, 800, { fit: "cover", position: "attention" })
      .jpeg({ quality: 92 })
      .toBuffer(),
    image
      .clone()
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 86 })
      .toBuffer(),
  ]);

  const readme = [
    "CATV Portrait Studio 交付包",
    `订单：${job.orderNo}`,
    `客户：${job.customerName || "未填写"}`,
    `最终形象：${selected.label}`,
    "",
    "文件说明：",
    "- CATV-HD.jpg：高清 JPG",
    "- CATV-HD.png：高清 PNG",
    "- CATV-1x1.jpg：社交头像 1:1",
    "- CATV-4x5.jpg：职业主页 4:5",
    "- CATV-RESUME.jpg：简历竖版 600×800",
    "- CATV-WEB.jpg：网页压缩版",
  ].join("\n");

  const zip = zipSync(
    {
      "CATV-HD.jpg": jpg,
      "CATV-HD.png": png,
      "CATV-1x1.jpg": square,
      "CATV-4x5.jpg": portrait,
      "CATV-RESUME.jpg": resume,
      "CATV-WEB.jpg": web,
      "README.txt": strToU8(readme),
    },
    { level: 6 },
  );
  const filename = `CATV-${job.orderNo}.zip`;
  const pathname = await putPrivate(
    deliveryAssetPath(job.id),
    Buffer.from(zip),
    "application/zip",
  );

  return {
    pathname,
    createdAt: new Date().toISOString(),
    filename,
  };
}
