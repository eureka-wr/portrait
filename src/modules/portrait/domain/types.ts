export type PortraitAdminRole = "operator" | "admin";

export type PortraitOrderStatus =
  | "draft"
  | "awaiting_source_image"
  | "ready_to_generate"
  | "generating"
  | "awaiting_internal_review"
  | "preview_ready"
  | "preview_sent"
  | "awaiting_customer_selection"
  | "customer_selected"
  | "finalizing"
  | "ready_to_deliver"
  | "completed"
  | "cancelled"
  | "failed";

export type CandidateStatus =
  | "generated"
  | "quality_failed"
  | "awaiting_review"
  | "approved"
  | "rejected"
  | "selected_for_preview"
  | "sent_to_customer"
  | "customer_selected"
  | "finalized"
  | "delivered";

export type PromptModuleCategory =
  | "identity"
  | "source_interpretation"
  | "pose_normalization"
  | "gaze"
  | "expression"
  | "presence"
  | "hair_grooming"
  | "career_identity"
  | "wardrobe"
  | "composition"
  | "camera"
  | "lens"
  | "lighting"
  | "background"
  | "skin"
  | "color"
  | "retouch"
  | "rendering"
  | "output"
  | "negative"
  // v1 categories are retained so historical DNA remains readable.
  | "pose"
  | "hair";

export type PromptModuleStatus = "draft" | "testing" | "active" | "retired";

export type PoseProfile = {
  torsoRotation: number;
  headRotation: number;
  headTilt: number;
  cameraHeight: "eye_level";
  chin: "slightly_forward_and_down";
  shoulders: "relaxed_balanced_open";
};

export type GazeProfile = {
  stability: number;
  confidence: number;
  focus: number;
  presence?: number;
  warmth: number;
  curiosity: number;
  intensity: number;
  aggression?: number;
  authority?: number;
};

export type ExpressionProfile = {
  smileIntensity: number;
  jawRelaxation: number;
  eyeEngagement?: number;
  browTension?: number;
  facialTension?: number;
  emotionalWarmth?: number;
};

export type PresenceProfile = {
  groundedness: number;
  composure?: number;
  authority: number;
  clarity?: number;
  credibility: number;
  emotionalStability?: number;
  decisionEnergy?: number;
  visualWeight?: number;
  approachability?: number;
  agency?: number;
  openness?: number;
  creativity?: number;
  responsibility?: number;
};

export type HairGroomingProfile = {
  preserveHairline: boolean;
  preserveHairLength: boolean;
  preserveHairColor: boolean;
  volumeIncreasePercent: number;
  rootLift: number;
  crownFullness?: number;
  sideFullness?: number;
  strandSeparation?: number;
  flyawayAmount?: number;
  groomingFormality: number;
};

export type PortraitStyle = {
  id: string;
  slug: string;
  publicName: string;
  publicNameZh: string;
  internalReferenceName: string;
  description: string;
  version: string;
  engineVersion: string;
  status: PromptModuleStatus;
  accent: string;
  traits: string[];
  modules: Partial<Record<PromptModuleCategory, string>>;
  parameters?: Partial<Record<PromptModuleCategory, Record<string, unknown>>>;
};

export type CompiledPrompt = {
  id: string;
  positivePrompt: string;
  negativePrompt: string;
  moduleVersions: Record<string, string>;
  moduleOrder: PromptModuleCategory[];
  portraitDNAId: string;
  portraitDNAVersion: string;
  engineVersion: string;
  compilerVersion: string;
  checksum: string;
  createdAt: string;
};

export type PortraitOrder = {
  id: string;
  orderNumber: string;
  customerNickname: string | null;
  customerContactNote: string | null;
  sourceChannel: string;
  selectedStyleId: string;
  selectedStyleVersion: string;
  status: PortraitOrderStatus;
  priceFen: number;
  currency: "CNY";
  paymentStatus: string;
  customerRequirements: string | null;
  internalNotes: string | null;
  assignedOperatorId: string | null;
  experimentId?: string | null;
  experimentVariant?: "control" | "variant" | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
};

export type PortraitCandidate = {
  id: string;
  orderId: string;
  generationJobId: string;
  portraitDNAId: string;
  portraitDNAVersion: string;
  providerName: string;
  providerModel: string | null;
  compiledPromptId: string;
  masterAssetId: string | null;
  status: CandidateStatus;
  operatorRating: number | null;
  operatorNotes: string | null;
  rejectionReasons: string[];
  qualityScore: number | null;
  qualityScoreDetail: PortraitQualityScore;
  reviewChecklist: CandidateReviewChecklist;
  variant: number;
  createdAt: string;
  updatedAt: string;
};

export type PortraitAsset = {
  id: string;
  orderId: string;
  candidateId: string | null;
  kind: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  isPrivate: boolean;
  createdAt: string;
  expiresAt: string | null;
  deletedAt: string | null;
};

export type GenerationJob = {
  id: string;
  orderId: string;
  status: string;
  providerName: string;
  requestedCount: number;
  completedCount: number;
  retryCount: number;
  maxRetries: number;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  operatorId: string;
  orderId: string | null;
  resourceId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PromptModuleRecord = {
  id: string;
  slug: string;
  name: string;
  category: PromptModuleCategory;
  version: string;
  engineVersion: string;
  positivePrompt: string;
  negativePrompt: string | null;
  parameters: Record<string, unknown>;
  status: PromptModuleStatus;
  usedBy: string[];
};

export type PortraitDnaVersionRecord = {
  id: string;
  styleId: string;
  version: string;
  engineVersion: string;
  status: PromptModuleStatus;
  modules: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type CandidateReviewChecklist = {
  pose: Record<string, boolean>;
  gaze: Record<string, boolean>;
  presence: Record<string, boolean>;
  hair: Record<string, boolean>;
};

export type PortraitQualityScore = {
  identitySimilarity?: number;
  poseNormalization?: number;
  faceFrontality?: number;
  shoulderBalance?: number;
  gazeStability?: number;
  gazeConfidence?: number;
  eyeNaturalness?: number;
  expressionNaturalness?: number;
  presenceScore?: number;
  groundedness?: number;
  credibility?: number;
  visualAuthority?: number;
  professionalWeight?: number;
  hairVolumeRealism?: number;
  hairlinePreservation?: number;
  hairTextureRealism?: number;
  skinRealism?: number;
  wardrobeIntegrity?: number;
  backgroundQuality?: number;
  photographicRealism?: number;
  careerSuitability?: number;
  overallScore?: number;
  hardFailures: string[];
  warnings: string[];
};

export type CandidateRejectionReason =
  | "identity_mismatch"
  | "pose_inherited_from_source"
  | "head_tilt"
  | "passport_photo_composition"
  | "gaze_too_soft"
  | "gaze_timid"
  | "gaze_aggressive"
  | "weak_presence"
  | "flat_hair"
  | "hairline_changed"
  | "hair_volume_exaggerated"
  | "wig_like_hair"
  | "eye_artifact"
  | "teeth_artifact"
  | "skin_too_smooth"
  | "hair_artifact"
  | "wardrobe_artifact"
  | "jewelry_artifact"
  | "pose_unnatural"
  | "expression_unnatural"
  | "background_fake"
  | "too_beautified"
  | "age_changed"
  | "not_professional"
  | "other";

export type PositiveFeedbackReason =
  | "looks_most_like_me"
  | "more_natural"
  | "more_confident"
  | "stronger_presence"
  | "better_eye_contact"
  | "more_professional"
  | "better_posture"
  | "better_hair"
  | "better_expression"
  | "better_wardrobe"
  | "better_background"
  | "other";

export type NegativeFeedbackReason =
  | "does_not_look_like_me"
  | "eyes_too_soft"
  | "eyes_too_strong"
  | "gaze_unnatural"
  | "weak_presence"
  | "pose_too_straight"
  | "pose_unnatural"
  | "looks_like_passport_photo"
  | "hair_too_flat"
  | "hair_too_fake"
  | "too_retouched"
  | "too_serious"
  | "too_casual"
  | "wardrobe_not_suitable"
  | "background_not_suitable"
  | "too_ai_generated"
  | "other";

export type StudioState = {
  actor: {
    email: string;
    displayName: string;
    role: PortraitAdminRole;
  };
  orders: PortraitOrder[];
  styles: PortraitStyle[];
  dnaVersions: PortraitDnaVersionRecord[];
  candidates: PortraitCandidate[];
  assets: PortraitAsset[];
  jobs: GenerationJob[];
  prompts: CompiledPrompt[];
  audits: AuditLog[];
  modules: PromptModuleRecord[];
  stats: {
    today: number;
    readyToGenerate: number;
    awaitingReview: number;
    awaitingCustomer: number;
    readyToDeliver: number;
    completed: number;
    failed: number;
    averageHours: number;
  };
  config: {
    provider: string;
    providerConfigured: boolean;
    providerModel: string;
    generationCount: number;
    maxBatchRetries: number;
    previewDimension: number;
    watermarkEnabled: boolean;
    unfinishedRetentionDays: number;
    completedRetentionDays: number;
    mockMode: boolean;
  };
};
