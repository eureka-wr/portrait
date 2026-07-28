export type PortraitQualityScore = {
  identitySimilarity?: number;
  faceIntegrity?: number;
  eyeNaturalness?: number;
  expressionNaturalness?: number;
  skinRealism?: number;
  hairRealism?: number;
  wardrobeIntegrity?: number;
  poseNaturalness?: number;
  backgroundQuality?: number;
  photographicRealism?: number;
  careerSuitability?: number;
  overallScore?: number;
  hardFailures: string[];
  warnings: string[];
};

export interface PortraitQualityJudge {
  evaluate(input: {
    sourceAssetId: string;
    candidateAssetId: string;
  }): Promise<PortraitQualityScore>;
}

export class MockQualityJudge implements PortraitQualityJudge {
  async evaluate(): Promise<PortraitQualityScore> {
    return {
      faceIntegrity: 0.9,
      eyeNaturalness: 0.86,
      skinRealism: 0.88,
      photographicRealism: 0.87,
      overallScore: 0.88,
      hardFailures: [],
      warnings: ["自动分数仅作排序辅助，不能替代人工交付审核。"],
    };
  }
}

