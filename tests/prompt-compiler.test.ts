import { describe, expect, it } from "vitest";
import {
  IDENTITY_PRESERVATION,
  PORTRAIT_STYLES,
} from "../src/modules/portrait/domain/catalog";
import { compilePrompt } from "../src/modules/portrait/prompts/compiler";

describe("Prompt Compiler", () => {
  it("always places Identity Preservation first", async () => {
    const result = await compilePrompt({
      portraitDNAId: "style_quiet_executive",
      portraitDNAVersion: "1.0",
      sourceContext: "One clear primary face.",
    });
    expect(result.positivePrompt.startsWith("[01 · IDENTITY PRESERVATION]")).toBe(
      true,
    );
    expect(result.positivePrompt.indexOf(IDENTITY_PRESERVATION)).toBeLessThan(
      result.positivePrompt.indexOf("SOURCE IMAGE CONTEXT"),
    );
  });

  it("uses the fixed module order", async () => {
    const result = await compilePrompt({
      portraitDNAId: "style_global_professional",
      portraitDNAVersion: "1.0",
    });
    const career = result.positivePrompt.indexOf("CAREER IDENTITY");
    const composition = result.positivePrompt.indexOf("COMPOSITION");
    const lighting = result.positivePrompt.indexOf("LIGHTING");
    const retouch = result.positivePrompt.indexOf("RETOUCH");
    expect(career).toBeGreaterThan(0);
    expect(career).toBeLessThan(composition);
    expect(composition).toBeLessThan(lighting);
    expect(lighting).toBeLessThan(retouch);
  });

  it("stores module versions and produces a stable checksum", async () => {
    const input = {
      portraitDNAId: "style_boardroom_leadership",
      portraitDNAVersion: "1.0",
      operatorPreferences: "Keep the expression restrained.",
    };
    const first = await compilePrompt(input);
    const second = await compilePrompt(input);
    expect(first.checksum).toHaveLength(64);
    expect(first.checksum).toBe(second.checksum);
    expect(Object.keys(first.moduleVersions).length).toBeGreaterThan(12);
    expect(first.compilerVersion).toBe("1.0.0");
  });

  it("different DNA versions compile different prompts", async () => {
    const quiet = await compilePrompt({
      portraitDNAId: "style_quiet_executive",
      portraitDNAVersion: "1.0",
    });
    const founder = await compilePrompt({
      portraitDNAId: "style_founder_studio",
      portraitDNAVersion: "1.0",
    });
    expect(quiet.checksum).not.toBe(founder.checksum);
    expect(quiet.positivePrompt).not.toBe(founder.positivePrompt);
  });

  it("adds refinement as a scoped final instruction", async () => {
    const result = await compilePrompt({
      portraitDNAId: "style_founder_studio",
      portraitDNAVersion: "1.0",
      refinementRequest: "Relax shoulders slightly.",
    });
    expect(result.positivePrompt).toContain(
      "Preserve the exact identity and all unrequested visual elements",
    );
    expect(result.positivePrompt).toContain("Relax shoulders slightly.");
  });

  it("ships exactly four active Signature styles", () => {
    expect(PORTRAIT_STYLES).toHaveLength(4);
    expect(PORTRAIT_STYLES.every((style) => style.status === "active")).toBe(
      true,
    );
    expect(
      PORTRAIT_STYLES.every(
        (style) =>
          style.modules.identity &&
          style.modules.negative &&
          Object.keys(style.modules).length >= 16,
      ),
    ).toBe(true);
  });
});

