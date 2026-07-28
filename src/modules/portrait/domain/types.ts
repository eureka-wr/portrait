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
  | "career_identity"
  | "composition"
  | "pose"
  | "expression"
  | "camera"
  | "lens"
  | "lighting"
  | "background"
  | "wardrobe"
  | "hair"
  | "skin"
  | "color"
  | "retouch"
  | "rendering"
  | "negative"
  | "output";

export type PortraitStyle = {
  id: string;
  slug: string;
  publicName: string;
  publicNameZh: string;
  internalReferenceName: string;
  description: string;
  version: string;
  status: "draft" | "testing" | "active" | "retired";
  accent: string;
  traits: string[];
  modules: Partial<Record<PromptModuleCategory, string>>;
};

export type CompiledPrompt = {
  id: string;
  positivePrompt: string;
  negativePrompt: string;
  moduleVersions: Record<string, string>;
  portraitDNAId: string;
  portraitDNAVersion: string;
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
  positivePrompt: string;
  negativePrompt: string | null;
  status: "draft" | "active" | "retired";
  usedBy: string[];
};

export type StudioState = {
  actor: {
    email: string;
    displayName: string;
    role: PortraitAdminRole;
  };
  orders: PortraitOrder[];
  styles: PortraitStyle[];
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

