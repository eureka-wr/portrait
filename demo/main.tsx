import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  Download,
  FileArchive,
  Image as ImageIcon,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRoundCheck,
  X,
} from "lucide-react";
import "../app/globals.css";
import "./demo.css";

type JobStatus =
  | "ready"
  | "generating"
  | "review"
  | "selected"
  | "delivering"
  | "delivered"
  | "failed";

type CandidateStatus = "pending" | "approved" | "rejected" | "selected";

type Candidate = {
  id: string;
  label: string;
  description: string;
  mimeType: string;
  status: CandidateStatus;
  createdAt: string;
  url: string;
};

type PortraitJob = {
  id: string;
  orderNo: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  channel: string;
  notes: string;
  status: JobStatus;
  source: {
    originalName: string;
    mimeType: string;
    width: number;
    height: number;
    sizeBytes: number;
    url: string;
  };
  candidates: Candidate[];
  selectedCandidateId?: string;
  model?: string;
  promptHash?: string;
  delivery?: {
    createdAt: string;
    filename: string;
    url: string;
  };
  error?: string;
};

type SessionStatus = {
  authenticated: boolean;
  configured: {
    access: boolean;
    provider: boolean;
    storage: boolean;
  };
  model: string;
};

const statusLabels: Record<JobStatus, string> = {
  ready: "原图已就绪",
  generating: "正在生成四张照片",
  review: "等待人工审核",
  selected: "最终照片已确定",
  delivering: "正在制作交付包",
  delivered: "交付包已完成",
  failed: "生成未完成",
};

const channelOptions = ["职业主页", "简历 / CV", "小红书", "LinkedIn", "企业官网"];
const jobStorageKey = "catv-portrait-current-job";

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || `请求失败（${response.status}）`);
  }
  return payload;
}

async function getSession() {
  return readJson<SessionStatus>(
    await fetch("/api/session", {
      credentials: "include",
      cache: "no-store",
    }),
  );
}

async function fetchPortraitJob(jobId: string) {
  const payload = await readJson<{ job: PortraitJob }>(
    await fetch(`/api/studio?jobId=${encodeURIComponent(jobId)}`, {
      credentials: "include",
      cache: "no-store",
    }),
  );
  return payload.job;
}

async function compressPhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("请选择 JPEG、PNG 或 WebP 照片。");
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const maxEdge = 2200;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("浏览器无法处理这张照片。");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("照片压缩失败，请更换文件。");
  if (blob.size > 4_000_000) {
    throw new Error("照片处理后仍超过 4MB，请先缩小原图再上传。");
  }
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing">
      <header className="public-nav">
        <a className="brand" href="#top">
          <BrandMark />
          <span>
            <strong>CATV</strong>
            <small>PORTRAIT STUDIO</small>
          </span>
        </a>
        <div className="production-chip">
          <span />
          PRODUCTION BETA
        </div>
        <a
          className="github-link"
          href="https://github.com/eureka-wr/portrait"
          target="_blank"
          rel="noreferrer"
        >
          GitHub <ArrowRight size={15} />
        </a>
      </header>

      <main id="top" className="hero">
        <section className="hero-copy">
          <p className="eyebrow">CATV PORTRAIT STUDIO · PHASE 01</p>
          <h1>
            不用变成别人，
            <br />
            也能看起来更职业。
          </h1>
          <p className="hero-lead">
            上传一张真实照片，生成四种职业形象。每张先经过人工审核，再定稿并下载
            6 种常用规格；原图与结果均存放在私有空间。
          </p>
          <div className="hero-actions">
            <button className="primary large" onClick={onEnter}>
              进入生产工作台 <ArrowRight size={18} />
            </button>
            <span className="price">
              <strong>4 张</strong>
              <small>一次生成 · 人工定稿</small>
            </span>
          </div>
          <div className="trust-row">
            <span>
              <ShieldCheck size={16} /> 身份保持优先
            </span>
            <span>
              <LockKeyhole size={16} /> 照片私有存储
            </span>
            <span>
              <UserRoundCheck size={16} /> 人工审核后交付
            </span>
          </div>
        </section>

        <section className="style-stack" aria-label="四种职业肖像风格">
          {[
            ["01", "静默领导者", "冷灰蓝 · 克制自信"],
            ["02", "国际职业形象", "明亮中性 · 可信亲和"],
            ["03", "高管领导力", "温润棚拍 · 稳定权威"],
            ["04", "创业者工作室", "现代空间 · 自然松弛"],
          ].map(([number, title, detail], index) => (
            <article
              key={number}
              className={`style-card style-${index + 1}`}
              style={{ "--index": index } as React.CSSProperties}
            >
              <span>{number}</span>
              <div className="portrait-placeholder">
                <i />
                <i />
                <i />
              </div>
              <div>
                <strong>{title}</strong>
                <small>{detail}</small>
              </div>
            </article>
          ))}
        </section>
      </main>
      <footer className="public-foot">
        <span>真实模型调用 · 私有资产代理 · 可随时删除整份订单</span>
        <span>CATV PORTRAIT · 2026</span>
      </footer>
    </div>
  );
}

function Login({
  session,
  onAuthenticated,
  onBack,
}: {
  session: SessionStatus;
  onAuthenticated: () => void;
  onBack: () => void;
}) {
  const [accessKey, setAccessKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready =
    session.configured.access &&
    session.configured.provider &&
    session.configured.storage;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await readJson<{ authenticated: boolean }>(
        await fetch("/api/session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessKey }),
        }),
      );
      onAuthenticated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "登录失败。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate-page">
      <button className="back-button" onClick={onBack}>
        <ChevronLeft size={16} /> 返回产品页
      </button>
      <form className="gate-card" onSubmit={submit}>
        <BrandMark />
        <p className="eyebrow">PRIVATE PRODUCTION WORKSPACE</p>
        <h1>进入职业肖像工作台</h1>
        <p>照片和模型费用受访问口令保护。登录会话仅保存在安全 Cookie 中。</p>

        <div className="readiness-list">
          {[
            ["私有图片存储", session.configured.storage],
            ["OpenAI 图像模型", session.configured.provider],
            ["工作台访问口令", session.configured.access],
          ].map(([label, configured]) => (
            <span key={String(label)} className={configured ? "is-ready" : ""}>
              {configured ? <Check size={14} /> : <CircleAlert size={14} />}
              {label}
              <strong>{configured ? "已就绪" : "待配置"}</strong>
            </span>
          ))}
        </div>

        <label>
          工作台访问口令
          <input
            type="password"
            autoComplete="current-password"
            value={accessKey}
            onChange={(event) => setAccessKey(event.target.value)}
            placeholder={ready ? "输入访问口令" : "部署配置尚未完成"}
            disabled={!session.configured.access || busy}
          />
        </label>
        {error && <div className="inline-error">{error}</div>}
        <button
          className="primary"
          disabled={!session.configured.access || !accessKey || busy}
        >
          {busy ? <LoaderCircle className="spin" size={17} /> : <LockKeyhole size={16} />}
          {busy ? "正在验证…" : "安全进入"}
        </button>
        {!ready && (
          <small className="setup-note">
            当前部署还缺少模型或安全配置；配置完成后本页会自动显示为“已就绪”。
          </small>
        )}
      </form>
    </div>
  );
}

function StageRail({ status }: { status: JobStatus }) {
  const current =
    status === "ready" || status === "failed"
      ? 1
      : status === "generating"
        ? 2
        : status === "review"
          ? 3
          : status === "selected" || status === "delivering"
            ? 4
            : 5;
  return (
    <div className="stage-rail">
      {["原图就绪", "四图生成", "人工审核", "最终定稿", "交付下载"].map(
        (label, index) => (
          <div
            key={label}
            className={`stage-node ${index + 1 <= current ? "is-active" : ""}`}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
          </div>
        ),
      )}
    </div>
  );
}

function UploadOrder({
  onCreated,
}: {
  onCreated: (job: PortraitJob) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [channel, setChannel] = useState(channelOptions[0]);
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function choose(selected?: File) {
    if (!selected) return;
    setError("");
    setProgress("正在压缩、校正方向并移除照片元数据…");
    try {
      const compressed = await compressPhoto(selected);
      if (preview) URL.revokeObjectURL(preview);
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
      setProgress(
        `处理完成 · ${(compressed.size / 1024 / 1024).toFixed(2)}MB · 可安全上传`,
      );
    } catch (cause) {
      setFile(null);
      setPreview("");
      setProgress("");
      setError(cause instanceof Error ? cause.message : "照片处理失败。");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !consent) return;
    setBusy(true);
    setError("");
    setProgress("正在上传到私有存储并检查图像…");
    try {
      const form = new FormData();
      form.set("photo", file);
      form.set("customerName", customerName);
      form.set("channel", channel);
      form.set("notes", notes);
      form.set("consentConfirmed", "true");
      const payload = await readJson<{ job: PortraitJob }>(
        await fetch("/api/studio", {
          method: "POST",
          credentials: "include",
          body: form,
        }),
      );
      onCreated(payload.job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "创建订单失败。");
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="upload-layout" onSubmit={submit}>
      <section className="panel upload-panel">
        <div className="panel-kicker">
          <span>SOURCE · PRIVATE</span>
          <LockKeyhole size={15} />
        </div>
        <h1>创建一份职业肖像订单</h1>
        <p className="panel-lead">
          使用正面、清晰、无遮挡的单人照片。自然光或均匀室内光最适合保持身份。
        </p>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => choose(event.target.files?.[0])}
        />
        <button
          type="button"
          className={`dropzone ${preview ? "has-photo" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            choose(event.dataTransfer.files[0]);
          }}
        >
          {preview ? (
            <>
              <img src={preview} alt="待上传原图预览" />
              <span>
                <RefreshCw size={15} /> 更换照片
              </span>
            </>
          ) : (
            <>
              <span className="upload-icon">
                <Upload size={24} />
              </span>
              <strong>点击选择或拖入客户照片</strong>
              <small>JPEG / PNG / WebP · 自动压缩到 4MB 内</small>
            </>
          )}
        </button>
        {progress && <div className="upload-progress">{progress}</div>}
      </section>

      <section className="panel brief-panel">
        <div className="panel-kicker">
          <span>PRODUCTION BRIEF</span>
          <Sparkles size={15} />
        </div>
        <h2>生产信息</h2>
        <div className="form-grid">
          <label>
            客户姓名
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="例如：林小姐"
              maxLength={80}
            />
          </label>
          <label>
            主要用途
            <select value={channel} onChange={(event) => setChannel(event.target.value)}>
              {channelOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="full">
            补充要求
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="可选：行业、职位、着装偏好、希望保留的个人特征。不要填写敏感个人信息。"
              maxLength={600}
            />
          </label>
        </div>
        <label className="consent-row">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <span>
            我确认照片中只有一位主体，已取得本人授权，并同意为其生成职业肖像。
          </span>
        </label>
        {error && <div className="inline-error">{error}</div>}
        <button className="primary create-button" disabled={!file || !consent || busy}>
          {busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}
          {busy ? "正在创建私有订单…" : "创建订单并进入生产"}
        </button>
      </section>
    </form>
  );
}

function GenerationProgress() {
  return (
    <div className="generation-progress">
      <div className="generating-orbit">
        <Sparkles size={22} />
      </div>
      <strong>四种职业形象正在生成</strong>
      <p>身份保持、服装、光线与背景分别处理，通常需要 2–5 分钟。</p>
      <div>
        {["静默领导者", "国际职业形象", "高管领导力", "创业者工作室"].map(
          (label, index) => (
            <span key={label}>
              <LoaderCircle className="spin" size={14} />
              {String(index + 1).padStart(2, "0")} · {label}
            </span>
          ),
        )}
      </div>
      <small>可以保持本页打开；服务端会在完成后保存到私有订单。</small>
    </div>
  );
}

function JobWorkspace({
  job,
  session,
  onJob,
  onClear,
}: {
  job: PortraitJob;
  session: SessionStatus;
  onJob: (job: PortraitJob) => void;
  onClear: () => void;
}) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(
    job.status === "ready" ? "原图已通过技术检查，可以生成四张候选。" : "",
  );
  const [error, setError] = useState("");

  const approvedCount = job.candidates.filter((item) =>
    ["approved", "selected"].includes(item.status),
  ).length;
  const selected = job.candidates.find(
    (item) => item.id === job.selectedCandidateId,
  );

  async function action(
    name: string,
    extra: Record<string, unknown> = {},
    pendingMessage?: string,
  ) {
    setBusy(name);
    setError("");
    if (pendingMessage) setMessage(pendingMessage);
    try {
      const payload = await readJson<{ job: PortraitJob }>(
        await fetch("/api/studio", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: name, jobId: job.id, ...extra }),
        }),
      );
      onJob(payload.job);
      return payload.job;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败。");
      throw cause;
    } finally {
      setBusy("");
    }
  }

  async function removeOrder() {
    const confirmed = window.confirm(
      "确认永久删除这份订单？原图、候选图、交付包和任务记录都会从私有存储中删除。",
    );
    if (!confirmed) return;
    setBusy("delete");
    setError("");
    try {
      await readJson<{ deleted: boolean }>(
        await fetch("/api/studio", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", jobId: job.id }),
        }),
      );
      onClear();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "删除失败。");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="job-head">
        <div>
          <p className="eyebrow">CATV-{job.orderNo}</p>
          <h1>{job.customerName || "未命名客户"} · 职业肖像生产</h1>
          <span>
            {job.channel} · 私有资产 · {session.model}
          </span>
        </div>
        <div className={`status-pill status-${job.status}`}>
          {job.status === "generating" || job.status === "delivering" ? (
            <LoaderCircle className="spin" size={14} />
          ) : (
            <i />
          )}
          {statusLabels[job.status]}
        </div>
      </section>

      <StageRail status={job.status} />

      <div className="job-grid">
        <section className="panel source-summary">
          <div className="panel-kicker">
            <span>SOURCE · PRIVATE</span>
            <LockKeyhole size={15} />
          </div>
          <h2>客户原图</h2>
          <img src={job.source.url} alt="客户原图" />
          <div className="source-facts">
            <span>
              <Check size={14} /> 文件签名与格式通过
            </span>
            <span>
              <Check size={14} /> {job.source.width} × {job.source.height}px
            </span>
            <span>
              <Check size={14} /> EXIF 已移除
            </span>
          </div>
        </section>

        <section className="panel production-panel">
          <div className="panel-kicker">
            <span>GENERATION ORCHESTRATOR</span>
            <Sparkles size={15} />
          </div>
          <h2>四种职业形象</h2>
          <p>
            同一张原图会分别生成静默领导者、国际职业形象、高管领导力和创业者工作室。
            身份保持指令固定在每个 Prompt 首位。
          </p>
          <dl>
            <div>
              <dt>模型</dt>
              <dd>{job.model || session.model}</dd>
            </div>
            <div>
              <dt>输出</dt>
              <dd>1024 × 1536</dd>
            </div>
            <div>
              <dt>质量</dt>
              <dd>High</dd>
            </div>
          </dl>
          {job.notes && (
            <blockquote>
              <strong>生产备注</strong>
              {job.notes}
            </blockquote>
          )}
          {(job.status === "ready" || job.status === "failed") && (
            <button
              className="primary generate-button"
              disabled={busy === "generate" || !session.configured.provider}
              onClick={() =>
                action(
                  "generate",
                  {},
                  "已提交真实模型，正在生成四种形象…",
                ).catch(() => undefined)
              }
            >
              {busy === "generate" ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Sparkles size={17} />
              )}
              {busy === "generate" ? "正在生成，请保持页面打开…" : "生成 4 张真实候选"}
            </button>
          )}
          {job.status === "failed" && (
            <div className="inline-error">{job.error || "上次生成没有完成。"}</div>
          )}
        </section>

        {(job.status === "generating" || busy === "generate") && (
          <section className="panel candidates-panel full-panel">
            <GenerationProgress />
          </section>
        )}

        {job.candidates.length > 0 && (
          <section className="panel candidates-panel full-panel">
            <div className="review-heading">
              <div>
                <div className="panel-kicker">
                  <span>HUMAN REVIEW</span>
                  <UserRoundCheck size={15} />
                </div>
                <h2>人工审核四张候选</h2>
                <p>检查是否像本人、五官和手部是否自然、服装与背景是否符合用途。</p>
              </div>
              <span>{approvedCount} 张已通过</span>
            </div>
            <div className="candidate-grid">
              {job.candidates.map((candidate, index) => (
                <article
                  key={candidate.id}
                  className={`candidate-card is-${candidate.status}`}
                >
                  <div className="candidate-image">
                    <img src={candidate.url} alt={candidate.label} />
                    <span>0{index + 1}</span>
                    {candidate.status === "approved" && (
                      <i className="approval-badge">
                        <Check size={14} /> 已通过
                      </i>
                    )}
                    {candidate.status === "selected" && (
                      <i className="approval-badge selected-badge">
                        <CheckCircle2 size={14} /> 已定稿
                      </i>
                    )}
                    {candidate.status === "rejected" && (
                      <i className="approval-badge rejected-badge">
                        <X size={14} /> 已驳回
                      </i>
                    )}
                  </div>
                  <div className="candidate-copy">
                    <strong>{candidate.label}</strong>
                    <small>{candidate.description}</small>
                  </div>
                  <div className="candidate-actions">
                    {candidate.status === "pending" && (
                      <>
                        <button
                          disabled={Boolean(busy)}
                          onClick={() =>
                            action("review", {
                              candidateId: candidate.id,
                              decision: "approved",
                            }).catch(() => undefined)
                          }
                        >
                          <Check size={14} /> 通过
                        </button>
                        <button
                          className="reject"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            action("review", {
                              candidateId: candidate.id,
                              decision: "rejected",
                            }).catch(() => undefined)
                          }
                        >
                          <X size={14} /> 驳回
                        </button>
                      </>
                    )}
                    {candidate.status === "approved" && (
                      <button
                        className="select-button"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          action("select", { candidateId: candidate.id }).catch(
                            () => undefined,
                          )
                        }
                      >
                        设为最终照片
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {job.status === "review" && (
              <div className="review-footer">
                <span>
                  <ShieldCheck size={15} /> 只有人工通过的照片才能定稿和导出
                </span>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "重新生成会再次调用四次图像模型并产生费用，确认继续吗？",
                      )
                    ) {
                      action("generate").catch(() => undefined);
                    }
                  }}
                  disabled={Boolean(busy)}
                >
                  <RefreshCw size={14} /> 重新生成四张
                </button>
              </div>
            )}
          </section>
        )}

        {selected && (
          <section className="panel delivery-panel full-panel">
            <div className="final-image">
              <img src={selected.url} alt={`最终照片：${selected.label}`} />
            </div>
            <div className="delivery-copy">
              <div className="panel-kicker">
                <span>FINAL DELIVERY</span>
                <FileArchive size={15} />
              </div>
              <h2>{selected.label} · 最终定稿</h2>
              <p>
                交付包会从最终照片生成高清 JPG、高清 PNG、1:1、4:5、简历竖版和网页压缩版。
              </p>
              <div className="format-list">
                {["HD JPG", "HD PNG", "1:1", "4:5", "600×800", "WEB JPG"].map(
                  (format) => (
                    <span key={format}>
                      <Check size={12} /> {format}
                    </span>
                  ),
                )}
              </div>
              {job.delivery ? (
                <a className="primary download-button" href={job.delivery.url}>
                  <Download size={17} /> 下载 {job.delivery.filename}
                </a>
              ) : (
                <button
                  className="primary download-button"
                  disabled={busy === "deliver" || job.status === "delivering"}
                  onClick={() =>
                    action("deliver", {}, "正在生成 6 种交付规格…").catch(
                      () => undefined,
                    )
                  }
                >
                  {busy === "deliver" || job.status === "delivering" ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <FileArchive size={17} />
                  )}
                  {busy === "deliver" || job.status === "delivering"
                    ? "正在打包…"
                    : "生成私有交付包"}
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      {(message || error) && (
        <div className={`activity-bar ${error ? "has-error" : ""}`}>
          {error ? <CircleAlert size={16} /> : <CheckCircle2 size={16} />}
          <strong>{error || message}</strong>
        </div>
      )}

      <div className="privacy-actions">
        <span>
          <LockKeyhole size={14} /> 原图、候选和交付文件均为私有资产
        </span>
        <button onClick={removeOrder} disabled={busy === "delete"}>
          {busy === "delete" ? (
            <LoaderCircle className="spin" size={14} />
          ) : (
            <Trash2 size={14} />
          )}
          删除订单与全部照片
        </button>
      </div>
    </>
  );
}

function Studio({
  session,
  onSession,
  onBack,
}: {
  session: SessionStatus;
  onSession: (session: SessionStatus) => void;
  onBack: () => void;
}) {
  const [job, setJob] = useState<PortraitJob | null>(null);
  const [storedJobId] = useState(() => localStorage.getItem(jobStorageKey));
  const [loadingJob, setLoadingJob] = useState(Boolean(storedJobId));
  const [loadError, setLoadError] = useState("");
  const pollingJobId =
    job && ["generating", "delivering"].includes(job.status) ? job.id : null;

  const updateJob = useCallback((next: PortraitJob) => {
    setJob(next);
    localStorage.setItem(jobStorageKey, next.id);
  }, []);

  useEffect(() => {
    if (!storedJobId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchPortraitJob(storedJobId)
        .then((restored) => {
          if (cancelled) return;
          updateJob(restored);
          setLoadError("");
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          localStorage.removeItem(jobStorageKey);
          setJob(null);
          setLoadError(cause instanceof Error ? cause.message : "订单恢复失败。");
        })
        .finally(() => {
          if (!cancelled) setLoadingJob(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [storedJobId, updateJob]);

  useEffect(() => {
    if (!pollingJobId) return;
    const timer = window.setInterval(() => {
      void fetchPortraitJob(pollingJobId)
        .then(updateJob)
        .catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [pollingJobId, updateJob]);

  async function logout() {
    await fetch("/api/session", {
      method: "DELETE",
      credentials: "include",
    });
    onSession({ ...session, authenticated: false });
  }

  return (
    <div className="studio-shell">
      <aside className="sidebar">
        <button className="sidebar-brand" onClick={onBack}>
          <BrandMark />
          <span>
            <strong>CATV</strong>
            <small>PORTRAIT STUDIO</small>
          </span>
        </button>
        <nav>
          <span>生产</span>
          <button className="is-active">
            <ImageIcon size={17} /> 当前订单
          </button>
          <span>安全</span>
          <div>
            <ShieldCheck size={17} />
            <p>
              <strong>PRIVATE MODE</strong>
              <small>受控读取 · 私有 Blob</small>
            </p>
          </div>
        </nav>
        <div className="sidebar-foot">
          <span>
            <i /> MODEL READY
          </span>
          <small>{session.model}</small>
          <button onClick={logout}>
            <LogOut size={14} /> 退出工作台
          </button>
        </div>
      </aside>

      <div className="studio-main">
        <header className="studio-topbar">
          <span>人工生产空间 · Phase 01</span>
          <div>
            <LockKeyhole size={14} />
            私有会话
            <strong>OPERATOR</strong>
          </div>
        </header>
        <main className="workspace">
          {loadingJob ? (
            <div className="workspace-loading">
              <LoaderCircle className="spin" size={22} /> 正在恢复生产订单…
            </div>
          ) : job ? (
            <JobWorkspace
              job={job}
              session={session}
              onJob={updateJob}
              onClear={() => {
                localStorage.removeItem(jobStorageKey);
                setJob(null);
              }}
            />
          ) : (
            <>
              {loadError && <div className="inline-error load-error">{loadError}</div>}
              <UploadOrder onCreated={updateJob} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState<"landing" | "login" | "studio">("landing");
  const [session, setSession] = useState<SessionStatus | null>(null);

  useEffect(() => {
    getSession().then(setSession).catch(() => undefined);
  }, []);

  async function enter() {
    const latest = await getSession().catch(() => session);
    if (!latest) return;
    setSession(latest);
    setView(latest.authenticated ? "studio" : "login");
  }

  if (view === "landing") return <Landing onEnter={enter} />;
  if (!session) {
    return (
      <div className="page-loading">
        <LoaderCircle className="spin" /> 正在检查生产环境…
      </div>
    );
  }
  if (view === "login") {
    return (
      <Login
        session={session}
        onBack={() => setView("landing")}
        onAuthenticated={async () => {
          const latest = await getSession();
          setSession(latest);
          setView("studio");
        }}
      />
    );
  }
  return (
    <Studio
      session={session}
      onSession={(next) => {
        setSession(next);
        if (!next.authenticated) setView("login");
      }}
      onBack={() => setView("landing")}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
