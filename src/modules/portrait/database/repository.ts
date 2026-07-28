import { env } from "cloudflare:workers";
import { PORTRAIT_STYLES } from "../domain/catalog";
import type {
  AuditLog,
  CompiledPrompt,
  GenerationJob,
  PortraitAsset,
  PortraitCandidate,
  PortraitOrder,
  PromptModuleRecord,
  StudioState,
} from "../domain/types";
import type { PortraitActor } from "../auth";
import { compilePrompt } from "../prompts/compiler";
import { assertOrderTransition } from "../domain/state-machine";

type RuntimeEnv = {
  DB?: D1Database;
  PORTRAIT_PROVIDER?: string;
  PORTRAIT_PROVIDER_API_KEY?: string;
  PORTRAIT_PROVIDER_MODEL?: string;
  PORTRAIT_DEFAULT_GENERATION_COUNT?: string;
  PORTRAIT_MAX_BATCH_RETRIES?: string;
  CUSTOMER_PREVIEW_MAX_DIMENSION?: string;
  ENABLE_CUSTOMER_PREVIEW_WATERMARK?: string;
  UNFINISHED_ORDER_RETENTION_DAYS?: string;
  COMPLETED_ORDER_IMAGE_RETENTION_DAYS?: string;
};

const runtime = env as unknown as RuntimeEnv;
let initialization: Promise<void> | null = null;

export function getPortraitDb() {
  if (!runtime.DB) {
    throw new Error("数据库绑定 DB 不可用，请检查生产环境的 D1 配置。");
  }
  return runtime.DB;
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS portrait_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('operator', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS portrait_styles (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    public_name TEXT NOT NULL,
    public_name_zh TEXT NOT NULL,
    internal_reference_name TEXT,
    description TEXT NOT NULL,
    current_version TEXT NOT NULL,
    status TEXT NOT NULL,
    accent TEXT NOT NULL,
    traits_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS portrait_dna_versions (
    id TEXT PRIMARY KEY,
    style_id TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    modules_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT,
    UNIQUE(style_id, version)
  )`,
  `CREATE TABLE IF NOT EXISTS prompt_modules (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT NOT NULL,
    positive_prompt TEXT NOT NULL,
    negative_prompt TEXT,
    parameters_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slug, version)
  )`,
  `CREATE TABLE IF NOT EXISTS portrait_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    customer_nickname TEXT,
    customer_contact_note TEXT,
    source_channel TEXT NOT NULL,
    selected_style_id TEXT NOT NULL,
    selected_style_version TEXT NOT NULL,
    status TEXT NOT NULL,
    price_fen INTEGER NOT NULL DEFAULT 990,
    currency TEXT NOT NULL DEFAULT 'CNY',
    payment_status TEXT NOT NULL,
    customer_requirements TEXT,
    internal_notes TEXT,
    assigned_operator_id TEXT,
    experiment_id TEXT,
    experiment_variant TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    expires_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS portrait_assets (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    candidate_id TEXT,
    kind TEXT NOT NULL,
    storage_provider TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    size_bytes INTEGER,
    is_private INTEGER NOT NULL DEFAULT 1,
    checksum TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS compiled_prompts (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    positive_prompt TEXT NOT NULL,
    negative_prompt TEXT NOT NULL,
    structured_payload_json TEXT NOT NULL DEFAULT '{}',
    module_versions_json TEXT NOT NULL,
    portrait_dna_id TEXT NOT NULL,
    portrait_dna_version TEXT NOT NULL,
    compiler_version TEXT NOT NULL,
    checksum TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS generation_jobs (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    requested_count INTEGER NOT NULL,
    completed_count INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 1,
    failure_reason TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS portrait_candidates (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    generation_job_id TEXT NOT NULL,
    portrait_dna_id TEXT NOT NULL,
    portrait_dna_version TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    provider_model TEXT,
    compiled_prompt_id TEXT NOT NULL,
    master_asset_id TEXT,
    status TEXT NOT NULL,
    operator_rating INTEGER,
    operator_notes TEXT,
    rejection_reasons_json TEXT NOT NULL DEFAULT '[]',
    quality_score REAL,
    variant INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS candidate_feedback (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    source TEXT NOT NULL,
    selected INTEGER NOT NULL,
    positive_reasons_json TEXT NOT NULL DEFAULT '[]',
    negative_reasons_json TEXT NOT NULL DEFAULT '[]',
    free_text TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS portrait_refinements (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    source_candidate_id TEXT NOT NULL,
    request_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS portrait_audit_logs (
    id TEXT PRIMARY KEY,
    operator_id TEXT NOT NULL,
    order_id TEXT,
    resource_id TEXT,
    action TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS portrait_experiments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    style_id TEXT NOT NULL,
    control_version TEXT NOT NULL,
    variant_version TEXT NOT NULL,
    status TEXT NOT NULL,
    allocation_percent INTEGER NOT NULL,
    started_at TEXT,
    completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS portrait_orders_status_idx ON portrait_orders(status)`,
  `CREATE INDEX IF NOT EXISTS portrait_orders_style_idx ON portrait_orders(selected_style_id)`,
  `CREATE INDEX IF NOT EXISTS portrait_candidates_order_idx ON portrait_candidates(order_id)`,
  `CREATE INDEX IF NOT EXISTS portrait_assets_order_idx ON portrait_assets(order_id)`,
  `CREATE INDEX IF NOT EXISTS portrait_audit_order_idx ON portrait_audit_logs(order_id)`,
];

async function seedCatalog() {
  const db = getPortraitDb();
  const existing = await db
    .prepare("SELECT COUNT(*) AS count FROM portrait_styles")
    .first<{ count: number }>();
  if ((existing?.count ?? 0) > 0) return;

  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  for (const style of PORTRAIT_STYLES) {
    statements.push(
      db
        .prepare(
          `INSERT INTO portrait_styles
          (id, slug, public_name, public_name_zh, internal_reference_name, description, current_version, status, accent, traits_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          style.id,
          style.slug,
          style.publicName,
          style.publicNameZh,
          style.internalReferenceName,
          style.description,
          style.version,
          style.status,
          style.accent,
          JSON.stringify(style.traits),
          now,
          now,
        ),
    );

    const moduleRefs: Record<string, string> = {};
    for (const [category, content] of Object.entries(style.modules)) {
      if (!content) continue;
      const moduleId = `${style.id}_${category}_v1`;
      const slug = `${style.slug}-${category}`;
      moduleRefs[category] = `${moduleId}@1.0`;
      statements.push(
        db
          .prepare(
            `INSERT INTO prompt_modules
            (id, slug, name, category, version, positive_prompt, negative_prompt, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, '1.0', ?, ?, 'active', ?, ?)`,
          )
          .bind(
            moduleId,
            slug,
            `${style.publicName} · ${category}`,
            category,
            category === "negative" ? "" : content,
            category === "negative" ? content : null,
            now,
            now,
          ),
      );
    }
    statements.push(
      db
        .prepare(
          `INSERT INTO portrait_dna_versions
          (id, style_id, version, status, modules_json, created_at, updated_at, published_at)
          VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`,
        )
        .bind(
          `${style.id}_v1`,
          style.id,
          style.version,
          JSON.stringify(moduleRefs),
          now,
          now,
          now,
        ),
    );
  }
  await db.batch(statements);

  const prompt = await compilePrompt({
    portraitDNAId: "style_quiet_executive",
    portraitDNAVersion: "1.0",
    sourceContext:
      "One clear primary face is present. Preserve all observed identity details; source analysis stores no biometric template.",
  });
  const demoOrderId = "order_demo_001";
  const demoJobId = "job_demo_001";
  await db.batch([
    db
      .prepare(
        `INSERT INTO portrait_users (id, email, display_name, role, created_at)
         VALUES (?, ?, ?, 'admin', ?)`,
      )
      .bind("user_dev_admin", "dev.admin@catv.local", "CATV 开发管理员", now),
    db
      .prepare(
        `INSERT INTO portrait_users (id, email, display_name, role, created_at)
         VALUES (?, ?, ?, 'operator', ?)`,
      )
      .bind("user_demo_operator", "operator@catv.local", "肖像运营", now),
    db
      .prepare(
        `INSERT INTO portrait_orders
        (id, order_number, customer_nickname, customer_contact_note, source_channel, selected_style_id, selected_style_version, status, price_fen, currency, payment_status, customer_requirements, internal_notes, assigned_operator_id, created_at, updated_at)
        VALUES (?, 'CATV-260728-001', '林小姐', '小红书私信 · 已确认可用照片', 'xiaohongshu', 'style_quiet_executive', '1.0', 'awaiting_internal_review', 990, 'CNY', 'paid', '用于产品负责人主页，希望自然、不要过度修图', '首单示例：等待内部筛选', 'dev.admin@catv.local', ?, ?)`,
      )
      .bind(demoOrderId, now, now),
    db
      .prepare(
        `INSERT INTO compiled_prompts
        (id, order_id, positive_prompt, negative_prompt, structured_payload_json, module_versions_json, portrait_dna_id, portrait_dna_version, compiler_version, checksum, created_at)
        VALUES (?, ?, ?, ?, '{}', ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        prompt.id,
        demoOrderId,
        prompt.positivePrompt,
        prompt.negativePrompt,
        JSON.stringify(prompt.moduleVersions),
        prompt.portraitDNAId,
        prompt.portraitDNAVersion,
        prompt.compilerVersion,
        prompt.checksum,
        prompt.createdAt,
      ),
    db
      .prepare(
        `INSERT INTO generation_jobs
        (id, order_id, status, provider_name, requested_count, completed_count, retry_count, max_retries, idempotency_key, created_at, updated_at)
        VALUES (?, ?, 'awaiting_review', 'mock', 4, 4, 0, 1, 'demo-job-v1', ?, ?)`,
      )
      .bind(demoJobId, demoOrderId, now, now),
  ]);
  const candidates = Array.from({ length: 4 }, (_, index) =>
    db
      .prepare(
        `INSERT INTO portrait_candidates
        (id, order_id, generation_job_id, portrait_dna_id, portrait_dna_version, provider_name, provider_model, compiled_prompt_id, master_asset_id, status, rejection_reasons_json, quality_score, variant, created_at, updated_at)
        VALUES (?, ?, ?, 'style_quiet_executive', '1.0', 'mock', 'portrait-mock-1.0', ?, NULL, 'awaiting_review', '[]', ?, ?, ?, ?)`,
      )
      .bind(
        `candidate_demo_00${index + 1}`,
        demoOrderId,
        demoJobId,
        prompt.id,
        88 - index * 2,
        index + 1,
        now,
        now,
      ),
  );
  await db.batch(candidates);
  await db.batch([
    db
      .prepare(
        `INSERT INTO portrait_audit_logs (id, operator_id, order_id, resource_id, action, metadata_json, created_at)
         VALUES (?, 'dev.admin@catv.local', ?, ?, 'create_order', '{"channel":"xiaohongshu"}', ?)`,
      )
      .bind(crypto.randomUUID(), demoOrderId, demoOrderId, now),
    db
      .prepare(
        `INSERT INTO portrait_audit_logs (id, operator_id, order_id, resource_id, action, metadata_json, created_at)
         VALUES (?, 'dev.admin@catv.local', ?, ?, 'compile_prompt', '{"compilerVersion":"1.0.0"}', ?)`,
      )
      .bind(crypto.randomUUID(), demoOrderId, prompt.id, now),
    db
      .prepare(
        `INSERT INTO portrait_audit_logs (id, operator_id, order_id, resource_id, action, metadata_json, created_at)
         VALUES (?, 'dev.admin@catv.local', ?, ?, 'start_generation', '{"provider":"mock","count":4}', ?)`,
      )
      .bind(crypto.randomUUID(), demoOrderId, demoJobId, now),
  ]);
}

export async function ensurePortraitDatabase() {
  if (!initialization) {
    initialization = (async () => {
      const db = getPortraitDb();
      await db.batch(
        schemaStatements.map((statement) => db.prepare(statement)),
      );
      await seedCatalog();
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
}

async function allRows<T>(query: D1PreparedStatement) {
  const result = await query.all<T>();
  return result.results ?? [];
}

function jsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export async function listStudioState(
  actor: PortraitActor,
): Promise<StudioState> {
  await ensurePortraitDatabase();
  const db = getPortraitDb();
  const [
    orderRows,
    candidateRows,
    assetRows,
    jobRows,
    promptRows,
    auditRows,
    moduleRows,
  ] = await Promise.all([
    allRows<Record<string, unknown>>(
      db.prepare("SELECT * FROM portrait_orders ORDER BY created_at DESC"),
    ),
    allRows<Record<string, unknown>>(
      db.prepare("SELECT * FROM portrait_candidates ORDER BY created_at DESC"),
    ),
    allRows<Record<string, unknown>>(
      db.prepare(
        "SELECT id, order_id, candidate_id, kind, mime_type, width, height, size_bytes, is_private, created_at, expires_at, deleted_at FROM portrait_assets ORDER BY created_at DESC",
      ),
    ),
    allRows<Record<string, unknown>>(
      db.prepare("SELECT * FROM generation_jobs ORDER BY created_at DESC"),
    ),
    allRows<Record<string, unknown>>(
      db.prepare(
        "SELECT * FROM compiled_prompts ORDER BY created_at DESC LIMIT 40",
      ),
    ),
    allRows<Record<string, unknown>>(
      db.prepare(
        "SELECT * FROM portrait_audit_logs ORDER BY created_at DESC LIMIT 120",
      ),
    ),
    allRows<Record<string, unknown>>(
      db.prepare("SELECT * FROM prompt_modules ORDER BY category, name"),
    ),
  ]);

  const orders: PortraitOrder[] = orderRows.map((row) => ({
    id: String(row.id),
    orderNumber: String(row.order_number),
    customerNickname: row.customer_nickname
      ? String(row.customer_nickname)
      : null,
    customerContactNote: row.customer_contact_note
      ? String(row.customer_contact_note)
      : null,
    sourceChannel: String(row.source_channel),
    selectedStyleId: String(row.selected_style_id),
    selectedStyleVersion: String(row.selected_style_version),
    status: row.status as PortraitOrder["status"],
    priceFen: Number(row.price_fen),
    currency: "CNY",
    paymentStatus: String(row.payment_status),
    customerRequirements: row.customer_requirements
      ? String(row.customer_requirements)
      : null,
    internalNotes: row.internal_notes ? String(row.internal_notes) : null,
    assignedOperatorId: row.assigned_operator_id
      ? String(row.assigned_operator_id)
      : null,
    experimentId: row.experiment_id ? String(row.experiment_id) : null,
    experimentVariant: row.experiment_variant
      ? (String(row.experiment_variant) as "control" | "variant")
      : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  }));

  const candidates: PortraitCandidate[] = candidateRows.map((row) => ({
    id: String(row.id),
    orderId: String(row.order_id),
    generationJobId: String(row.generation_job_id),
    portraitDNAId: String(row.portrait_dna_id),
    portraitDNAVersion: String(row.portrait_dna_version),
    providerName: String(row.provider_name),
    providerModel: row.provider_model ? String(row.provider_model) : null,
    compiledPromptId: String(row.compiled_prompt_id),
    masterAssetId: row.master_asset_id ? String(row.master_asset_id) : null,
    status: row.status as PortraitCandidate["status"],
    operatorRating:
      row.operator_rating === null ? null : Number(row.operator_rating),
    operatorNotes: row.operator_notes ? String(row.operator_notes) : null,
    rejectionReasons: jsonArray(row.rejection_reasons_json),
    qualityScore:
      row.quality_score === null ? null : Number(row.quality_score),
    variant: Number(row.variant),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  const assets: PortraitAsset[] = assetRows.map((row) => ({
    id: String(row.id),
    orderId: String(row.order_id),
    candidateId: row.candidate_id ? String(row.candidate_id) : null,
    kind: String(row.kind),
    mimeType: String(row.mime_type),
    width: row.width === null ? null : Number(row.width),
    height: row.height === null ? null : Number(row.height),
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    isPrivate: Boolean(row.is_private),
    createdAt: String(row.created_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  }));

  const jobs: GenerationJob[] = jobRows.map((row) => ({
    id: String(row.id),
    orderId: String(row.order_id),
    status: String(row.status),
    providerName: String(row.provider_name),
    requestedCount: Number(row.requested_count),
    completedCount: Number(row.completed_count),
    retryCount: Number(row.retry_count),
    maxRetries: Number(row.max_retries),
    failureReason: row.failure_reason ? String(row.failure_reason) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));

  const prompts: CompiledPrompt[] =
    actor.role === "admin"
      ? promptRows.map((row) => ({
          id: String(row.id),
          positivePrompt: String(row.positive_prompt),
          negativePrompt: String(row.negative_prompt),
          moduleVersions: Object.fromEntries(
            Object.entries(jsonObject(row.module_versions_json)).map(
              ([key, value]) => [key, String(value)],
            ),
          ),
          portraitDNAId: String(row.portrait_dna_id),
          portraitDNAVersion: String(row.portrait_dna_version),
          compilerVersion: String(row.compiler_version),
          checksum: String(row.checksum),
          createdAt: String(row.created_at),
        }))
      : promptRows.map((row) => ({
          id: String(row.id),
          positivePrompt: "仅 Admin 可查看完整 Prompt。",
          negativePrompt: "仅 Admin 可查看完整 Prompt。",
          moduleVersions: {},
          portraitDNAId: String(row.portrait_dna_id),
          portraitDNAVersion: String(row.portrait_dna_version),
          compilerVersion: String(row.compiler_version),
          checksum: String(row.checksum),
          createdAt: String(row.created_at),
        }));

  const audits: AuditLog[] = auditRows.map((row) => ({
    id: String(row.id),
    operatorId: String(row.operator_id),
    orderId: row.order_id ? String(row.order_id) : null,
    resourceId: row.resource_id ? String(row.resource_id) : null,
    action: String(row.action),
    metadata: jsonObject(row.metadata_json),
    createdAt: String(row.created_at),
  }));

  const usage = new Map<string, string[]>();
  for (const style of PORTRAIT_STYLES) {
    for (const category of Object.keys(style.modules)) {
      const slug = `${style.slug}-${category}`;
      usage.set(slug, [...(usage.get(slug) ?? []), style.publicNameZh]);
    }
  }
  const modules: PromptModuleRecord[] = moduleRows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    category: row.category as PromptModuleRecord["category"],
    version: String(row.version),
    positivePrompt: String(row.positive_prompt),
    negativePrompt: row.negative_prompt ? String(row.negative_prompt) : null,
    status: row.status as PromptModuleRecord["status"],
    usedBy: usage.get(String(row.slug)) ?? [],
  }));

  const activeElapsed = orders
    .filter((order) => order.completedAt)
    .map(
      (order) =>
        (new Date(order.completedAt as string).getTime() -
          new Date(order.createdAt).getTime()) /
        3_600_000,
    );
  const averageHours =
    activeElapsed.length > 0
      ? activeElapsed.reduce((sum, value) => sum + value, 0) /
        activeElapsed.length
      : 3.8;

  return {
    actor,
    orders,
    styles: PORTRAIT_STYLES,
    candidates,
    assets,
    jobs,
    prompts,
    audits,
    modules,
    stats: {
      today: orders.filter(
        (order) =>
          new Date(order.createdAt).toDateString() === new Date().toDateString(),
      ).length,
      readyToGenerate: orders.filter(
        (order) => order.status === "ready_to_generate",
      ).length,
      awaitingReview: orders.filter(
        (order) => order.status === "awaiting_internal_review",
      ).length,
      awaitingCustomer: orders.filter((order) =>
        ["preview_sent", "awaiting_customer_selection"].includes(order.status),
      ).length,
      readyToDeliver: orders.filter(
        (order) => order.status === "ready_to_deliver",
      ).length,
      completed: orders.filter((order) => order.status === "completed").length,
      failed: orders.filter((order) => order.status === "failed").length,
      averageHours: Number(averageHours.toFixed(1)),
    },
    config: {
      provider: runtime.PORTRAIT_PROVIDER ?? "mock",
      providerConfigured: Boolean(runtime.PORTRAIT_PROVIDER_API_KEY),
      providerModel: runtime.PORTRAIT_PROVIDER_MODEL ?? "gpt-image-1.5",
      generationCount: Number(
        runtime.PORTRAIT_DEFAULT_GENERATION_COUNT ?? "4",
      ),
      maxBatchRetries: Number(runtime.PORTRAIT_MAX_BATCH_RETRIES ?? "1"),
      previewDimension: Number(
        runtime.CUSTOMER_PREVIEW_MAX_DIMENSION ?? "640",
      ),
      watermarkEnabled:
        runtime.ENABLE_CUSTOMER_PREVIEW_WATERMARK !== "false",
      unfinishedRetentionDays: Number(
        runtime.UNFINISHED_ORDER_RETENTION_DAYS ?? "14",
      ),
      completedRetentionDays: Number(
        runtime.COMPLETED_ORDER_IMAGE_RETENTION_DAYS ?? "7",
      ),
      mockMode: !runtime.PORTRAIT_PROVIDER_API_KEY,
    },
  };
}

export async function insertAudit(
  actor: PortraitActor,
  action: string,
  orderId?: string | null,
  resourceId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  await ensurePortraitDatabase();
  await getPortraitDb()
    .prepare(
      `INSERT INTO portrait_audit_logs
      (id, operator_id, order_id, resource_id, action, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      actor.email,
      orderId ?? null,
      resourceId ?? null,
      action,
      JSON.stringify(metadata),
      new Date().toISOString(),
    )
    .run();
}

export async function createOrderRecord(input: {
  id: string;
  orderNumber: string;
  customerNickname: string;
  customerContactNote: string;
  sourceChannel: string;
  selectedStyleId: string;
  selectedStyleVersion: string;
  priceFen: number;
  paymentStatus: string;
  customerRequirements: string;
  internalNotes: string;
  assignedOperatorId: string;
}) {
  await ensurePortraitDatabase();
  const now = new Date().toISOString();
  await getPortraitDb()
    .prepare(
      `INSERT INTO portrait_orders
      (id, order_number, customer_nickname, customer_contact_note, source_channel, selected_style_id, selected_style_version, status, price_fen, currency, payment_status, customer_requirements, internal_notes, assigned_operator_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ready_to_generate', ?, 'CNY', ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.orderNumber,
      input.customerNickname || null,
      input.customerContactNote || null,
      input.sourceChannel,
      input.selectedStyleId,
      input.selectedStyleVersion,
      input.priceFen,
      input.paymentStatus,
      input.customerRequirements || null,
      input.internalNotes || null,
      input.assignedOperatorId,
      now,
      now,
    )
    .run();
}

export async function insertAssetRecord(input: {
  id: string;
  orderId: string;
  candidateId?: string | null;
  kind: string;
  storageKey: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  sizeBytes: number;
  expiresAt?: string | null;
}) {
  await ensurePortraitDatabase();
  await getPortraitDb()
    .prepare(
      `INSERT INTO portrait_assets
      (id, order_id, candidate_id, kind, storage_provider, storage_key, mime_type, width, height, size_bytes, is_private, created_at, expires_at)
      VALUES (?, ?, ?, ?, 'r2', ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(
      input.id,
      input.orderId,
      input.candidateId ?? null,
      input.kind,
      input.storageKey,
      input.mimeType,
      input.width ?? null,
      input.height ?? null,
      input.sizeBytes,
      new Date().toISOString(),
      input.expiresAt ?? null,
    )
    .run();
}

export async function getOrderRecord(orderId: string) {
  await ensurePortraitDatabase();
  return getPortraitDb()
    .prepare("SELECT * FROM portrait_orders WHERE id = ?")
    .bind(orderId)
    .first<Record<string, unknown>>();
}

export async function getAssetStorageRecord(assetId: string) {
  await ensurePortraitDatabase();
  return getPortraitDb()
    .prepare(
      "SELECT id, order_id, candidate_id, kind, storage_key, mime_type, deleted_at FROM portrait_assets WHERE id = ?",
    )
    .bind(assetId)
    .first<{
      id: string;
      order_id: string;
      candidate_id: string | null;
      kind: string;
      storage_key: string;
      mime_type: string;
      deleted_at: string | null;
    }>();
}

export async function getSourceAsset(orderId: string) {
  await ensurePortraitDatabase();
  return getPortraitDb()
    .prepare(
      `SELECT id, storage_key, mime_type FROM portrait_assets
       WHERE order_id = ? AND kind = 'source' AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(orderId)
    .first<{ id: string; storage_key: string; mime_type: string }>();
}

export async function getCandidateRecord(candidateId: string) {
  await ensurePortraitDatabase();
  return getPortraitDb()
    .prepare("SELECT * FROM portrait_candidates WHERE id = ?")
    .bind(candidateId)
    .first<Record<string, unknown>>();
}

export async function saveCompiledPrompt(
  orderId: string,
  prompt: CompiledPrompt,
) {
  await ensurePortraitDatabase();
  const db = getPortraitDb();
  const existing = await db
    .prepare(
      "SELECT id FROM compiled_prompts WHERE order_id = ? AND checksum = ? LIMIT 1",
    )
    .bind(orderId, prompt.checksum)
    .first<{ id: string }>();
  if (existing) return existing.id;
  await db
    .prepare(
      `INSERT INTO compiled_prompts
      (id, order_id, positive_prompt, negative_prompt, structured_payload_json, module_versions_json, portrait_dna_id, portrait_dna_version, compiler_version, checksum, created_at)
      VALUES (?, ?, ?, ?, '{}', ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      prompt.id,
      orderId,
      prompt.positivePrompt,
      prompt.negativePrompt,
      JSON.stringify(prompt.moduleVersions),
      prompt.portraitDNAId,
      prompt.portraitDNAVersion,
      prompt.compilerVersion,
      prompt.checksum,
      prompt.createdAt,
    )
    .run();
  return prompt.id;
}

export async function getCompiledPrompt(promptId: string) {
  await ensurePortraitDatabase();
  return getPortraitDb()
    .prepare("SELECT * FROM compiled_prompts WHERE id = ?")
    .bind(promptId)
    .first<Record<string, unknown>>();
}

export async function latestCompiledPrompt(orderId: string) {
  await ensurePortraitDatabase();
  return getPortraitDb()
    .prepare(
      "SELECT * FROM compiled_prompts WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
    )
    .bind(orderId)
    .first<Record<string, unknown>>();
}

export async function createGenerationJob(input: {
  id: string;
  orderId: string;
  providerName: string;
  requestedCount: number;
  maxRetries: number;
  idempotencyKey: string;
}) {
  await ensurePortraitDatabase();
  const db = getPortraitDb();
  const active = await db
    .prepare(
      `SELECT id, status FROM generation_jobs
       WHERE order_id = ? AND status IN ('created','queued','analyzing_source','compiling_prompt','calling_provider','processing_assets','quality_checking')
       LIMIT 1`,
    )
    .bind(input.orderId)
    .first<{ id: string; status: string }>();
  if (active) {
    throw new Error("该订单已有生成任务在运行，请勿重复点击。");
  }
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO generation_jobs
      (id, order_id, status, provider_name, requested_count, completed_count, retry_count, max_retries, idempotency_key, created_at, updated_at)
      VALUES (?, ?, 'created', ?, ?, 0, 0, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.orderId,
      input.providerName,
      input.requestedCount,
      input.maxRetries,
      input.idempotencyKey,
      now,
      now,
    )
    .run();
}

export async function updateGenerationJob(
  jobId: string,
  status: string,
  completedCount = 0,
  failureReason?: string | null,
) {
  await ensurePortraitDatabase();
  await getPortraitDb()
    .prepare(
      `UPDATE generation_jobs
       SET status = ?, completed_count = ?, failure_reason = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      status,
      completedCount,
      failureReason ?? null,
      new Date().toISOString(),
      jobId,
    )
    .run();
}

export async function insertCandidateRecord(input: {
  id: string;
  orderId: string;
  generationJobId: string;
  portraitDNAId: string;
  portraitDNAVersion: string;
  providerName: string;
  providerModel: string;
  compiledPromptId: string;
  masterAssetId: string;
  status?: string;
  qualityScore?: number;
  variant: number;
}) {
  await ensurePortraitDatabase();
  const now = new Date().toISOString();
  await getPortraitDb()
    .prepare(
      `INSERT INTO portrait_candidates
      (id, order_id, generation_job_id, portrait_dna_id, portrait_dna_version, provider_name, provider_model, compiled_prompt_id, master_asset_id, status, rejection_reasons_json, quality_score, variant, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.orderId,
      input.generationJobId,
      input.portraitDNAId,
      input.portraitDNAVersion,
      input.providerName,
      input.providerModel,
      input.compiledPromptId,
      input.masterAssetId,
      input.status ?? "awaiting_review",
      input.qualityScore ?? 86,
      input.variant,
      now,
      now,
    )
    .run();
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  options: { completed?: boolean; retentionDays?: number } = {},
) {
  await ensurePortraitDatabase();
  const current = await getPortraitDb()
    .prepare("SELECT status FROM portrait_orders WHERE id = ?")
    .bind(orderId)
    .first<{ status: PortraitOrder["status"] }>();
  if (!current) throw new Error("订单不存在。");
  assertOrderTransition(
    current.status,
    status as PortraitOrder["status"],
  );
  const now = new Date();
  const expiresAt = options.completed
    ? new Date(
        now.getTime() + (options.retentionDays ?? 7) * 86_400_000,
      ).toISOString()
    : null;
  await getPortraitDb()
    .prepare(
      `UPDATE portrait_orders
       SET status = ?, updated_at = ?, completed_at = COALESCE(?, completed_at), expires_at = COALESCE(?, expires_at)
       WHERE id = ?`,
    )
    .bind(
      status,
      now.toISOString(),
      options.completed ? now.toISOString() : null,
      expiresAt,
      orderId,
    )
    .run();
}

export async function countSelectedPreviews(orderId: string) {
  await ensurePortraitDatabase();
  const result = await getPortraitDb()
    .prepare(
      `SELECT COUNT(*) AS count FROM portrait_candidates
       WHERE order_id = ? AND status IN ('selected_for_preview','sent_to_customer','customer_selected','finalized','delivered')`,
    )
    .bind(orderId)
    .first<{ count: number }>();
  return result?.count ?? 0;
}

export async function updateCandidateStatus(
  candidateId: string,
  status: string,
  reasons: string[] = [],
  notes?: string,
) {
  await ensurePortraitDatabase();
  await getPortraitDb()
    .prepare(
      `UPDATE portrait_candidates
       SET status = ?, rejection_reasons_json = ?, operator_notes = COALESCE(?, operator_notes), updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      status,
      JSON.stringify(reasons),
      notes ?? null,
      new Date().toISOString(),
      candidateId,
    )
    .run();
}

export async function markCustomerSelected(input: {
  orderId: string;
  candidateId: string;
  positiveReasons: string[];
  negativeReasons: string[];
  freeText: string;
}) {
  await ensurePortraitDatabase();
  const db = getPortraitDb();
  const selected = await db
    .prepare(
      `SELECT id FROM portrait_candidates
       WHERE id = ? AND order_id = ? AND status IN ('selected_for_preview','sent_to_customer')`,
    )
    .bind(input.candidateId, input.orderId)
    .first();
  if (!selected) {
    throw new Error("最终选择必须来自已发送的两张客户预览。");
  }
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `UPDATE portrait_candidates
         SET status = CASE WHEN id = ? THEN 'customer_selected' ELSE status END, updated_at = ?
         WHERE order_id = ?`,
      )
      .bind(input.candidateId, now, input.orderId),
    db
      .prepare(
        `INSERT INTO candidate_feedback
        (id, order_id, candidate_id, source, selected, positive_reasons_json, negative_reasons_json, free_text, created_at)
        VALUES (?, ?, ?, 'customer', 1, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.orderId,
        input.candidateId,
        JSON.stringify(input.positiveReasons),
        JSON.stringify(input.negativeReasons),
        input.freeText || null,
        now,
      ),
    db
      .prepare(
        "UPDATE portrait_orders SET status = 'customer_selected', updated_at = ? WHERE id = ?",
      )
      .bind(now, input.orderId),
  ]);
}

export async function getOrderAssetsForDeletion(orderId: string) {
  await ensurePortraitDatabase();
  return allRows<{
    id: string;
    storage_key: string;
  }>(
    getPortraitDb()
      .prepare(
        "SELECT id, storage_key FROM portrait_assets WHERE order_id = ? AND deleted_at IS NULL",
      )
      .bind(orderId),
  );
}

export async function softDeleteAsset(assetId: string) {
  await ensurePortraitDatabase();
  await getPortraitDb()
    .prepare("UPDATE portrait_assets SET deleted_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), assetId)
    .run();
}

export async function createDnaDraft(styleId: string) {
  await ensurePortraitDatabase();
  const db = getPortraitDb();
  const active = await db
    .prepare(
      "SELECT * FROM portrait_dna_versions WHERE style_id = ? AND status = 'active' ORDER BY published_at DESC LIMIT 1",
    )
    .bind(styleId)
    .first<Record<string, unknown>>();
  if (!active) throw new Error("找不到可复制的 active DNA 版本。");
  const version = `${String(active.version).split(".")[0]}.1-draft`;
  const id = `${styleId}_${crypto.randomUUID()}`;
  await db
    .prepare(
      `INSERT INTO portrait_dna_versions
      (id, style_id, version, status, modules_json, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', ?, ?, ?)`,
    )
    .bind(
      id,
      styleId,
      version,
      String(active.modules_json),
      new Date().toISOString(),
      new Date().toISOString(),
    )
    .run();
  return { id, version };
}
