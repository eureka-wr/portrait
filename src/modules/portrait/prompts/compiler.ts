import {
  COMPILER_VERSION,
  PORTRAIT_STYLES,
  PROMPT_ORDER,
} from "../domain/catalog";
import type { CompiledPrompt, PortraitStyle } from "../domain/types";

export type PromptCompilationInput = {
  portraitDNAId: string;
  portraitDNAVersion: string;
  sourceContext?: string;
  operatorPreferences?: string;
  refinementRequest?: string;
  outputSpecification?: string;
};

function stableText(style: PortraitStyle, input: PromptCompilationInput) {
  const sections: string[] = [];
  for (const category of PROMPT_ORDER) {
    if (category === "negative") continue;
    if (category === "identity") {
      sections.push(`[01 · IDENTITY PRESERVATION]\n${style.modules.identity}`);
      if (input.sourceContext) {
        sections.push(`[02 · SOURCE IMAGE CONTEXT]\n${input.sourceContext}`);
      }
      continue;
    }
    const value = style.modules[category];
    if (value) {
      const position = String(sections.length + 1).padStart(2, "0");
      sections.push(`[${position} · ${category.toUpperCase().replaceAll("_", " ")}]\n${value}`);
    }
  }
  if (input.operatorPreferences) {
    sections.push(`[OPERATOR PREFERENCES]\n${input.operatorPreferences}`);
  }
  if (input.refinementRequest) {
    sections.push(
      `[REFINEMENT — CHANGE ONLY THIS]\nPreserve the exact identity and all unrequested visual elements. Modify only the specifically requested attributes. Do not reinterpret the entire portrait.\n${input.refinementRequest}`,
    );
  }
  sections.push(
    `[OUTPUT SPECIFICATION]\n${input.outputSpecification ?? "Portrait orientation, high-resolution master, realistic commercial photography, no text, no logo, no border."}`,
  );
  return sections.join("\n\n");
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function compilePrompt(
  input: PromptCompilationInput,
): Promise<CompiledPrompt> {
  const style = PORTRAIT_STYLES.find(
    (item) =>
      item.id === input.portraitDNAId &&
      item.version === input.portraitDNAVersion,
  );
  if (!style || style.status !== "active") {
    throw new Error("Portrait DNA 版本不可用于生产。");
  }

  const positivePrompt = stableText(style, input);
  const negativePrompt = style.modules.negative ?? "";
  const moduleVersions = Object.fromEntries(
    Object.keys(style.modules).map((category) => [
      category,
      `${style.slug}/${category}@${style.version}`,
    ]),
  );
  const traceable = JSON.stringify({
    positivePrompt,
    negativePrompt,
    moduleVersions,
    portraitDNAId: style.id,
    portraitDNAVersion: style.version,
    compilerVersion: COMPILER_VERSION,
  });

  return {
    id: crypto.randomUUID(),
    positivePrompt,
    negativePrompt,
    moduleVersions,
    portraitDNAId: style.id,
    portraitDNAVersion: style.version,
    compilerVersion: COMPILER_VERSION,
    checksum: await sha256(traceable),
    createdAt: new Date().toISOString(),
  };
}

