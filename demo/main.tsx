import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ClipboardCheck,
  Download,
  FileText,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import "../app/globals.css";
import "./demo.css";

type Stage =
  | "source"
  | "compiled"
  | "review"
  | "preview"
  | "selected"
  | "delivered";

type Candidate = {
  id: number;
  score: number;
  tone: string;
  status: "pending" | "approved" | "preview" | "selected";
};

const initialCandidates: Candidate[] = [
  { id: 1, score: 91, tone: "slate", status: "pending" },
  { id: 2, score: 89, tone: "blue", status: "pending" },
  { id: 3, score: 87, tone: "warm", status: "pending" },
  { id: 4, score: 85, tone: "mist", status: "pending" },
];

const stageLabels: Record<Stage, string> = {
  source: "待生成",
  compiled: "Prompt 已锁定",
  review: "待内部审核",
  preview: "等待客户选择",
  selected: "客户已选择",
  delivered: "已完成",
};

function BrandMark() {
  return (
    <span className="demo-brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function PortraitVisual({
  tone,
  compact = false,
}: {
  tone: string;
  compact?: boolean;
}) {
  return (
    <div className={`portrait-visual tone-${tone} ${compact ? "is-compact" : ""}`}>
      <span className="portrait-halo" />
      <span className="portrait-hair" />
      <span className="portrait-face" />
      <span className="portrait-neck" />
      <span className="portrait-body" />
    </div>
  );
}

function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="demo-landing">
      <header className="landing-nav">
        <a className="landing-brand" href="#top" aria-label="CATV Portrait">
          <BrandMark />
          <span>
            <strong>CATV</strong>
            <small>PORTRAIT</small>
          </span>
        </a>
        <div className="demo-chip">
          <span />
          INTERACTIVE DEMO
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

      <main id="top" className="landing-main">
        <section className="landing-copy">
          <p className="eyebrow">CATV PORTRAIT STUDIO · PHASE 01</p>
          <h1>
            不用变成别人，
            <br />
            也能看起来更职业。
          </h1>
          <p className="landing-lead">
            这不是一个“点一下就出图”的玩具，而是一套把身份保持、风格 DNA、
            人工审核、客户选择与私有交付串起来的职业肖像生产系统。
          </p>
          <div className="landing-actions">
            <button className="demo-primary large" onClick={onEnter}>
              进入生产流程 Demo <ArrowRight size={18} />
            </button>
            <span className="demo-price">
              <strong>¥9.9</strong>
              <small>一份 · 人工审核</small>
            </span>
          </div>
          <div className="trust-row">
            <span>
              <ShieldCheck size={16} /> 身份保持优先
            </span>
            <span>
              <LockKeyhole size={16} /> 照片默认私有
            </span>
            <span>
              <ClipboardCheck size={16} /> 每张人工审核
            </span>
          </div>
        </section>

        <section className="landing-portraits" aria-label="四种职业肖像风格">
          {[
            ["01", "静默领导者", "slate"],
            ["02", "国际职业形象", "blue"],
            ["03", "高管领导力", "warm"],
            ["04", "创业者工作室", "mist"],
          ].map(([number, label, tone], index) => (
            <article
              key={number}
              className="landing-portrait-card"
              style={{ "--index": index } as React.CSSProperties}
            >
              <span>{number}</span>
              <PortraitVisual tone={tone} />
              <strong>{label}</strong>
            </article>
          ))}
        </section>
      </main>
      <footer className="landing-foot">
        <span>Demo 使用虚构人物图形，不上传、不存储任何真实客户照片。</span>
        <span>CATV PORTRAIT · 2026</span>
      </footer>
    </div>
  );
}

function StageRail({ stage }: { stage: Stage }) {
  const current =
    stage === "source"
      ? 1
      : stage === "compiled"
        ? 2
        : stage === "review"
          ? 3
          : stage === "preview"
            ? 4
            : stage === "selected"
              ? 5
              : 6;
  return (
    <div className="stage-rail" aria-label="生产流程">
      {["原图", "Prompt", "候选", "预览", "选择", "交付"].map((item, index) => (
        <div
          key={item}
          className={`stage-node ${index + 1 <= current ? "is-active" : ""}`}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{item}</strong>
        </div>
      ))}
    </div>
  );
}

function Studio({ onBack }: { onBack: () => void }) {
  const [stage, setStage] = useState<Stage>("source");
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [toast, setToast] = useState("Demo 已载入虚构订单 CATV-DEMO-001");

  const previewCount = candidates.filter(
    (candidate) =>
      candidate.status === "preview" || candidate.status === "selected",
  ).length;

  const previewCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          candidate.status === "preview" || candidate.status === "selected",
      ),
    [candidates],
  );

  function compilePrompt() {
    setStage("compiled");
    setToast("Prompt 已编译：Identity Preservation 固定排在第一位。");
  }

  function generateCandidates() {
    setStage("review");
    setCandidates(initialCandidates);
    setToast("Mock Provider 已生成 4 张内部候选，等待人工审核。");
  }

  function approveCandidate(id: number) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, status: "approved" } : candidate,
      ),
    );
    setToast(`候选 #${id} 已通过人工检查。`);
  }

  function togglePreview(id: number) {
    setCandidates((current) => {
      const target = current.find((candidate) => candidate.id === id);
      if (!target) return current;
      if (target.status === "preview") {
        return current.map((candidate) =>
          candidate.id === id ? { ...candidate, status: "approved" } : candidate,
        );
      }
      const selected = current.filter(
        (candidate) => candidate.status === "preview",
      ).length;
      if (selected >= 2) {
        setToast("客户预览最多保留两张。");
        return current;
      }
      return current.map((candidate) =>
        candidate.id === id ? { ...candidate, status: "preview" } : candidate,
      );
    });
  }

  function sendPreview() {
    setStage("preview");
    setToast("两张 640px 带保护标识的预览已准备完成。");
  }

  function selectFinal(id: number) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id
          ? { ...candidate, status: "selected" }
          : candidate.status === "selected"
            ? { ...candidate, status: "preview" }
            : candidate,
      ),
    );
    setStage("selected");
    setToast(`客户已选择候选 #${id}：更自然、更像本人。`);
  }

  function exportDelivery() {
    setStage("delivered");
    setToast("已模拟导出 7 种无水印规格，订单完成。");
  }

  function resetDemo() {
    setStage("source");
    setCandidates(initialCandidates);
    setToast("演示订单已重置，可以重新体验完整流程。");
  }

  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <button className="studio-brand" onClick={onBack}>
          <BrandMark />
          <span>
            <strong>CATV</strong>
            <small>PORTRAIT STUDIO</small>
          </span>
        </button>
        <nav>
          <span className="nav-label">生产</span>
          <button className="nav-item is-active">
            <Layers3 size={18} /> 订单工作台
          </button>
          <button className="nav-item">
            <ImageIcon size={18} /> 全部订单 <i>1</i>
          </button>
          <span className="nav-label">系统</span>
          <button className="nav-item">
            <Sparkles size={18} /> Portrait DNA
          </button>
          <button className="nav-item">
            <FileText size={18} /> Prompt 模块
          </button>
        </nav>
        <div className="sidebar-foot">
          <strong>
            <span /> DEMO SAFE
          </strong>
          <small>虚构数据 · 不调用真实模型</small>
          <button onClick={onBack}>
            <ChevronLeft size={15} /> 返回产品页
          </button>
        </div>
      </aside>

      <div className="studio-content">
        <header className="studio-topbar">
          <span>人工生产空间 · 交互演示</span>
          <div>
            <LockKeyhole size={15} />
            隐私资产保护中
            <strong>DEMO OPERATOR</strong>
          </div>
        </header>

        <main className="workspace">
          <section className="workspace-head">
            <div>
              <button className="back-link" onClick={onBack}>
                <ChevronLeft size={14} /> 产品页
              </button>
              <p>CATV-DEMO-001</p>
              <h1>林小姐 · 虚构演示订单</h1>
              <span>静默领导者 · DNA v1.0 · 小红书</span>
            </div>
            <div className={`status-pill status-${stage}`}>
              <i />
              {stageLabels[stage]}
            </div>
          </section>

          <StageRail stage={stage} />

          <div className="workspace-grid">
            <section className="studio-card source-card">
              <div className="card-kicker">
                <span>SOURCE · PRIVATE</span>
                <LockKeyhole size={15} />
              </div>
              <h2>客户原图</h2>
              <div className="source-body">
                <PortraitVisual tone="source" />
                <div className="source-checks">
                  <span>
                    <Check /> 格式与文件签名 <strong>通过</strong>
                  </span>
                  <span>
                    <Check /> 主脸数量 <strong>1 · 人工确认</strong>
                  </span>
                  <span>
                    <Check /> 曝光与清晰度 <strong>可生成</strong>
                  </span>
                </div>
              </div>
            </section>

            <section className="studio-card dna-card">
              <div className="card-kicker">
                <span>PORTRAIT DNA</span>
                <span className="tiny-pill">ACTIVE · v1.0</span>
              </div>
              <h2>静默领导者</h2>
              <p>
                极简、克制且高智感的科技管理层形象。浅灰蓝背景与柔和棚拍让注意力只落在人物本身。
              </p>
              <div className="tag-row">
                <span>安静自信</span>
                <span>极简科技</span>
                <span>真实皮肤</span>
              </div>
              <dl>
                <div>
                  <dt>模块</dt>
                  <dd>17</dd>
                </div>
                <div>
                  <dt>身份保持</dt>
                  <dd>强制首位</dd>
                </div>
                <div>
                  <dt>绑定策略</dt>
                  <dd>版本锁定</dd>
                </div>
              </dl>
            </section>

            <section className="studio-card prompt-card">
              <div className="card-kicker">
                <span>PROMPT TRACE</span>
                <FileText size={15} />
              </div>
              <h2>结构化 Prompt</h2>
              {stage === "source" ? (
                <div className="empty-prompt">
                  <strong>尚未编译</strong>
                  <span>编译不会调用模型，也不会产生费用。</span>
                  <button className="demo-primary" onClick={compilePrompt}>
                    <WandSparkles size={16} /> 编译 Prompt
                  </button>
                </div>
              ) : (
                <div className="compiled-prompt">
                  <div>
                    <Check size={14} /> Identity 排在第一位
                    <code>sha256:55d99855c775</code>
                  </div>
                  <p>
                    [01 · IDENTITY PRESERVATION] Preserve the subject&apos;s exact
                    identity with very high fidelity. Maintain facial geometry,
                    apparent age, skin tone and distinctive natural
                    characteristics…
                  </p>
                  <span>DNA 1.0 · Compiler 1.0.0 · 17 个模块版本已锁定</span>
                </div>
              )}
            </section>

            <section className="studio-card generation-card">
              <div className="card-kicker">
                <span>GENERATION ORCHESTRATOR</span>
                <Sparkles size={15} />
              </div>
              <h2>生成任务</h2>
              <div className="provider-row">
                <span>Provider</span>
                <strong>Mock Portrait Provider</strong>
              </div>
              <p>演示环境使用几何人物图形，不调用真实模型。</p>
              <button
                className="demo-primary"
                disabled={stage === "source"}
                onClick={generateCandidates}
              >
                <Sparkles size={16} />
                {stage === "review" ? "重新生成 4 张" : "生成 4 张候选"}
              </button>
            </section>

            <section className="studio-card review-card">
              <div className="card-kicker">
                <span>INTERNAL REVIEW</span>
                <span>{previewCount} / 2 预览</span>
              </div>
              <h2>候选审核</h2>
              {stage === "source" || stage === "compiled" ? (
                <div className="review-empty">
                  <Layers3 size={24} />
                  <strong>还没有候选图</strong>
                  <span>先编译 Prompt，再运行 Mock Provider。</span>
                </div>
              ) : (
                <div className="candidate-grid">
                  {candidates.map((candidate) => (
                    <article
                      key={candidate.id}
                      className={`candidate-card is-${candidate.status}`}
                    >
                      <PortraitVisual tone={candidate.tone} compact />
                      <div className="candidate-meta">
                        <span>#{String(candidate.id).padStart(2, "0")}</span>
                        <strong>{candidate.score}</strong>
                      </div>
                      <small>
                        {candidate.status === "pending"
                          ? "待审核"
                          : candidate.status === "approved"
                            ? "已通过"
                            : candidate.status === "preview"
                              ? "客户预览"
                              : "客户选中"}
                      </small>
                      {candidate.status === "pending" && (
                        <button onClick={() => approveCandidate(candidate.id)}>
                          <Check size={14} /> 通过
                        </button>
                      )}
                      {candidate.status === "approved" && (
                        <button onClick={() => togglePreview(candidate.id)}>
                          选为预览
                        </button>
                      )}
                      {candidate.status === "preview" && stage === "review" && (
                        <button onClick={() => togglePreview(candidate.id)}>
                          取消预览
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {stage === "review" && (
                <button
                  className="demo-primary send-button"
                  disabled={previewCount !== 2}
                  onClick={sendPreview}
                >
                  <Send size={16} /> 准备两张客户预览
                </button>
              )}
            </section>

            <section className="studio-card customer-card">
              <div className="card-kicker">
                <span>CUSTOMER DECISION</span>
                <ClipboardCheck size={15} />
              </div>
              <h2>记录客户选择</h2>
              {stage === "preview" ||
              stage === "selected" ||
              stage === "delivered" ? (
                <>
                  <div className="preview-grid">
                    {previewCandidates.map((candidate, index) => (
                      <button
                        key={candidate.id}
                        className={
                          candidate.status === "selected" ? "is-selected" : ""
                        }
                        onClick={() => selectFinal(candidate.id)}
                        disabled={stage === "delivered"}
                      >
                        <PortraitVisual tone={candidate.tone} compact />
                        <span>预览 {index + 1}</span>
                        {candidate.status === "selected" && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                  <label>
                    客户反馈
                    <textarea
                      readOnly
                      value={
                        stage === "preview"
                          ? "请点击上方任意一张预览，模拟客户最终选择。"
                          : "选择第一张，更像本人，整体自然且职业。"
                      }
                    />
                  </label>
                </>
              ) : (
                <div className="review-empty compact">
                  <Send size={22} />
                  <strong>等待两张预览</strong>
                  <span>客户只能从人工筛选后的预览中选择。</span>
                </div>
              )}
            </section>

            <section className="studio-card delivery-card">
              <div className="card-kicker">
                <span>FINAL OUTPUT</span>
                <Download size={15} />
              </div>
              <h2>最终文件</h2>
              {stage === "selected" || stage === "delivered" ? (
                <>
                  <div className="output-formats">
                    {["HD JPG", "HD PNG", "1:1", "4:5", "简历竖版", "白底", "压缩 JPG"].map(
                      (format) => (
                        <span key={format}>
                          <Check size={12} /> {format}
                        </span>
                      ),
                    )}
                  </div>
                  <button
                    className="demo-primary export-button"
                    onClick={exportDelivery}
                    disabled={stage === "delivered"}
                  >
                    <Download size={16} />
                    {stage === "delivered"
                      ? "交付包已生成"
                      : "模拟导出无水印高清 ZIP"}
                  </button>
                </>
              ) : (
                <div className="review-empty compact">
                  <Download size={22} />
                  <strong>尚未确定最终照片</strong>
                  <span>记录客户选择后即可导出。</span>
                </div>
              )}
            </section>
          </div>

          <section className="demo-finish-bar">
            <div>
              <span className={`finish-dot stage-${stage}`} />
              <strong>{toast}</strong>
            </div>
            <button onClick={resetDemo}>
              <RefreshCw size={15} /> 重置演示
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}

function DemoApp() {
  const [view, setView] = useState<"landing" | "studio">("landing");
  return view === "landing" ? (
    <Landing onEnter={() => setView("studio")} />
  ) : (
    <Studio onBack={() => setView("landing")} />
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>,
);
