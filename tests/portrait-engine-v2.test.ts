import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MockSourceImageAnalyzer } from "../src/modules/portrait/analysis/source-analyzer";
import { MockQualityJudge } from "../src/modules/portrait/quality/quality-judge";

describe("Portrait Engine v2 safety and quality contracts", () => {
  it("keeps source analysis technical-only", async () => {
    const analyzer = new MockSourceImageAnalyzer();
    const result = await analyzer.analyze({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "image/jpeg",
      width: 1200,
      height: 1600,
    });
    expect(result).not.toHaveProperty("currentWardrobeCategory");
    expect(result).not.toHaveProperty("profession");
    expect(result).not.toHaveProperty("personality");
    expect(result.warnings.join(" ")).toContain("不分析职业、性格或敏感属性");
  });

  it("returns the expanded mock quality score", async () => {
    const score = await new MockQualityJudge().evaluate({
      sourceAssetId: "source",
      candidateAssetId: "candidate",
    });
    expect(score.poseNormalization).toBeDefined();
    expect(score.gazeStability).toBeDefined();
    expect(score.presenceScore).toBeDefined();
    expect(score.hairVolumeRealism).toBeDefined();
    expect(score.hairlinePreservation).toBeDefined();
    expect(score.hardFailures).toEqual([]);
  });

  it("exposes v2 review groups and complete rejection signals in admin", () => {
    const source = readFileSync(
      new URL(
        "../src/modules/portrait/ui/PortraitStudioApp.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    for (const token of [
      "face_nearly_frontal",
      "direct_eye_contact",
      "professionally_substantial",
      "hairline_preserved",
      "pose_inherited_from_source",
      "passport_photo_composition",
      "weak_presence",
      "wig_like_hair",
    ]) {
      expect(source).toContain(token);
    }
  });
});
