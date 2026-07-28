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
  hairLengthCategory?: "short" | "medium" | "long" | "unknown";
  currentWardrobeCategory?: string;
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
      hairLengthCategory: "unknown",
      warnings: [
        "Mock Analyzer 只完成技术占位检查；必须由运营人员确认单人、清晰与无遮挡。",
      ],
    };
  }
}

