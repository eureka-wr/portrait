import type { PortraitQualityScore } from "../domain/types";

export type { PortraitQualityScore } from "../domain/types";

export interface PortraitQualityJudge {
  evaluate(input: {
    sourceAssetId: string;
    candidateAssetId: string;
  }): Promise<PortraitQualityScore>;
}

export class MockQualityJudge implements PortraitQualityJudge {
  async evaluate(input: {
    sourceAssetId: string;
    candidateAssetId: string;
  }): Promise<PortraitQualityScore> {
    void input;
    return {
      identitySimilarity: 92,
      poseNormalization: 90,
      faceFrontality: 93,
      shoulderBalance: 89,
      gazeStability: 91,
      gazeConfidence: 90,
      eyeNaturalness: 94,
      expressionNaturalness: 90,
      presenceScore: 89,
      groundedness: 90,
      credibility: 92,
      visualAuthority: 86,
      professionalWeight: 88,
      hairVolumeRealism: 91,
      hairlinePreservation: 98,
      hairTextureRealism: 92,
      skinRealism: 93,
      wardrobeIntegrity: 94,
      backgroundQuality: 92,
      photographicRealism: 93,
      careerSuitability: 94,
      overallScore: 92,
      hardFailures: [],
      warnings: ["自动分数仅作排序辅助，不能替代人工交付审核。"],
    };
  }
}
