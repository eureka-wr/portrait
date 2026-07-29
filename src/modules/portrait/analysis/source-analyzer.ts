export type SubjectAnalysis = {
  faceDetected: boolean;
  primaryFaceCount: number;
  imageWidth: number;
  imageHeight: number;
  faceSharpness?: number;
  exposureQuality?: number;
  faceSizeRatio?: number;
  obstructionDetected?: boolean;
  glassesDetected?: boolean;
  heavyBeautyFilterSuspected?: boolean;
  // This analyzer is intentionally technical-only. It must never infer
  // personality, profession, income, class, attractiveness, health, politics,
  // religion or any other sensitive attribute.
  warnings: string[];
};

export interface SourceImageAnalyzer {
  analyze(input: {
    bytes: Uint8Array;
    mimeType: string;
    width: number;
    height: number;
  }): Promise<SubjectAnalysis>;
}

export class MockSourceImageAnalyzer implements SourceImageAnalyzer {
  async analyze(input: {
    bytes: Uint8Array;
    mimeType: string;
    width: number;
    height: number;
  }): Promise<SubjectAnalysis> {
    return {
      faceDetected: true,
      primaryFaceCount: 1,
      imageWidth: input.width,
      imageHeight: input.height,
      faceSharpness: 0.82,
      exposureQuality: 0.86,
      warnings: [
        "Mock Analyzer 只完成尺寸、清晰度、曝光、单人脸和遮挡等技术占位检查；不分析职业、性格或敏感属性。",
      ],
    };
  }
}
