import { describe, expect, it } from "vitest";
import {
  IDENTITY_PRESERVATION_V2,
  PORTRAIT_STYLES,
  PORTRAIT_STYLES_V1,
  PORTRAIT_STYLE_VERSIONS,
  PROMPT_ORDER_V2,
  getStyle,
  getStyleVersion,
} from "../src/modules/portrait/domain/catalog";
import { compilePrompt } from "../src/modules/portrait/prompts/compiler";

describe("CATV Portrait Engine v2 Prompt Compiler", () => {
  it("compiles the exact 20-module v2 order", async () => {
    const result = await compilePrompt({
      portraitDNAId: "style_quiet_executive",
      portraitDNAVersion: "2.0",
      sourceContext: "Technical image validation passed.",
    });

    expect(result.moduleOrder).toEqual(PROMPT_ORDER_V2);
    expect(result.moduleOrder).toHaveLength(20);
    expect(result.moduleOrder[0]).toBe("identity");
    expect(result.moduleOrder.at(-1)).toBe("negative");
    expect(result.moduleOrder).toContain("source_interpretation");
    expect(result.moduleOrder).toContain("presence");
    expect(result.moduleOrder).toContain("hair_grooming");
    expect(result.positivePrompt.startsWith("[01 · IDENTITY]")).toBe(true);
    expect(result.positivePrompt).toContain(IDENTITY_PRESERVATION_V2);
    expect(result.compilerVersion).toBe("2.0.0");
    expect(result.engineVersion).toBe("2.0");
  });

  it("keeps source interpretation identity-only and normalizes pose", async () => {
    const result = await compilePrompt({
      portraitDNAId: "style_global_professional",
      portraitDNAVersion: "2.0",
    });
    expect(result.positivePrompt).toContain(
      "Use the reference image only as an identity source",
    );
    expect(result.positivePrompt).toContain(
      "Ignore the pose and camera angle of the reference image",
    );
    expect(result.positivePrompt).toContain(
      "Position the torso approximately 15 degrees",
    );
    expect(result.positivePrompt).toContain(
      "Return the head naturally toward the camera",
    );
    expect(result.positivePrompt).toContain("camera at eye level");
    expect(result.positivePrompt).toContain(
      "chin slightly forward and slightly down",
    );
    expect(result.positivePrompt).toContain(
      "shoulders relaxed, balanced and naturally open",
    );
  });

  it("enforces gaze, presence and hair standards", async () => {
    const result = await compilePrompt({
      portraitDNAId: "style_founder_studio",
      portraitDNAVersion: "2.0",
    });
    expect(result.positivePrompt).toContain("timid");
    expect(result.positivePrompt).toContain("fragile");
    expect(result.positivePrompt).toContain("overly soft");
    expect(result.positivePrompt).toContain("Avoid aggression");
    expect(result.positivePrompt).toContain(
      "Preserve the subject's natural eye shape",
    );
    expect(result.positivePrompt).toContain("Do not enlarge");
    expect(result.positivePrompt).toContain(
      "strong but natural sense of professional presence",
    );
    expect(result.positivePrompt).toContain("agency");
    expect(result.positivePrompt).toContain("hairline, hair length and hair color");
    expect(result.positivePrompt).toContain("gentle lift at the roots");
    expect(result.positivePrompt).toContain("wig texture");
  });

  it("stores module versions and produces a stable checksum", async () => {
    const input = {
      portraitDNAId: "style_boardroom_leadership",
      portraitDNAVersion: "2.0",
      operatorPreferences: "Keep the expression restrained.",
    };
    const first = await compilePrompt(input);
    const second = await compilePrompt(input);
    expect(first.checksum).toHaveLength(64);
    expect(first.checksum).toBe(second.checksum);
    expect(Object.keys(first.moduleVersions)).toHaveLength(20);
  });

  it("keeps v1 immutable and readable while defaulting new orders to v2", async () => {
    const legacy = await compilePrompt({
      portraitDNAId: "style_quiet_executive",
      portraitDNAVersion: "1.0",
    });
    const current = await compilePrompt({
      portraitDNAId: "style_quiet_executive",
      portraitDNAVersion: "2.0",
    });

    expect(legacy.compilerVersion).toBe("1.0.0");
    expect(legacy.engineVersion).toBe("1.0");
    expect(legacy.checksum).not.toBe(current.checksum);
    expect(getStyleVersion("style_quiet_executive", "1.0").status).toBe(
      "retired",
    );
    expect(getStyle("style_quiet_executive").version).toBe("2.0");
  });

  it("ships four active v2 DNA profiles and retains all v1 profiles", () => {
    expect(PORTRAIT_STYLES).toHaveLength(4);
    expect(PORTRAIT_STYLES_V1).toHaveLength(4);
    expect(PORTRAIT_STYLE_VERSIONS).toHaveLength(8);
    expect(
      PORTRAIT_STYLES.every(
        (style) =>
          style.status === "active" &&
          style.version === "2.0" &&
          Object.keys(style.modules).length === 20,
      ),
    ).toBe(true);
  });

  it("uses distinct presence parameter profiles per DNA", () => {
    const presence = Object.fromEntries(
      PORTRAIT_STYLES.map((style) => [
        style.id,
        style.parameters?.presence ?? {},
      ]),
    );
    expect(presence.style_quiet_executive).not.toEqual(
      presence.style_boardroom_leadership,
    );
    expect(presence.style_founder_studio).toMatchObject({ agency: 90 });
    expect(presence.style_global_professional).toMatchObject({
      openness: 88,
      credibility: 92,
    });
  });

  it("adds refinement as a scoped instruction without changing module order", async () => {
    const result = await compilePrompt({
      portraitDNAId: "style_founder_studio",
      portraitDNAVersion: "2.0",
      refinementRequest: "Relax shoulders slightly.",
    });
    expect(result.positivePrompt).toContain(
      "Preserve the exact identity and all unrequested visual elements",
    );
    expect(result.positivePrompt).toContain("Relax shoulders slightly.");
    expect(result.moduleOrder).toEqual(PROMPT_ORDER_V2);
  });

  it("compiles a persisted active v2.x DNA without changing old versions", async () => {
    const template = PORTRAIT_STYLES[0];
    const persisted = {
      ...template,
      version: "2.1",
      status: "active" as const,
    };
    const result = await compilePrompt(
      {
        portraitDNAId: persisted.id,
        portraitDNAVersion: persisted.version,
      },
      persisted,
    );
    expect(result.portraitDNAVersion).toBe("2.1");
    expect(result.compilerVersion).toBe("2.0.0");
    expect(result.moduleOrder).toEqual(PROMPT_ORDER_V2);
    expect(getStyleVersion(template.id, "2.0").version).toBe("2.0");
  });
});
