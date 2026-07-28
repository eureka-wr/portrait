import { describe, expect, it } from "vitest";
import {
  assertOrderTransition,
  canTransitionOrder,
} from "../src/modules/portrait/domain/state-machine";
import { MockPortraitProvider } from "../src/modules/portrait/providers/mock";

const providerInput = {
  orderId: "order-test",
  source: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
  sourceMimeType: "image/jpeg",
  positivePrompt: "Identity first.",
  negativePrompt: "Do not change identity.",
  count: 4,
  outputWidth: 1024,
  outputHeight: 1536,
  metadata: {
    portraitDNAId: "style_quiet_executive",
    portraitDNAVersion: "1.0",
    compiledPromptId: "prompt-test",
  },
};

describe("order state machine", () => {
  it("accepts the production happy path", () => {
    expect(canTransitionOrder("ready_to_generate", "generating")).toBe(true);
    expect(
      canTransitionOrder("generating", "awaiting_internal_review"),
    ).toBe(true);
    expect(canTransitionOrder("preview_ready", "awaiting_customer_selection")).toBe(
      true,
    );
    expect(canTransitionOrder("customer_selected", "ready_to_deliver")).toBe(
      true,
    );
    expect(canTransitionOrder("ready_to_deliver", "completed")).toBe(true);
  });

  it("rejects illegal jumps and completed-order mutation", () => {
    expect(() =>
      assertOrderTransition("draft", "completed"),
    ).toThrow(/不允许/);
    expect(() =>
      assertOrderTransition("completed", "generating"),
    ).toThrow(/不允许/);
  });
});

describe("Mock Portrait Provider", () => {
  it("returns four traceable candidates", async () => {
    const provider = new MockPortraitProvider();
    const results = await provider.generate(providerInput);
    expect(results).toHaveLength(4);
    expect(results.every((result) => result.providerName === "mock")).toBe(true);
  });

  it("supports partial success", async () => {
    const provider = new MockPortraitProvider();
    const results = await provider.generate({
      ...providerInput,
      debugScenario: "partial",
    });
    expect(results).toHaveLength(2);
  });

  it("surfaces a helpful timeout", async () => {
    const provider = new MockPortraitProvider();
    await expect(
      provider.generate({ ...providerInput, debugScenario: "timeout" }),
    ).rejects.toThrow(/120 秒/);
  });
});
