import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const portraitUsers = sqliteTable(
  "portrait_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role", { enum: ["operator", "admin"] }).notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("portrait_users_email_unique").on(table.email)],
);

export const portraitStyles = sqliteTable(
  "portrait_styles",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    publicName: text("public_name").notNull(),
    publicNameZh: text("public_name_zh").notNull(),
    internalReferenceName: text("internal_reference_name"),
    description: text("description").notNull(),
    currentVersion: text("current_version").notNull(),
    status: text("status").notNull(),
    accent: text("accent").notNull(),
    traitsJson: text("traits_json").notNull().default("[]"),
    ...timestamps,
  },
  (table) => [uniqueIndex("portrait_styles_slug_unique").on(table.slug)],
);

export const portraitDnaVersions = sqliteTable(
  "portrait_dna_versions",
  {
    id: text("id").primaryKey(),
    styleId: text("style_id").notNull(),
    version: text("version").notNull(),
    engineVersion: text("engine_version").notNull().default("1.0"),
    status: text("status").notNull(),
    modulesJson: text("modules_json").notNull(),
    ...timestamps,
    publishedAt: text("published_at"),
  },
  (table) => [
    uniqueIndex("portrait_dna_style_version_unique").on(
      table.styleId,
      table.version,
    ),
  ],
);

export const promptModules = sqliteTable(
  "prompt_modules",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    version: text("version").notNull(),
    engineVersion: text("engine_version").notNull().default("1.0"),
    positivePrompt: text("positive_prompt").notNull(),
    negativePrompt: text("negative_prompt"),
    parametersJson: text("parameters_json").notNull().default("{}"),
    status: text("status").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("prompt_module_slug_version_unique").on(
      table.slug,
      table.version,
    ),
  ],
);

export const portraitOrders = sqliteTable("portrait_orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerNickname: text("customer_nickname"),
  customerContactNote: text("customer_contact_note"),
  sourceChannel: text("source_channel").notNull(),
  selectedStyleId: text("selected_style_id").notNull(),
  selectedStyleVersion: text("selected_style_version").notNull(),
  status: text("status").notNull(),
  priceFen: integer("price_fen").notNull().default(990),
  currency: text("currency").notNull().default("CNY"),
  paymentStatus: text("payment_status").notNull(),
  customerRequirements: text("customer_requirements"),
  internalNotes: text("internal_notes"),
  assignedOperatorId: text("assigned_operator_id"),
  experimentId: text("experiment_id"),
  experimentVariant: text("experiment_variant"),
  ...timestamps,
  completedAt: text("completed_at"),
  expiresAt: text("expires_at"),
});

export const portraitAssets = sqliteTable("portrait_assets", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  candidateId: text("candidate_id"),
  kind: text("kind").notNull(),
  storageProvider: text("storage_provider").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes"),
  isPrivate: integer("is_private", { mode: "boolean" }).notNull().default(true),
  checksum: text("checksum"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at"),
  deletedAt: text("deleted_at"),
});

export const compiledPrompts = sqliteTable("compiled_prompts", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  positivePrompt: text("positive_prompt").notNull(),
  negativePrompt: text("negative_prompt").notNull(),
  structuredPayloadJson: text("structured_payload_json").notNull().default("{}"),
  moduleVersionsJson: text("module_versions_json").notNull(),
  moduleOrderJson: text("module_order_json").notNull().default("[]"),
  portraitDnaId: text("portrait_dna_id").notNull(),
  portraitDnaVersion: text("portrait_dna_version").notNull(),
  engineVersion: text("engine_version").notNull().default("1.0"),
  compilerVersion: text("compiler_version").notNull(),
  checksum: text("checksum").notNull(),
  createdAt: text("created_at").notNull(),
});

export const generationJobs = sqliteTable("generation_jobs", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  status: text("status").notNull(),
  providerName: text("provider_name").notNull(),
  requestedCount: integer("requested_count").notNull(),
  completedCount: integer("completed_count").notNull().default(0),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(1),
  failureReason: text("failure_reason"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  ...timestamps,
});

export const portraitCandidates = sqliteTable("portrait_candidates", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  generationJobId: text("generation_job_id").notNull(),
  portraitDnaId: text("portrait_dna_id").notNull(),
  portraitDnaVersion: text("portrait_dna_version").notNull(),
  providerName: text("provider_name").notNull(),
  providerModel: text("provider_model"),
  compiledPromptId: text("compiled_prompt_id").notNull(),
  masterAssetId: text("master_asset_id"),
  status: text("status").notNull(),
  operatorRating: integer("operator_rating"),
  operatorNotes: text("operator_notes"),
  rejectionReasonsJson: text("rejection_reasons_json").notNull().default("[]"),
  qualityScore: real("quality_score"),
  qualityScoreJson: text("quality_score_json").notNull().default("{}"),
  reviewChecklistJson: text("review_checklist_json").notNull().default("{}"),
  variant: integer("variant").notNull().default(1),
  ...timestamps,
});

export const candidateFeedback = sqliteTable("candidate_feedback", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  candidateId: text("candidate_id").notNull(),
  source: text("source").notNull(),
  selected: integer("selected", { mode: "boolean" }).notNull(),
  positiveReasonsJson: text("positive_reasons_json").notNull().default("[]"),
  negativeReasonsJson: text("negative_reasons_json").notNull().default("[]"),
  freeText: text("free_text"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const portraitRefinements = sqliteTable("portrait_refinements", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  sourceCandidateId: text("source_candidate_id").notNull(),
  requestJson: text("request_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const portraitAuditLogs = sqliteTable("portrait_audit_logs", {
  id: text("id").primaryKey(),
  operatorId: text("operator_id").notNull(),
  orderId: text("order_id"),
  resourceId: text("resource_id"),
  action: text("action").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const portraitExperiments = sqliteTable("portrait_experiments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  styleId: text("style_id").notNull(),
  controlVersion: text("control_version").notNull(),
  variantVersion: text("variant_version").notNull(),
  status: text("status").notNull(),
  allocationPercent: integer("allocation_percent").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
});
