import type {
  GeneratePortraitInput,
  GeneratedPortraitResult,
  PortraitProvider,
} from "./provider";

export class MockPortraitProvider implements PortraitProvider {
  readonly providerName = "mock";

  async generate(input: GeneratePortraitInput) {
    if (input.debugScenario === "timeout") {
      throw new Error("图像模型在 120 秒内未响应。本次任务已停止，可安全重试。");
    }
    if (input.debugScenario === "batch_failure") {
      throw new Error("模拟 Provider 整批失败。未产生费用，可重新运行任务。");
    }
    const count =
      input.debugScenario === "partial" ? Math.min(2, input.count) : input.count;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return Array.from({ length: count }, (_, index) => ({
      bytes: input.source.slice(),
      mimeType: input.sourceMimeType,
      providerName: this.providerName,
      providerModel: "portrait-mock-1.0",
      seed: 4100 + index,
    })) satisfies GeneratedPortraitResult[];
  }

  async healthCheck() {
    return { ok: true, message: "Mock Provider 可用" };
  }
}

