import {
  COMPILER_VERSION_V1,
  COMPILER_VERSION_V2,
  PORTRAIT_STYLE_VERSIONS,
  PROMPT_ORDER_V1,
  PROMPT_ORDER_V2,
} from "../domain/catalog";
import type {
  CompiledPrompt,
  PortraitStyle,
  PromptModuleCategory,
} from "../domain/types";

export type PromptCompilationInput = {
  portraitDNAId: string;
  portraitDNAVersion: string;
  sourceContext?: string;
  operatorPreferences?: string;
  refinementRequest?: string;
  outputSpecification?: string;
};

function stableParameters(value?: Record<string, unknown>) {
  if (!value) return "";
  const sorted = Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  );
  return `\nParameters: ${JSON.stringify(sorted)}`;
}

function stableText(
  style: PortraitStyle,
  input: PromptCompilationInput,
  moduleOrder: PromptModuleCategory[],
) {
  const sections: string[] = [];
  for (const category of moduleOrder) {
    if (category === "negative") continue;
    const value = style.modules[category];
    if (value) {
      const position = String(moduleOrder.indexOf(category) + 1).padStart(2, "0");
      const sourceContext =
        category === "source_interpretation" && input.sourceContext
          ? `\n\nTechnical source note (identity reference only): ${input.sourceContext}`
          : category === "identity" &&
              !style.modules.source_interpretation &&
              input.sourceContext
            ? `\n\nSource image context: ${input.sourceContext}`
            : "";
      sections.push(
        `[${position} · ${category.toUpperCase().replaceAll("_", " ")}]${stableParameters(style.parameters?.[category])}\n${value}${sourceContext}`,
      );
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
  if (input.outputSpecification) {
    sections.push(`[OUTPUT OVERRIDE]\n${input.outputSpecification}`);
  }
  return sections.join("\n\n");
}

function stableTextV1(style: PortraitStyle, input: PromptCompilationInput) {
  const sections: string[] = [];
  for (const category of PROMPT_ORDER_V1) {
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
      sections.push(
        `[${position} · ${category.toUpperCase().replaceAll("_", " ")}]\n${value}`,
      );
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
    `[OUTPUT SPECIFICATION]\n${
      input.outputSpecification ??
      "Portrait orientation, high-resolution master, realistic commercial photography, no text, no logo, no border."
    }`,
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
  styleOverride?: PortraitStyle,
): Promise<CompiledPrompt> {
  const style =
    styleOverride ??
    PORTRAIT_STYLE_VERSIONS.find(
      (item) =>
        item.id === input.portraitDNAId &&
        item.version === input.portraitDNAVersion,
    );
  if (
    styleOverride &&
    (styleOverride.id !== input.portraitDNAId ||
      styleOverride.version !== input.portraitDNAVersion)
  ) {
    throw new Error("持久化 Portrait DNA 与编译请求版本不一致。");
  }
  if (!style || ["draft", "testing"].includes(style.status)) {
    throw new Error("Portrait DNA 版本不存在或不可用于生产。");
  }

  const isV2 = style.engineVersion === "2.0";
  const moduleOrder = isV2 ? PROMPT_ORDER_V2 : PROMPT_ORDER_V1;
  const compilerVersion = isV2
    ? COMPILER_VERSION_V2
    : COMPILER_VERSION_V1;
  const positivePrompt = isV2
    ? stableText(style, input, moduleOrder)
    : stableTextV1(style, input);
  const negativePrompt = style.modules.negative ?? "";
  const versionCategories = isV2
    ? moduleOrder.filter((category) => Boolean(style.modules[category]))
    : (Object.keys(style.modules) as PromptModuleCategory[]);
  const moduleVersions = Object.fromEntries(
    versionCategories.map((category) => [
      category,
      `${style.slug}/${category}@${style.version}`,
    ]),
  );
  const traceable = JSON.stringify(
    isV2
      ? {
          positivePrompt,
          negativePrompt,
          moduleVersions,
          moduleOrder,
          portraitDNAId: style.id,
          portraitDNAVersion: style.version,
          engineVersion: style.engineVersion,
          compilerVersion,
        }
      : {
          positivePrompt,
          negativePrompt,
          moduleVersions,
          portraitDNAId: style.id,
          portraitDNAVersion: style.version,
          compilerVersion,
        },
  );

  return {
    id: crypto.randomUUID(),
    positivePrompt,
    negativePrompt,
    moduleVersions,
    moduleOrder,
    portraitDNAId: style.id,
    portraitDNAVersion: style.version,
    engineVersion: style.engineVersion,
    compilerVersion,
    checksum: await sha256(traceable),
    createdAt: new Date().toISOString(),
  };
}
