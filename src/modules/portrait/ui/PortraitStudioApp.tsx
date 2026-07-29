"use client";

import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Clock3,
  Copy,
  Download,
  Eye,
  FileArchive,
  FileImage,
  ImagePlus,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  UsersRound,
  WandSparkles,
  X,
} from "lucide-react";
import { zipSync } from "fflate";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  PortraitCandidate,
  PortraitOrder,
  PortraitStyle,
  StudioState,
} from "../domain/types";

export type StudioView =
  | "dashboard"
  | "orders"
  | "new"
  | "order"
  | "styles"
  | "modules"
  | "settings"
  | "analytics";

type Props = {
  view: StudioView;
  selectedOrderId?: string;
};

const STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: "草稿", tone: "muted" },
  ready_to_generate: { label: "待生成", tone: "blue" },
  generating: { label: "生成中", tone: "violet" },
  awaiting_internal_review: { label: "待内部审核", tone: "amber" },
  preview_ready: { label: "待发预览", tone: "cyan" },
  preview_sent: { label: "预览已发送", tone: "cyan" },
  awaiting_customer_selection: { label: "等待客户选择", tone: "cyan" },
  customer_selected: { label: "客户已选择", tone: "green" },
  finalizing: { label: "最终处理中", tone: "violet" },
  ready_to_deliver: { label: "待交付", tone: "green" },
  completed: { label: "已完成", tone: "muted" },
  cancelled: { label: "已取消", tone: "muted" },
  failed: { label: "异常", tone: "red" },
};

const CANDIDATE_STATUS: Record<string, string> = {
  generated: "已生成",
  quality_failed: "质检警告",
  awaiting_review: "待审核",
  approved: "已通过",
  rejected: "已淘汰",
  selected_for_preview: "客户预览",
  sent_to_customer: "已发客户",
  customer_selected: "客户选中",
  finalized: "已导出",
  delivered: "已交付",
};

const REVIEW_GROUPS = {
  pose: [
    ["face_nearly_frontal", "面部接近正面"],
    ["torso_angle_correct", "躯干角度正确"],
    ["head_level", "头部水平"],
    ["chin_position_correct", "下巴前伸微收"],
    ["shoulders_relaxed", "肩膀放松"],
    ["not_passport_photo", "无证件照感"],
  ],
  gaze: [
    ["direct_eye_contact", "直视镜头"],
    ["stable_gaze", "眼神稳定"],
    ["not_timid", "不怯弱"],
    ["not_overly_soft", "不过柔"],
    ["not_aggressive", "不过凶"],
    ["natural_eye_anatomy", "眼型自然"],
  ],
  presence: [
    ["grounded", "稳定落地"],
    ["credible", "可信"],
    ["professionally_substantial", "职业重量"],
    ["emotionally_stable", "情绪稳定"],
    ["memorable_without_theatricality", "有记忆点但不戏剧化"],
  ],
  hair: [
    ["natural_volume", "发量自然"],
    ["root_lift", "发根支撑"],
    ["realistic_density", "密度真实"],
    ["hairline_preserved", "发际线保持"],
    ["not_flat", "不扁塌"],
    ["not_wig_like", "无假发感"],
  ],
} as const;

const REJECTION_REASONS = [
  ["identity_mismatch", "身份不一致"],
  ["pose_inherited_from_source", "继承原图姿势"],
  ["head_tilt", "头部倾斜"],
  ["passport_photo_composition", "证件照式构图"],
  ["gaze_too_soft", "眼神太柔"],
  ["gaze_timid", "眼神怯弱"],
  ["gaze_aggressive", "眼神过凶"],
  ["weak_presence", "存在感不足"],
  ["flat_hair", "头发扁塌"],
  ["hairline_changed", "发际线改变"],
  ["hair_volume_exaggerated", "发量夸张"],
  ["wig_like_hair", "假发质感"],
  ["eye_artifact", "眼睛伪影"],
  ["teeth_artifact", "牙齿伪影"],
  ["skin_too_smooth", "皮肤过度平滑"],
  ["hair_artifact", "头发伪影"],
  ["wardrobe_artifact", "服装结构错误"],
  ["jewelry_artifact", "首饰伪影"],
  ["pose_unnatural", "姿势不自然"],
  ["expression_unnatural", "表情不自然"],
  ["background_fake", "背景虚假"],
  ["too_beautified", "过度美化"],
  ["age_changed", "年龄改变"],
  ["not_professional", "职业感不足"],
  ["other", "其他"],
] as const;

const NAV = [
  {
    href: "/admin/portrait",
    label: "生产总览",
    view: "dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/portrait/orders",
    label: "全部订单",
    view: "orders",
    icon: Archive,
  },
  {
    href: "/admin/portrait/styles",
    label: "Portrait DNA",
    view: "styles",
    icon: Sparkles,
  },
  {
    href: "/admin/portrait/prompt-modules",
    label: "Prompt 模块",
    view: "modules",
    icon: SlidersHorizontal,
  },
  {
    href: "/admin/portrait/analytics",
    label: "质量与分析",
    view: "analytics",
    icon: BarChart3,
  },
  {
    href: "/admin/portrait/settings",
    label: "生产设置",
    view: "settings",
    icon: Settings,
  },
] as const;

function StatusBadge({ status }: { status: string }) {
  const config = STATUS[status] ?? { label: status, tone: "muted" };
  return (
    <span className={`status-badge status-${config.tone}`}>
      <span className="status-dot" />
      {config.label}
    </span>
  );
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function styleFor(state: StudioState, order: PortraitOrder) {
  return state.styles.find((style) => style.id === order.selectedStyleId);
}

function CandidateArt({
  candidate,
  style,
  source = false,
}: {
  candidate?: PortraitCandidate;
  style?: PortraitStyle;
  source?: boolean;
}) {
  const imageUrl = candidate?.masterAssetId
    ? `/api/portrait/assets/${candidate.masterAssetId}`
    : null;
  return (
    <div
      className={`candidate-art candidate-variant-${candidate?.variant ?? 1} ${source ? "candidate-source" : ""}`}
      style={{ "--style-accent": style?.accent ?? "#9BC4D8" } as React.CSSProperties}
    >
      {imageUrl ? (
        // This authenticated route never reveals an R2 key or permanent URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="私有候选肖像" />
      ) : (
        <div className="portrait-figure" aria-hidden="true">
          <span className="portrait-halo" />
          <span className="portrait-head" />
          <span className="portrait-neck" />
          <span className="portrait-body" />
        </div>
      )}
      <span className="candidate-grain" />
      {source && <span className="source-label">原图仅后台可见</span>}
    </div>
  );
}

function LoadingStudio() {
  return (
    <div className="studio-loading" role="status">
      <div className="loading-brand">
        <span className="brand-mark">
          <span />
          <span />
          <span />
        </span>
        CATV PORTRAIT
      </div>
      <div className="loading-grid">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p>正在连接私有生产空间…</p>
    </div>
  );
}

function EmptyState({
  icon: Icon = FileImage,
  title,
  text,
}: {
  icon?: typeof FileImage;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <Icon size={22} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

async function responseError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error || `请求失败（${response.status}）`;
}

async function imageToBlob(
  url: string,
  width: number,
  height: number,
  options: {
    mime?: string;
    quality?: number;
    watermark?: boolean;
    fit?: "cover" | "contain";
  } = {},
) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(await responseError(response));
  const sourceBlob = await response.blob();
  const objectUrl = URL.createObjectURL(sourceBlob);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("浏览器无法读取这张图片。"));
    image.src = objectUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器不支持图片导出。");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  const contain = options.fit === "contain";
  const drawWidth = contain
    ? sourceRatio > targetRatio
      ? width
      : height * sourceRatio
    : sourceRatio > targetRatio
      ? height * sourceRatio
      : width;
  const drawHeight = contain
    ? sourceRatio > targetRatio
      ? width / sourceRatio
      : height
    : sourceRatio > targetRatio
      ? height
      : width / sourceRatio;
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  if (options.watermark) {
    const padding = Math.max(16, Math.round(width * 0.035));
    const fontSize = Math.max(13, Math.round(width * 0.025));
    context.font = `600 ${fontSize}px Arial, sans-serif`;
    const text = "CATV Portrait · Preview";
    const metrics = context.measureText(text);
    context.fillStyle = "rgba(9, 15, 19, .46)";
    context.fillRect(
      width - metrics.width - padding * 2,
      height - fontSize - padding * 1.7,
      metrics.width + padding * 2,
      fontSize + padding,
    );
    context.fillStyle = "rgba(255,255,255,.82)";
    context.fillText(
      text,
      width - metrics.width - padding,
      height - padding,
    );
  }
  URL.revokeObjectURL(objectUrl);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片导出失败。"))),
      options.mime ?? "image/jpeg",
      options.quality ?? 0.88,
    ),
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function DashboardView({
  state,
  openOrder,
}: {
  state: StudioState;
  openOrder: (id: string) => void;
}) {
  const metrics = [
    {
      label: "今日新增",
      value: state.stats.today,
      detail: "人工接单",
      icon: Plus,
      tone: "ice",
    },
    {
      label: "待生成",
      value: state.stats.readyToGenerate,
      detail: "原图已就绪",
      icon: WandSparkles,
      tone: "violet",
    },
    {
      label: "待审核",
      value: state.stats.awaitingReview,
      detail: "必须人工确认",
      icon: Eye,
      tone: "amber",
    },
    {
      label: "等待客户",
      value: state.stats.awaitingCustomer,
      detail: "两张预览",
      icon: MessageSquareText,
      tone: "cyan",
    },
    {
      label: "待交付",
      value: state.stats.readyToDeliver,
      detail: "高清包已准备",
      icon: PackageCheck,
      tone: "green",
    },
  ];
  const activeOrders = state.orders.filter(
    (order) => !["completed", "cancelled"].includes(order.status),
  );
  return (
    <div className="view-stack">
      <section className="hero-strip">
        <div>
          <div className="eyebrow">PORTRAIT PRODUCTION · PHASE 01</div>
          <h1>
            今天的肖像，
            <br />
            从这里完成。
          </h1>
          <p>
            每一张客户可见图片都经过人工审核。系统负责版本、资产和流程，
            判断仍由运营人员完成。
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button button-primary" href="/admin/portrait/orders/new">
            <Plus size={17} /> 创建一单
          </Link>
          <a className="button button-ghost" href="/portrait" target="_blank">
            查看对外页面 <ArrowRight size={15} />
          </a>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="metric-grid">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <div className={`metric-card metric-${tone}`} key={label}>
            <div className="metric-icon">
              <Icon size={17} />
            </div>
            <span>{label}</span>
            <strong>{String(value).padStart(2, "0")}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="panel panel-grow">
          <div className="panel-header">
            <div>
              <div className="eyebrow">LIVE QUEUE</div>
              <h2>正在生产</h2>
            </div>
            <Link className="text-link" href="/admin/portrait/orders">
              全部订单 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="order-stack">
            {activeOrders.length ? (
              activeOrders.slice(0, 6).map((order) => {
                const style = styleFor(state, order);
                const orderCandidates = state.candidates.filter(
                  (candidate) => candidate.orderId === order.id,
                );
                return (
                  <button
                    className="queue-row"
                    key={order.id}
                    onClick={() => openOrder(order.id)}
                  >
                    <span
                      className="style-swatch"
                      style={{ background: style?.accent }}
                    />
                    <span className="queue-main">
                      <strong>{order.customerNickname || "未命名客户"}</strong>
                      <small>
                        {order.orderNumber} · {style?.publicNameZh}
                      </small>
                    </span>
                    <span className="queue-count">
                      {orderCandidates.length || "—"}
                      <small>候选</small>
                    </span>
                    <StatusBadge status={order.status} />
                    <ChevronRight size={16} />
                  </button>
                );
              })
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="生产队列已清空"
                text="新订单会出现在这里。"
              />
            )}
          </div>
        </div>

        <aside className="panel production-health">
          <div className="panel-header">
            <div>
              <div className="eyebrow">SYSTEM</div>
              <h2>生产健康度</h2>
            </div>
            <Activity size={18} />
          </div>
          <div className="health-score">
            <strong>96</strong>
            <span>/100</span>
          </div>
          <div className="health-line">
            <span>Provider</span>
            <strong className={state.config.providerConfigured ? "ok" : ""}>
              {state.config.providerConfigured ? "OpenAI 已连接" : "Mock 模式"}
            </strong>
          </div>
          <div className="health-line">
            <span>平均处理时间</span>
            <strong>{state.stats.averageHours} 小时</strong>
          </div>
          <div className="health-line">
            <span>人工审核</span>
            <strong className="ok">强制开启</strong>
          </div>
          <div className="privacy-callout compact">
            <ShieldCheck size={17} />
            <p>
              客户照片默认私有，不用于训练；已完成订单将在{" "}
              {state.config.completedRetentionDays} 天后清理图片。
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function OrdersView({
  state,
  openOrder,
}: {
  state: StudioState;
  openOrder: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = state.orders.filter((order) => {
    const style = styleFor(state, order);
    const matches =
      !query ||
      order.orderNumber.toLowerCase().includes(query.toLowerCase()) ||
      order.customerNickname?.toLowerCase().includes(query.toLowerCase()) ||
      style?.publicNameZh.includes(query);
    return matches && (status === "all" || order.status === status);
  });
  return (
    <div className="view-stack">
      <div className="view-heading">
        <div>
          <div className="eyebrow">ORDER CONTROL</div>
          <h1>全部订单</h1>
          <p>从接单到交付，所有状态和资产都有可追踪记录。</p>
        </div>
        <Link className="button button-primary" href="/admin/portrait/orders/new">
          <Plus size={17} /> 创建订单
        </Link>
      </div>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索订单号、客户或风格"
          />
        </label>
        <label className="select-field">
          <SlidersHorizontal size={16} />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">全部状态</option>
            {Object.entries(STATUS).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </label>
        <span className="result-count">{filtered.length} 单</span>
      </div>
      <div className="panel table-panel">
        <div className="orders-table orders-table-head">
          <span>订单</span>
          <span>客户 / 渠道</span>
          <span>风格 DNA</span>
          <span>进度</span>
          <span>金额</span>
          <span />
        </div>
        {filtered.map((order) => {
          const style = styleFor(state, order);
          const candidateCount = state.candidates.filter(
            (candidate) => candidate.orderId === order.id,
          ).length;
          return (
            <button
              className="orders-table orders-table-row"
              key={order.id}
              onClick={() => openOrder(order.id)}
            >
              <span className="order-number-cell">
                <strong>{order.orderNumber}</strong>
                <small>{formatDate(order.createdAt, true)}</small>
              </span>
              <span>
                <strong>{order.customerNickname || "未命名"}</strong>
                <small>{order.sourceChannel}</small>
              </span>
              <span className="dna-cell">
                <i style={{ background: style?.accent }} />
                <span>
                  <strong>{style?.publicNameZh}</strong>
                  <small>v{order.selectedStyleVersion}</small>
                </span>
              </span>
              <span>
                <StatusBadge status={order.status} />
                <small>{candidateCount} 张候选</small>
              </span>
              <span>
                <strong>¥{(order.priceFen / 100).toFixed(1)}</strong>
                <small>{order.paymentStatus === "paid" ? "已付款" : "待确认"}</small>
              </span>
              <span className="row-action">
                <ChevronRight size={17} />
              </span>
            </button>
          );
        })}
        {!filtered.length && (
          <EmptyState
            icon={Search}
            title="没有匹配订单"
            text="换一个关键词或状态试试。"
          />
        )}
      </div>
    </div>
  );
}

function NewOrderView({
  state,
  onCreated,
}: {
  state: StudioState;
  onCreated: (id: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    if (file) form.set("sourceImage", file);
    const response = await fetch("/api/portrait/orders", {
      method: "POST",
      body: form,
    });
    setBusy(false);
    if (!response.ok) {
      setError(await responseError(response));
      return;
    }
    const body = (await response.json()) as { orderId: string };
    onCreated(body.orderId);
  }

  return (
    <div className="view-stack">
      <div className="view-heading">
        <div>
          <div className="eyebrow">NEW PRODUCTION ORDER</div>
          <h1>创建一单</h1>
          <p>把客户沟通记录和原图一起放进生产流程。</p>
        </div>
        <Link className="button button-ghost" href="/admin/portrait/orders">
          <X size={16} /> 取消
        </Link>
      </div>
      <form className="new-order-layout" onSubmit={submit}>
        <div className="panel form-panel">
          <div className="section-heading">
            <span>01</span>
            <div>
              <h2>客户与订单</h2>
              <p>第一阶段只记录人工接单所需信息。</p>
            </div>
          </div>
          <div className="form-grid">
            <label>
              <span>客户昵称</span>
              <input name="customerNickname" placeholder="例如：林小姐" required />
            </label>
            <label>
              <span>来源渠道</span>
              <select name="sourceChannel" defaultValue="xiaohongshu">
                <option value="xiaohongshu">小红书</option>
                <option value="wechat">微信</option>
                <option value="catv">CATV</option>
                <option value="manual">人工录入</option>
                <option value="other">其他</option>
              </select>
            </label>
            <label className="form-wide">
              <span>联系方式备注</span>
              <input
                name="customerContactNote"
                placeholder="仅记录必要的联系线索，不保存平台敏感凭证"
              />
            </label>
            <label>
              <span>付款状态</span>
              <select name="paymentStatus" defaultValue="paid">
                <option value="paid">已付款</option>
                <option value="unpaid">待付款</option>
                <option value="not_required">无需付款</option>
                <option value="refunded">已退款</option>
              </select>
            </label>
            <label>
              <span>价格（分）</span>
              <input name="priceFen" type="number" defaultValue="990" min="0" />
            </label>
            <label className="form-wide">
              <span>客户要求</span>
              <textarea
                name="customerRequirements"
                placeholder="例如：用于产品负责人主页，希望自然、不要过度修图"
                rows={3}
              />
            </label>
            <label className="form-wide">
              <span>内部备注</span>
              <textarea
                name="internalNotes"
                placeholder="只对运营人员可见"
                rows={2}
              />
            </label>
          </div>
        </div>

        <div className="panel form-panel">
          <div className="section-heading">
            <span>02</span>
            <div>
              <h2>选择 Signature 风格</h2>
              <p>新订单绑定当前 active DNA v2.0；旧订单继续锁定原版本。</p>
            </div>
          </div>
          <div className="style-radio-grid">
            {state.styles.map((style, index) => (
              <label className="style-radio" key={style.id}>
                <input
                  type="radio"
                  name="styleId"
                  value={style.id}
                  defaultChecked={index === 0}
                />
                <span
                  className="style-radio-art"
                  style={{ "--style-accent": style.accent } as React.CSSProperties}
                >
                  <i />
                  <b>{String(index + 1).padStart(2, "0")}</b>
                </span>
                <span className="style-radio-copy">
                  <strong>{style.publicNameZh}</strong>
                  <small>{style.publicName}</small>
                  <em>{style.traits.join(" · ")}</em>
                </span>
                <Check className="radio-check" size={15} />
              </label>
            ))}
          </div>
        </div>

        <div className="panel form-panel">
          <div className="section-heading">
            <span>03</span>
            <div>
              <h2>客户原图</h2>
              <p>仅用于当前订单，默认私有，到期可物理删除。</p>
            </div>
          </div>
          <label className={`upload-zone ${preview ? "has-preview" : ""}`}>
            <input
              type="file"
              name="sourceImage"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                if (preview) URL.revokeObjectURL(preview);
                setFile(next);
                setPreview(next ? URL.createObjectURL(next) : null);
              }}
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="待上传原图预览" />
            ) : (
              <span className="upload-icon">
                <Upload size={24} />
              </span>
            )}
            <strong>{file ? file.name : "拖入或选择一张清晰照片"}</strong>
            <small>JPG / PNG / WebP · 最大 15MB · 建议单人正脸</small>
          </label>
          <div className="privacy-callout">
            <LockKeyhole size={18} />
            <p>
              不公开、不用于训练、不建立人脸数据库。系统只保存生产所需图片与版本记录。
            </p>
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-submit-bar">
          <div>
            <strong>创建后进入「待生成」</strong>
            <small>你可以先编译并复制 Prompt，再决定自动生成或手工生成。</small>
          </div>
          <button className="button button-primary button-large" disabled={busy}>
            {busy ? <RefreshCw className="spin" size={17} /> : <ArrowRight size={17} />}
            {busy ? "正在创建…" : "创建并进入工作台"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PromptPanel({
  state,
  order,
  runAction,
  busy,
  notify,
}: {
  state: StudioState;
  order: PortraitOrder;
  runAction: (payload: Record<string, unknown>, message?: string) => Promise<void>;
  busy: string;
  notify: (message: string) => void;
}) {
  const prompt = state.prompts.find(
    (item) =>
      item.portraitDNAId === order.selectedStyleId &&
      state.candidates.some(
        (candidate) =>
          candidate.orderId === order.id &&
          candidate.compiledPromptId === item.id,
      ),
  ) ??
    state.prompts.find((item) =>
      state.audits.some(
        (audit) =>
          audit.orderId === order.id &&
          audit.action === "compile_prompt" &&
          audit.resourceId === item.id,
      ),
    );
  async function copyPrompt() {
    if (!prompt) return;
    await navigator.clipboard.writeText(
      `${prompt.positivePrompt}\n\nNEGATIVE RULES:\n${prompt.negativePrompt}`,
    );
    await runAction({
      action: "copy_prompt",
      orderId: order.id,
      candidateId: prompt.id,
    });
    notify("完整 Prompt 已复制，可用于外部图像编辑工具。");
  }
  return (
    <section className="panel work-panel prompt-panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">PROMPT TRACE</div>
          <h2>结构化 Prompt</h2>
        </div>
        <span className="version-chip">
          DNA {order.selectedStyleVersion} · Engine{" "}
          {prompt?.engineVersion ?? order.selectedStyleVersion} · Compiler{" "}
          {prompt?.compilerVersion ?? (order.selectedStyleVersion === "2.0" ? "2.0.0" : "1.0.0")}
        </span>
      </div>
      {prompt ? (
        <>
          <div className="prompt-code">
            <div className="prompt-code-head">
              <span>
                <CheckCircle2 size={14} /> Identity 排在第一位
              </span>
              <span>
                Negative 最后一位 · {prompt.moduleOrder.length} 模块
              </span>
              <code>sha256:{prompt.checksum.slice(0, 12)}</code>
            </div>
            <pre>{prompt.positivePrompt}</pre>
            <details>
              <summary>查看 Negative Rules</summary>
              <pre>{prompt.negativePrompt}</pre>
            </details>
          </div>
          <div className="inline-actions">
            <button className="button button-primary" onClick={copyPrompt}>
              <Copy size={16} /> 复制完整 Prompt
            </button>
            <span className="safe-note">
              生成后不可静默修改 · {Object.keys(prompt.moduleVersions).length} 个模块版本
            </span>
          </div>
        </>
      ) : (
        <div className="prompt-empty">
          <div>
            <Clipboard size={23} />
            <strong>尚未编译</strong>
            <p>编译不会调用模型，也不会产生费用。</p>
          </div>
          <button
            className="button button-primary"
            disabled={busy === "compile"}
            onClick={() =>
              runAction(
                { action: "compile", orderId: order.id },
                "Prompt 已编译并锁定版本。",
              )
            }
          >
            <Sparkles size={16} /> 编译 Prompt
          </button>
        </div>
      )}
    </section>
  );
}

function CandidateCard({
  candidate,
  style,
  runAction,
  busy,
}: {
  candidate: PortraitCandidate;
  style?: PortraitStyle;
  runAction: (payload: Record<string, unknown>, message?: string) => Promise<void>;
  busy: string;
}) {
  const [reviewChecklist, setReviewChecklist] = useState(
    candidate.reviewChecklist,
  );
  const [rejectionReason, setRejectionReason] = useState(
    candidate.rejectionReasons[0] ?? "other",
  );
  const isSelected = [
    "selected_for_preview",
    "sent_to_customer",
    "customer_selected",
    "finalized",
    "delivered",
  ].includes(candidate.status);
  const canReview = ["awaiting_review", "quality_failed", "approved"].includes(
    candidate.status,
  );
  return (
    <article className={`candidate-card ${isSelected ? "is-preview" : ""}`}>
      <div className="candidate-image-wrap">
        <CandidateArt candidate={candidate} style={style} />
        <div className="candidate-topline">
          <span>#{String(candidate.variant).padStart(2, "0")}</span>
          <span className={`candidate-state state-${candidate.status}`}>
            {CANDIDATE_STATUS[candidate.status]}
          </span>
        </div>
        {isSelected && (
          <span className="preview-pick">
            <Check size={13} /> 预览
          </span>
        )}
      </div>
      <div className="candidate-meta">
        <div>
          <span>质量评分</span>
          <strong>{candidate.qualityScore ?? "—"}</strong>
        </div>
        <div>
          <span>Provider</span>
          <strong>{candidate.providerName.replace("_api", "")}</strong>
        </div>
      </div>
      {canReview && (
        <details className="candidate-review">
          <summary>Pose · Gaze · Presence · Hair 审核</summary>
          <div className="review-groups">
            {Object.entries(REVIEW_GROUPS).map(([group, items]) => (
              <fieldset key={group}>
                <legend>{group === "hair" ? "Hair & Grooming" : group}</legend>
                {items.map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={Boolean(
                        reviewChecklist[group as keyof typeof reviewChecklist]?.[
                          key
                        ],
                      )}
                      onChange={(event) =>
                        setReviewChecklist((current) => ({
                          ...current,
                          [group]: {
                            ...current[group as keyof typeof current],
                            [key]: event.target.checked,
                          },
                        }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <label className="rejection-select">
            <span>淘汰原因</span>
            <select
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
            >
              {REJECTION_REASONS.map(([value, label]) => (
                <option value={value} key={value}>
                  {label} · {value}
                </option>
              ))}
            </select>
          </label>
        </details>
      )}
      <div className="candidate-actions">
        {canReview && candidate.status !== "approved" && (
          <button
            className="icon-action is-approve"
            title="通过"
            disabled={busy === candidate.id}
            onClick={() =>
              runAction(
                {
                  action: "approve_candidate",
                  candidateId: candidate.id,
                  reviewChecklist,
                },
                "候选图已通过内部审核。",
              )
            }
          >
            <Check size={15} /> 通过
          </button>
        )}
        {canReview && (
          <button
            className="icon-action is-reject"
            title="淘汰"
            disabled={busy === candidate.id}
            onClick={() =>
              runAction(
                {
                  action: "reject_candidate",
                  candidateId: candidate.id,
                  reasons: [rejectionReason],
                  reviewChecklist,
                },
                `候选图已淘汰：${rejectionReason}。`,
              )
            }
          >
            <X size={15} /> 淘汰
          </button>
        )}
        {!["rejected", "quality_failed", "customer_selected", "finalized", "delivered"].includes(
          candidate.status,
        ) && (
          <button
            className={`icon-action ${isSelected ? "is-selected" : ""}`}
            title="选择客户预览"
            disabled={busy === candidate.id}
            onClick={() =>
              runAction(
                { action: "toggle_preview", candidateId: candidate.id },
                isSelected ? "已取消客户预览。" : "已加入客户预览。",
              )
            }
          >
            <ImagePlus size={15} /> {isSelected ? "取消预览" : "选为预览"}
          </button>
        )}
      </div>
    </article>
  );
}

function OrderWorkspace({
  state,
  order,
  refresh,
  notify,
}: {
  state: StudioState;
  order: PortraitOrder;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [provider, setProvider] = useState(state.config.provider);
  const [debugScenario, setDebugScenario] = useState("success");
  const [customerPick, setCustomerPick] = useState("");
  const [feedback, setFeedback] = useState("");
  const [refinement, setRefinement] = useState("");
  const style = styleFor(state, order);
  const candidates = state.candidates.filter(
    (candidate) => candidate.orderId === order.id,
  );
  const sourceAsset = state.assets.find(
    (asset) =>
      asset.orderId === order.id &&
      asset.kind === "source" &&
      !asset.deletedAt,
  );
  const previews = candidates.filter((candidate) =>
    [
      "selected_for_preview",
      "sent_to_customer",
      "customer_selected",
      "finalized",
      "delivered",
    ].includes(candidate.status),
  );
  const selectedCandidate = candidates.find((candidate) =>
    ["customer_selected", "finalized", "delivered"].includes(candidate.status),
  );
  const orderAudits = state.audits.filter(
    (audit) => audit.orderId === order.id,
  );
  const latestJob = state.jobs.find((job) => job.orderId === order.id);
  const promptExists = state.prompts.some(
    (prompt) =>
      state.audits.some(
        (audit) =>
          audit.orderId === order.id &&
          audit.action === "compile_prompt" &&
          audit.resourceId === prompt.id,
      ) ||
      candidates.some(
        (candidate) =>
          candidate.orderId === order.id &&
          candidate.compiledPromptId === prompt.id,
      ),
  );

  const runAction = useCallback(
    async (payload: Record<string, unknown>, message?: string) => {
      const key = String(payload.candidateId || payload.action);
      setBusy(key);
      setError("");
      const response = await fetch("/api/portrait/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setBusy("");
      if (!response.ok) {
        setError(await responseError(response));
        return;
      }
      const body = (await response.json()) as { message?: string };
      notify(message || body.message || "操作已完成。");
      await refresh();
    },
    [notify, refresh],
  );

  async function uploadManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("manual");
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("action", "manual_upload");
    form.set("orderId", order.id);
    const response = await fetch("/api/portrait/action", {
      method: "POST",
      body: form,
    });
    setBusy("");
    if (!response.ok) {
      setError(await responseError(response));
      return;
    }
    notify("手工生成结果已进入候选审核。");
    event.currentTarget.reset();
    await refresh();
  }

  async function downloadPreviews() {
    const usable = previews.filter((candidate) => candidate.masterAssetId);
    if (usable.length !== 2) {
      setError("请先正好选择两张带有实际图片资产的候选。");
      return;
    }
    setBusy("preview-download");
    for (const [index, candidate] of usable.entries()) {
      const blob = await imageToBlob(
        `/api/portrait/assets/${candidate.masterAssetId}`,
        512,
        640,
        { watermark: state.config.watermarkEnabled, quality: 0.84 },
      );
      downloadBlob(blob, `${order.orderNumber}-preview-${index + 1}.jpg`);
    }
    await runAction(
      { action: "preview_sent", orderId: order.id },
      "两张带预览保护的小图已下载，并记录为已发送。",
    );
  }

  async function exportFinal() {
    if (!selectedCandidate?.masterAssetId) {
      setError("选中候选没有可用高清母图。");
      return;
    }
    setBusy("export");
    setError("");
    try {
      const url = `/api/portrait/assets/${selectedCandidate.masterAssetId}`;
      const specs = [
        ["CATV-HD-Master.jpg", 2048, 2731, "image/jpeg", 0.94, "contain"],
        ["CATV-HD-Master.png", 2048, 2731, "image/png", 1, "contain"],
        ["CATV-Square-1200.jpg", 1200, 1200, "image/jpeg", 0.9, "cover"],
        ["CATV-Portrait-4x5.jpg", 1200, 1500, "image/jpeg", 0.9, "cover"],
        ["CATV-Resume-900x1200.jpg", 900, 1200, "image/jpeg", 0.9, "cover"],
        ["CATV-White-Background.jpg", 1200, 1500, "image/jpeg", 0.92, "contain"],
        ["CATV-Compressed.jpg", 900, 1200, "image/jpeg", 0.84, "contain"],
      ] as const;
      const files: Record<string, Uint8Array> = {};
      for (const [name, width, height, mime, quality, fit] of specs) {
        const blob = await imageToBlob(url, width, height, {
          mime,
          quality,
          fit,
        });
        files[name] = new Uint8Array(await blob.arrayBuffer());
      }
      const zip = zipSync(files, { level: 6 });
      downloadBlob(
        new Blob([zip], { type: "application/zip" }),
        `${order.orderNumber}-CATV-Portrait.zip`,
      );
      await runAction(
        {
          action: "export_final",
          orderId: order.id,
          candidateId: selectedCandidate.id,
        },
        "高清交付包已导出：无水印、无 EXIF、含 7 种常用规格。",
      );
    } catch (exportError) {
      setBusy("");
      setError(
        exportError instanceof Error ? exportError.message : "导出失败。",
      );
    }
  }

  return (
    <div className="view-stack order-workspace">
      <div className="order-breadcrumb">
        <Link href="/admin/portrait/orders">全部订单</Link>
        <ChevronRight size={13} />
        <span>{order.orderNumber}</span>
      </div>
      <section className="order-hero">
        <div className="order-title">
          <span
            className="style-swatch large"
            style={{ background: style?.accent }}
          />
          <div>
            <div className="eyebrow">{order.orderNumber}</div>
            <h1>{order.customerNickname || "未命名客户"}</h1>
            <p>
              {style?.publicNameZh} · DNA v{order.selectedStyleVersion} ·{" "}
              {order.sourceChannel}
            </p>
          </div>
        </div>
        <div className="order-hero-side">
          <StatusBadge status={order.status} />
          <span>负责人 · {order.assignedOperatorId?.split("@")[0]}</span>
        </div>
      </section>
      <div className="workflow-rail" aria-label="生产流程">
        {[
          ["01", "原图", Boolean(sourceAsset) || order.id === "order_demo_001"],
          ["02", "Prompt", promptExists],
          ["03", "候选", candidates.length > 0],
          ["04", "预览", previews.length === 2],
          ["05", "选择", Boolean(selectedCandidate)],
          ["06", "交付", ["ready_to_deliver", "completed"].includes(order.status)],
        ].map(([number, label, done]) => (
          <span className={done ? "done" : ""} key={String(number)}>
            <b>{String(number)}</b>
            {String(label)}
          </span>
        ))}
      </div>
      {error && (
        <div className="inline-error">
          <AlertTriangle size={17} />
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      <div className="workspace-two-col">
        <section className="panel work-panel source-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">SOURCE · PRIVATE</div>
              <h2>客户原图</h2>
            </div>
            <LockKeyhole size={17} />
          </div>
          <div className="source-content">
            {sourceAsset ? (
              <div className="source-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/portrait/assets/${sourceAsset.id}`}
                  alt="客户私有原图"
                />
                <span>PRIVATE</span>
              </div>
            ) : (
              <CandidateArt style={style} source />
            )}
            <div className="analysis-list">
              <div>
                <CheckCircle2 size={15} />
                <span>格式与文件签名</span>
                <strong>通过</strong>
              </div>
              <div>
                <CheckCircle2 size={15} />
                <span>主脸数量</span>
                <strong>1 · 人工确认</strong>
              </div>
              <div>
                <CheckCircle2 size={15} />
                <span>曝光与清晰度</span>
                <strong>可生成</strong>
              </div>
              <div className="analysis-warning">
                <AlertTriangle size={15} />
                <span>Mock Analyzer</span>
                <strong>不可作身份判断</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="panel work-panel dna-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">PORTRAIT DNA</div>
              <h2>{style?.publicNameZh}</h2>
            </div>
            <span className="version-chip active">
              ACTIVE · Engine {style?.engineVersion} · v{order.selectedStyleVersion}
            </span>
          </div>
          <p className="dna-description">{style?.description}</p>
          <div className="trait-row">
            {style?.traits.map((trait) => <span key={trait}>{trait}</span>)}
          </div>
          <div className="dna-meta-grid">
            <div>
              <span>模块</span>
              <strong>{Object.keys(style?.modules ?? {}).length}</strong>
            </div>
            <div>
              <span>身份保持</span>
              <strong>强制首位</strong>
            </div>
            <div>
              <span>绑定策略</span>
              <strong>版本锁定</strong>
            </div>
          </div>
        </section>
      </div>

      <PromptPanel
        state={state}
        order={order}
        runAction={runAction}
        busy={busy}
        notify={notify}
      />

      <section className="panel work-panel generation-panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">GENERATION ORCHESTRATOR</div>
            <h2>生成任务</h2>
          </div>
          {latestJob && (
            <span className="job-status">
              <Activity size={14} /> {latestJob.status}
            </span>
          )}
        </div>
        <div className="generation-controls">
          <div className="provider-choice">
            <label>
              <span>Provider</span>
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              >
                <option value="mock">Mock Portrait Provider</option>
                <option
                  value="openai"
                  disabled={!state.config.providerConfigured}
                >
                  OpenAI Image API{" "}
                  {state.config.providerConfigured ? "" : "· 未配置"}
                </option>
              </select>
            </label>
            {typeof window !== "undefined" &&
              ["localhost", "127.0.0.1"].includes(location.hostname) && (
                <label className="debug-control">
                  <span>开发模拟</span>
                  <select
                    value={debugScenario}
                    onChange={(event) => setDebugScenario(event.target.value)}
                  >
                    <option value="success">成功 · 4 张</option>
                    <option value="partial">部分成功 · 2 张</option>
                    <option value="timeout">Provider 超时</option>
                    <option value="quality_failure">一张质检失败</option>
                    <option value="storage_failure">存储失败</option>
                    <option value="batch_failure">整批失败</option>
                  </select>
                </label>
              )}
          </div>
          <button
            className="button button-primary button-large"
            disabled={busy === "generate" || order.status === "generating"}
            onClick={() =>
              runAction({
                action: "generate",
                orderId: order.id,
                provider,
                debugScenario,
              })
            }
          >
            {busy === "generate" ? (
              <RefreshCw className="spin" size={17} />
            ) : (
              <WandSparkles size={17} />
            )}
            {busy === "generate" ? "任务运行中…" : "生成 4 张候选"}
          </button>
        </div>
        <div className="generation-divider">
          <span>或使用外部工具</span>
        </div>
        <form className="manual-upload-row" onSubmit={uploadManual}>
          <label>
            <input
              name="candidateImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
            <Upload size={16} />
            <span>选择外部生成图片</span>
          </label>
          <input
            name="externalTool"
            placeholder="工具 / 模型备注（不填敏感信息）"
          />
          <button className="button button-ghost" disabled={busy === "manual"}>
            上传为候选
          </button>
        </form>
      </section>

      <section className="panel work-panel candidates-section">
        <div className="panel-header">
          <div>
            <div className="eyebrow">INTERNAL REVIEW</div>
            <h2>候选审核</h2>
          </div>
          <span className="candidate-summary">
            {candidates.filter((item) => item.status !== "rejected").length} 可用 /{" "}
            {candidates.length} 总计
          </span>
        </div>
        {candidates.length ? (
          <div className="candidate-grid">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                style={style}
                runAction={runAction}
                busy={busy}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={WandSparkles}
            title="还没有候选图"
            text="先编译 Prompt，再运行 Mock、真实 Provider 或上传外部结果。"
          />
        )}
        <div className="human-review-note">
          <ShieldCheck size={18} />
          <span>
            自动分数只提供辅助。身份一致、眼睛、牙齿、皮肤、头发和服装都必须由人检查。
          </span>
        </div>
      </section>

      <section className="panel work-panel preview-section">
        <div className="panel-header">
          <div>
            <div className="eyebrow">CUSTOMER PREVIEW</div>
            <h2>两张客户预览</h2>
          </div>
          <span className={previews.length === 2 ? "limit-ok" : "limit-count"}>
            {previews.length} / 2
          </span>
        </div>
        <div className="preview-layout">
          <div className="preview-slots">
            {[0, 1].map((index) =>
              previews[index] ? (
                <div className="preview-slot is-filled" key={index}>
                  <CandidateArt candidate={previews[index]} style={style} />
                  <span className="watermark-demo">CATV Portrait · Preview</span>
                  <strong>预览 {index + 1}</strong>
                </div>
              ) : (
                <div className="preview-slot" key={index}>
                  <Plus size={20} />
                  <span>从候选中选择</span>
                </div>
              ),
            )}
          </div>
          <div className="preview-actions">
            <div className="preview-spec">
              <span>长边</span>
              <strong>640 px</strong>
              <span>格式</span>
              <strong>JPG · EXIF 清除</strong>
              <span>保护</span>
              <strong>半透明预览标识</strong>
            </div>
            <button
              className="button button-primary"
              disabled={previews.length !== 2 || busy === "preview-download"}
              onClick={downloadPreviews}
            >
              <Download size={16} /> 下载两张并标记已发送
            </button>
            <button
              className="button button-ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `你好，${order.customerNickname || ""}！这是 CATV Portrait 为你制作的两张职业肖像预览。请回复 1 或 2 选择最终版本；选定后我们会交付高清无水印大图、1:1 头像版、简历竖版和白底版本。`,
                );
                notify("客户沟通文案已复制。");
              }}
            >
              <MessageSquareText size={16} /> 复制沟通文案
            </button>
          </div>
        </div>
      </section>

      <section className="workspace-two-col">
        <div className="panel work-panel selection-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">CUSTOMER DECISION</div>
              <h2>记录客户选择</h2>
            </div>
            <UsersRound size={17} />
          </div>
          {previews.length ? (
            <div className="selection-form">
              <div className="selection-radios">
                {previews.slice(0, 2).map((candidate, index) => (
                  <label key={candidate.id}>
                    <input
                      type="radio"
                      name="customerPick"
                      value={candidate.id}
                      checked={
                        customerPick === candidate.id ||
                        candidate.status === "customer_selected"
                      }
                      onChange={() => setCustomerPick(candidate.id)}
                      disabled={Boolean(selectedCandidate)}
                    />
                    <span>预览 {index + 1}</span>
                    <Check size={14} />
                  </label>
                ))}
              </div>
              <label>
                <span>选择理由</span>
                <select defaultValue="looks_most_like_me" id="positiveReason">
                  <option value="looks_most_like_me">最像本人</option>
                  <option value="more_natural">更自然</option>
                  <option value="more_confident">更自信</option>
                  <option value="stronger_presence">存在感更强</option>
                  <option value="better_eye_contact">眼神更好</option>
                  <option value="more_professional">更职业</option>
                  <option value="better_posture">姿态更好</option>
                  <option value="better_hair">头发更好</option>
                  <option value="better_expression">表情更好</option>
                  <option value="better_wardrobe">服装更合适</option>
                  <option value="better_background">背景更合适</option>
                  <option value="other">其他</option>
                </select>
              </label>
              <label>
                <span>客户原话 / 修改意见</span>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="例如：选择 2，更像本人，希望肩膀再放松一点"
                  disabled={Boolean(selectedCandidate)}
                />
              </label>
              <button
                className="button button-primary"
                disabled={!customerPick || Boolean(selectedCandidate)}
                onClick={() =>
                  runAction(
                    {
                      action: "customer_select",
                      orderId: order.id,
                      candidateId: customerPick,
                      positiveReasons: [
                        (
                          document.getElementById(
                            "positiveReason",
                          ) as unknown as HTMLSelectElement
                        )?.value || "looks_most_like_me",
                      ],
                      freeText: feedback,
                    },
                    "客户选择与反馈已记录。",
                  )
                }
              >
                <Check size={16} /> 确认最终选择
              </button>
            </div>
          ) : (
            <EmptyState
              icon={MessageSquareText}
              title="等待两张预览"
              text="客户选择只能来自已发送的预览。"
            />
          )}
        </div>

        <div className="panel work-panel final-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">FINAL OUTPUT</div>
              <h2>最终文件</h2>
            </div>
            <FileArchive size={17} />
          </div>
          {selectedCandidate ? (
            <>
              <div className="final-selected">
                <CandidateArt candidate={selectedCandidate} style={style} />
                <div>
                  <span>客户最终选择</span>
                  <strong>候选 #{selectedCandidate.variant}</strong>
                  <small>DNA v{selectedCandidate.portraitDNAVersion}</small>
                </div>
              </div>
              <label className="refinement-field">
                <span>可选：小幅微调</span>
                <textarea
                  rows={2}
                  value={refinement}
                  onChange={(event) => setRefinement(event.target.value)}
                  placeholder="只写需要改变的属性，例如：肩膀略微放松，其他全部保持"
                />
              </label>
              <button
                className="button button-ghost"
                disabled={!refinement || busy === "refine"}
                onClick={() =>
                  runAction({
                    action: "refine",
                    orderId: order.id,
                    candidateId: selectedCandidate.id,
                    refinement,
                    provider,
                  })
                }
              >
                <RefreshCw size={15} /> 创建 1 张微调候选
              </button>
              <div className="export-formats">
                {["HD JPG", "HD PNG", "1:1", "4:5", "简历竖版", "白底", "压缩 JPG"].map(
                  (format) => (
                    <span key={format}>
                      <Check size={12} /> {format}
                    </span>
                  ),
                )}
              </div>
              <button
                className="button button-primary button-wide"
                disabled={busy === "export"}
                onClick={exportFinal}
              >
                <FileArchive size={16} /> 导出无水印高清 ZIP
              </button>
              {order.status === "ready_to_deliver" && (
                <button
                  className="button button-success button-wide"
                  onClick={() =>
                    runAction(
                      { action: "complete", orderId: order.id },
                      `订单已完成，图片保留期 ${state.config.completedRetentionDays} 天。`,
                    )
                  }
                >
                  <PackageCheck size={16} /> 确认客户已收到并完成订单
                </button>
              )}
            </>
          ) : (
            <EmptyState
              icon={FileArchive}
              title="尚未确定最终照片"
              text="记录客户选择后即可导出多尺寸高清交付包。"
            />
          )}
        </div>
      </section>

      <section className="workspace-two-col">
        <div className="panel work-panel privacy-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">PRIVACY & RETENTION</div>
              <h2>隐私与删除</h2>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="retention-card">
            <Clock3 size={18} />
            <div>
              <span>自动删除时间</span>
              <strong>
                {order.expiresAt
                  ? formatDate(order.expiresAt, true)
                  : `未完成订单 ${state.config.unfinishedRetentionDays} 天`}
              </strong>
              <small>删除图片后保留必要订单、反馈与审计记录。</small>
            </div>
          </div>
          <button
            className="button button-danger button-wide"
            onClick={() => {
              if (
                window.confirm(
                  "确认物理删除此订单的全部客户人像资产？此操作无法恢复，但会保留必要订单与审计记录。",
                )
              ) {
                void runAction(
                  { action: "delete_assets", orderId: order.id },
                  "全部人像资产已从私有存储物理删除。",
                );
              }
            }}
          >
            <Trash2 size={16} /> 删除全部人像资产
          </button>
        </div>
        <div className="panel work-panel audit-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">AUDIT LOG</div>
              <h2>操作记录</h2>
            </div>
            <span>{orderAudits.length} 条</span>
          </div>
          <div className="audit-list">
            {orderAudits.slice(0, 7).map((audit) => (
              <div key={audit.id}>
                <span className="audit-dot" />
                <div>
                  <strong>{audit.action.replaceAll("_", " ")}</strong>
                  <small>
                    {audit.operatorId.split("@")[0]} ·{" "}
                    {formatDate(audit.createdAt, true)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function DnaVersionManager({
  state,
  style,
  runSimpleAction,
}: {
  state: StudioState;
  style: PortraitStyle;
  runSimpleAction: (
    payload: Record<string, unknown>,
    message: string,
  ) => Promise<void>;
}) {
  const versions = state.dnaVersions.filter(
    (version) => version.styleId === style.id,
  );
  const draft = versions.find((version) => version.status === "draft");
  const [draftModules, setDraftModules] = useState(
    JSON.stringify(draft?.modules ?? {}, null, 2),
  );
  const parameterGroups = [
    ["Pose", style.parameters?.pose_normalization],
    ["Gaze", style.parameters?.gaze],
    ["Expression", style.parameters?.expression],
    ["Presence", style.parameters?.presence],
    ["Hair & Grooming", style.parameters?.hair_grooming],
  ] as const;

  return (
    <details className="dna-version-manager">
      <summary>查看参数与比较 v1.x / v2.0</summary>
      <div className="dna-version-row">
        {versions.map((version) => (
          <span key={version.id}>
            v{version.version} · Engine {version.engineVersion} ·{" "}
            <b>{version.status}</b>
          </span>
        ))}
      </div>
      <div className="engine-parameter-grid">
        {parameterGroups.map(([label, parameters]) => (
          <section key={label}>
            <h3>{label}</h3>
            {Object.entries(parameters ?? {}).map(([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                <strong>{String(value)}</strong>
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className="version-comparison">
        <div>
          <strong>v1.x · historical</strong>
          <span>17 模块 · 无独立 Source / Gaze / Presence 引擎</span>
        </div>
        <ArrowRight size={17} />
        <div>
          <strong>v2.x · active family</strong>
          <span>20 模块 · 九引擎 · 参数化 Pose / Gaze / Presence / Hair</span>
        </div>
      </div>
      {draft && (
        <div className="draft-editor">
          <label>
            <span>Draft 模块引用（JSON）</span>
            <textarea
              rows={7}
              value={draftModules}
              onChange={(event) => setDraftModules(event.target.value)}
            />
          </label>
          <div className="inline-actions">
            <button
              className="button button-ghost"
              onClick={() => {
                try {
                  const modules = JSON.parse(draftModules) as Record<
                    string,
                    string
                  >;
                  void runSimpleAction(
                    {
                      action: "update_dna_draft",
                      dnaVersionId: draft.id,
                      modules,
                    },
                    `v${draft.version} draft 已保存。`,
                  );
                } catch {
                  window.alert("Draft JSON 格式不正确。");
                }
              }}
            >
              保存 draft
            </button>
            <button
              className="button button-primary"
              onClick={() =>
                runSimpleAction(
                  { action: "publish_dna", dnaVersionId: draft.id },
                  "DNA 已发布到 testing，可审核后设为 active。",
                )
              }
            >
              发布为 testing
            </button>
          </div>
        </div>
      )}
      {versions
        .filter((version) => version.status === "testing")
        .map((version) => (
          <button
            className="button button-primary button-wide"
            key={version.id}
            onClick={() =>
              runSimpleAction(
                { action: "set_active_dna", dnaVersionId: version.id },
                `v${version.version} 已设为新订单 active；旧订单版本未变。`,
              )
            }
          >
            将 v{version.version} 设为 active
          </button>
        ))}
    </details>
  );
}

function StylesView({
  state,
  runSimpleAction,
}: {
  state: StudioState;
  runSimpleAction: (
    payload: Record<string, unknown>,
    message: string,
  ) => Promise<void>;
}) {
  return (
    <div className="view-stack">
      <div className="view-heading">
        <div>
          <div className="eyebrow">SIGNATURE LIBRARY</div>
          <h1>Portrait DNA</h1>
          <p>每个风格由独立模块组成；订单永远锁定生成时的版本。</p>
        </div>
        <span className="role-chip">
          <ShieldCheck size={15} /> Admin only
        </span>
      </div>
      <div className="style-library">
        {state.styles.map((style, index) => {
          const orderCount = state.orders.filter(
            (order) => order.selectedStyleId === style.id,
          ).length;
          return (
            <article className="style-library-card" key={style.id}>
              <div
                className="style-poster"
                style={{ "--style-accent": style.accent } as React.CSSProperties}
              >
                <span className="poster-index">0{index + 1}</span>
                <div className="portrait-figure">
                  <span className="portrait-halo" />
                  <span className="portrait-head" />
                  <span className="portrait-neck" />
                  <span className="portrait-body" />
                </div>
                <span className="poster-name">{style.publicName}</span>
              </div>
              <div className="style-library-copy">
                <div>
                  <StatusBadge status={style.status} />
                  <span className="version-chip">v{style.version}</span>
                </div>
                <h2>{style.publicNameZh}</h2>
                <p>{style.description}</p>
                <div className="trait-row">
                  {style.traits.map((trait) => <span key={trait}>{trait}</span>)}
                </div>
                <div className="style-stats">
                  <span>
                    <strong>{orderCount}</strong> 订单
                  </span>
                  <span>
                    <strong>{Object.keys(style.modules).length}</strong> 模块 · Engine{" "}
                    {style.engineVersion}
                  </span>
                  <span>
                    <strong>—</strong> 重做率
                  </span>
                </div>
                <button
                  className="button button-ghost button-wide"
                  disabled={state.actor.role !== "admin"}
                  onClick={() =>
                    runSimpleAction(
                      { action: "duplicate_dna", styleId: style.id },
                      `${style.publicNameZh} 已复制为草稿版本；旧订单不受影响。`,
                    )
                  }
                >
                  <Copy size={15} /> 复制为新版本草稿
                </button>
                <DnaVersionManager
                  key={
                    state.dnaVersions.find(
                      (version) =>
                        version.styleId === style.id &&
                        version.status === "draft",
                    )?.id ?? `${style.id}:no-draft`
                  }
                  state={state}
                  style={style}
                  runSimpleAction={runSimpleAction}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ModulesView({ state }: { state: StudioState }) {
  const [category, setCategory] = useState("all");
  const modules = state.modules.filter(
    (module) => category === "all" || module.category === category,
  );
  return (
    <div className="view-stack">
      <div className="view-heading">
        <div>
          <div className="eyebrow">PROMPT SYSTEM</div>
          <h1>Prompt 模块</h1>
          <p>已发布模块不可直接覆盖；修改从草稿新版本开始。</p>
        </div>
        <span className="role-chip">
          <LockKeyhole size={15} /> {state.actor.role}
        </span>
      </div>
      <div className="filter-bar">
        <label className="select-field">
          <SlidersHorizontal size={16} />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">全部类别</option>
            {Array.from(new Set(state.modules.map((module) => module.category))).map(
              (item) => <option key={item}>{item}</option>,
            )}
          </select>
        </label>
        <span className="result-count">{modules.length} 个模块</span>
      </div>
      <div className="module-grid">
        {modules.map((module) => (
          <article className="module-card" key={module.id}>
            <div className="module-head">
              <span>{module.category.replaceAll("_", " ")}</span>
              <span className="version-chip">
                Engine {module.engineVersion} · v{module.version}
              </span>
            </div>
            <h2>{module.name.split(" · ")[1] || module.name}</h2>
            <code>{module.slug}</code>
            <p>
              {(module.positivePrompt || module.negativePrompt || "").slice(0, 150)}
              …
            </p>
            {Object.keys(module.parameters).length > 0 && (
              <details className="module-parameters">
                <summary>查看参数</summary>
                <pre>{JSON.stringify(module.parameters, null, 2)}</pre>
              </details>
            )}
            <div className="module-foot">
              <span>
                <CheckCircle2 size={13} /> {module.status}
              </span>
              <span>{module.usedBy.length} 个 DNA 使用</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AnalyticsView({ state }: { state: StudioState }) {
  const styleData = state.styles.map((style) => ({
    ...style,
    count: state.orders.filter((order) => order.selectedStyleId === style.id)
      .length,
  }));
  const max = Math.max(...styleData.map((item) => item.count), 1);
  const rejected = state.candidates.filter(
    (candidate) => candidate.status === "rejected",
  ).length;
  const rejectionCount = (reason: string) =>
    state.candidates.filter((candidate) =>
      candidate.rejectionReasons.includes(reason),
    ).length;
  const versionMetric = (version: string) => {
    const orders = state.orders.filter(
      (order) => order.selectedStyleVersion === version,
    );
    const orderIds = new Set(orders.map((order) => order.id));
    const selected = state.candidates.filter(
      (candidate) =>
        orderIds.has(candidate.orderId) &&
        ["customer_selected", "finalized", "delivered"].includes(
          candidate.status,
        ),
    ).length;
    const redo = state.jobs.filter(
      (job) => orderIds.has(job.orderId) && job.retryCount > 0,
    ).length;
    return {
      selectionRate: orders.length
        ? `${Math.round((selected / orders.length) * 100)}%`
        : "—",
      redoRate: orders.length
        ? `${Math.round((redo / orders.length) * 100)}%`
        : "—",
    };
  };
  const v1Metric = versionMetric("1.0");
  const v2Metric = versionMetric("2.0");
  return (
    <div className="view-stack">
      <div className="view-heading">
        <div>
          <div className="eyebrow">QUALITY SIGNALS</div>
          <h1>质量与分析</h1>
          <p>第一阶段只展示对 Portrait DNA 迭代真正有用的信号。</p>
        </div>
      </div>
      <div className="analytics-metrics">
        {[
          ["风格订单", state.orders.length, "累计"],
          ["平均候选", (state.candidates.length / Math.max(state.orders.length, 1)).toFixed(1), "张 / 单"],
          ["重做次数", state.jobs.filter((job) => job.retryCount > 0).length, "累计"],
          ["淘汰候选", rejected, "人工审核"],
          ["平均交付", `${state.stats.averageHours}h`, "从创建到完成"],
          ["v1 客户选择率", v1Metric.selectionRate, `重做 ${v1Metric.redoRate}`],
          ["v2 客户选择率", v2Metric.selectionRate, `重做 ${v2Metric.redoRate}`],
        ].map(([label, value, note]) => (
          <div className="analytics-metric" key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="analytics-grid">
        <section className="panel analytics-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">STYLE MIX</div>
              <h2>风格订单数</h2>
            </div>
          </div>
          <div className="bar-list">
            {styleData.map((style) => (
              <div className="bar-row" key={style.id}>
                <span>{style.publicNameZh}</span>
                <div>
                  <i
                    style={{
                      width: `${Math.max((style.count / max) * 100, 4)}%`,
                      background: style.accent,
                    }}
                  />
                </div>
                <strong>{style.count}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel analytics-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">FEEDBACK TAXONOMY</div>
              <h2>重点观察</h2>
            </div>
          </div>
          <div className="signal-list">
            {[
              ["弱存在感淘汰率", "weak_presence"],
              ["眼神太柔淘汰率", "gaze_too_soft"],
              ["姿势继承原图率", "pose_inherited_from_source"],
              ["证件照感淘汰率", "passport_photo_composition"],
              ["发量不足淘汰率", "flat_hair"],
              ["发量过度淘汰率", "hair_volume_exaggerated"],
              ["身份不像", "identity_mismatch"],
              ["眼睛伪影", "eye_artifact"],
            ].map(([label, code]) => (
              <div key={code}>
                <span>
                  <strong>{label}</strong>
                  <code>{code}</code>
                </span>
                <b>{rejectionCount(code)}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsView({ state }: { state: StudioState }) {
  const settings = [
    ["默认 Provider", state.config.provider, state.config.providerConfigured ? "已配置" : "自动回退 Mock"],
    ["模型", state.config.providerModel, "服务端环境变量"],
    ["每批生成", `${state.config.generationCount} 张`, "最大整组重试 1 次"],
    ["客户预览", `${state.config.previewDimension}px`, state.config.watermarkEnabled ? "预览标识开启" : "预览标识关闭"],
    ["未完成保留", `${state.config.unfinishedRetentionDays} 天`, "到期清理人像资产"],
    ["完成后保留", `${state.config.completedRetentionDays} 天`, "必要记录继续保留"],
  ];
  return (
    <div className="view-stack">
      <div className="view-heading">
        <div>
          <div className="eyebrow">PRODUCTION CONFIG</div>
          <h1>生产设置</h1>
          <p>密钥和 Provider 配置只存在服务端，运营人员不可见。</p>
        </div>
        <span className="role-chip">
          <ShieldCheck size={15} /> Admin
        </span>
      </div>
      <div className="settings-layout">
        <section className="panel settings-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">RUNTIME</div>
              <h2>当前配置</h2>
            </div>
          </div>
          {settings.map(([label, value, note]) => (
            <div className="setting-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{note}</small>
            </div>
          ))}
        </section>
        <section className="panel settings-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">PROVIDER HEALTH</div>
              <h2>服务状态</h2>
            </div>
          </div>
          <div className="provider-health-card">
            <span className={state.config.providerConfigured ? "online" : "mock"}>
              <Activity size={17} />
            </span>
            <div>
              <strong>
                {state.config.providerConfigured
                  ? "OpenAI Image API 已配置"
                  : "Mock Provider 正在接管"}
              </strong>
              <p>
                {state.config.providerConfigured
                  ? "真实图像编辑请求会使用私有服务端凭证。"
                  : "不配置密钥也可以完整演示订单、审核与交付。"}
              </p>
            </div>
          </div>
          <div className="privacy-callout">
            <LockKeyhole size={18} />
            <p>图片、完整 Prompt、密钥和签名 URL 均不会写入审计日志。</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function PortraitStudioApp({ view, selectedOrderId }: Props) {
  const [state, setState] = useState<StudioState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/portrait/state", { cache: "no-store" });
    if (!response.ok) throw new Error(await responseError(response));
    setState((await response.json()) as StudioState);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
        .catch((loadError) =>
          setError(
            loadError instanceof Error ? loadError.message : "工作台加载失败。",
          ),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3_800);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectedOrder = useMemo(
    () => state?.orders.find((order) => order.id === selectedOrderId),
    [selectedOrderId, state],
  );

  async function simpleAction(
    payload: Record<string, unknown>,
    message: string,
  ) {
    const response = await fetch("/api/portrait/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setError(await responseError(response));
      return;
    }
    setToast(message);
    await load();
  }

  if (loading) return <LoadingStudio />;
  if (!state || error) {
    return (
      <div className="fatal-error">
        <AlertTriangle size={27} />
        <h1>生产台暂时不可用</h1>
        <p>{error || "无法读取工作台状态。"}</p>
        <button
          className="button button-primary"
          onClick={() => location.reload()}
        >
          <RefreshCw size={16} /> 重试
        </button>
      </div>
    );
  }

  return (
    <div className="studio-shell">
      <aside className={`studio-sidebar ${mobileNav ? "is-open" : ""}`}>
        <a className="studio-brand" href="/admin/portrait">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>
            <strong>CATV</strong>
            <small>PORTRAIT STUDIO</small>
          </span>
        </a>
        <button
          className="mobile-close"
          onClick={() => setMobileNav(false)}
          aria-label="关闭菜单"
        >
          <X size={18} />
        </button>
        <nav>
          <span className="nav-label">生产</span>
          {NAV.slice(0, 2).map(({ href, label, view: navView, icon: Icon }) => (
            <a
              href={href}
              className={view === navView || (view === "order" && navView === "orders") || (view === "new" && navView === "orders") ? "active" : ""}
              key={href}
            >
              <Icon size={17} />
              <span>{label}</span>
              {navView === "orders" && (
                <b>{state.orders.filter((order) => order.status !== "completed").length}</b>
              )}
            </a>
          ))}
          <span className="nav-label">系统</span>
          {NAV.slice(2).map(({ href, label, view: navView, icon: Icon }) => (
            <a href={href} className={view === navView ? "active" : ""} key={href}>
              <Icon size={17} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="provider-pill">
            <span className={state.config.providerConfigured ? "online" : ""} />
            <div>
              <strong>
                {state.config.providerConfigured ? "OPENAI LIVE" : "MOCK SAFE"}
              </strong>
              <small>Provider 可用</small>
            </div>
          </div>
          <a href="/portrait" target="_blank">
            对外产品页 <ArrowRight size={14} />
          </a>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobileNav(false)}
          aria-label="关闭菜单"
        />
      )}
      <div className="studio-main">
        <header className="studio-topbar">
          <button
            className="mobile-menu"
            aria-label="打开菜单"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={19} />
          </button>
          <div className="topbar-context">
            <span>人工生产空间</span>
            <b>·</b>
            <strong>{new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}</strong>
          </div>
          <div className="topbar-right">
            <span className="privacy-status">
              <ShieldCheck size={14} /> 私有资产保护中
            </span>
            <button className="user-chip">
              <span>{state.actor.displayName.slice(0, 1)}</span>
              <div>
                <strong>{state.actor.displayName}</strong>
                <small>{state.actor.role}</small>
              </div>
              <MoreHorizontal size={15} />
            </button>
          </div>
        </header>
        <main className="studio-content">
          {view === "dashboard" && (
            <DashboardView
              state={state}
              openOrder={(id) =>
                (window.location.href = `/admin/portrait/orders/${id}`)
              }
            />
          )}
          {view === "orders" && (
            <OrdersView
              state={state}
              openOrder={(id) =>
                (window.location.href = `/admin/portrait/orders/${id}`)
              }
            />
          )}
          {view === "new" && (
            <NewOrderView
              state={state}
              onCreated={(id) =>
                (window.location.href = `/admin/portrait/orders/${id}`)
              }
            />
          )}
          {view === "order" && selectedOrder && (
            <OrderWorkspace
              state={state}
              order={selectedOrder}
              refresh={load}
              notify={setToast}
            />
          )}
          {view === "order" && !selectedOrder && (
            <EmptyState
              icon={AlertTriangle}
              title="找不到订单"
              text="订单可能已删除，或当前账号没有访问权限。"
            />
          )}
          {view === "styles" && (
            <StylesView state={state} runSimpleAction={simpleAction} />
          )}
          {view === "modules" && <ModulesView state={state} />}
          {view === "analytics" && <AnalyticsView state={state} />}
          {view === "settings" && <SettingsView state={state} />}
        </main>
      </div>
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
          <button onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
