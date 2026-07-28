import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  FileArchive,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PORTRAIT_STYLES } from "../../src/modules/portrait/domain/catalog";

export const metadata: Metadata = {
  title: "CATV 职业肖像工作室｜9.9 元人工职业肖像",
  description:
    "选择一种职业形象，发来一张清晰照片。CATV 人工制作两张候选图，你选择其中一张，获得高清无水印与常用尺寸。",
};

export default function PortraitPublicPage() {
  return (
    <div className="public-portrait">
      <header className="public-header">
        <a className="public-brand" href="#top">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>
            <strong>CATV</strong>
            <small>PORTRAIT</small>
          </span>
        </a>
        <nav>
          <a href="#styles">四种风格</a>
          <a href="#process">服务流程</a>
          <a href="#delivery">交付内容</a>
          <a href="#privacy">隐私</a>
        </nav>
        <a className="public-contact" href="#contact">
          小红书私信 <ArrowRight size={15} />
        </a>
      </header>

      <main id="top">
        <section className="public-hero">
          <div className="public-hero-copy">
            <div className="eyebrow">CATV PORTRAIT STUDIO · 人工职业肖像</div>
            <h1>
              不用变成别人，
              <br />
              也能看起来更职业。
            </h1>
            <p>
              选择一种职业形象，发来一张清晰照片。
              我们人工制作两张候选图，你选择其中一张，
              获得高清无水印版本和常用职业尺寸。
            </p>
            <div className="public-hero-actions">
              <a className="button button-public-primary" href="#styles">
                先选一种风格 <ArrowRight size={16} />
              </a>
              <span>
                <strong>¥9.9</strong>
                <small>一份 · 人工审核</small>
              </span>
            </div>
            <div className="public-trust-row">
              <span>
                <ShieldCheck size={15} /> 不用于训练
              </span>
              <span>
                <LockKeyhole size={15} /> 照片默认私有
              </span>
              <span>
                <Sparkles size={15} /> 高清无水印
              </span>
            </div>
          </div>
          <div className="public-hero-visual" aria-label="四种职业肖像风格">
            {PORTRAIT_STYLES.map((style, index) => (
              <div
                className={`hero-portrait hero-portrait-${index + 1}`}
                style={{ "--style-accent": style.accent } as React.CSSProperties}
                key={style.id}
              >
                <span className="hero-portrait-no">0{index + 1}</span>
                <div className="portrait-figure">
                  <span className="portrait-halo" />
                  <span className="portrait-head" />
                  <span className="portrait-neck" />
                  <span className="portrait-body" />
                </div>
                <span>{style.publicNameZh}</span>
              </div>
            ))}
          </div>
          <a className="scroll-cue" href="#styles" aria-label="继续浏览">
            <ChevronDown size={18} />
          </a>
        </section>

        <section className="public-style-section" id="styles">
          <div className="public-section-heading">
            <div className="eyebrow">FOUR SIGNATURES</div>
            <h2>你想让别人，先看到哪一面？</h2>
            <p>风格只改变摄影表达，不改变你的脸、年龄、肤色与真实特征。</p>
          </div>
          <div className="public-style-grid">
            {PORTRAIT_STYLES.map((style, index) => (
              <article className="public-style-card" key={style.id}>
                <div
                  className="public-style-art"
                  style={{ "--style-accent": style.accent } as React.CSSProperties}
                >
                  <span className="public-style-index">0{index + 1}</span>
                  <div className="portrait-figure">
                    <span className="portrait-halo" />
                    <span className="portrait-head" />
                    <span className="portrait-neck" />
                    <span className="portrait-body" />
                  </div>
                  <span className="style-sample-label">风格示意</span>
                </div>
                <div className="public-style-copy">
                  <small>{style.publicName}</small>
                  <h3>{style.publicNameZh}</h3>
                  <p>{style.description}</p>
                  <div className="trait-row">
                    {style.traits.map((trait) => <span key={trait}>{trait}</span>)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="public-process-section" id="process">
          <div className="public-section-heading light">
            <div className="eyebrow">SIMPLE, HUMAN, CONTROLLED</div>
            <h2>四步，完成一张真正能用的职业照。</h2>
          </div>
          <div className="public-process">
            {[
              ["01", "选择风格", "从四种 Signature 中选一种最接近你使用场景的表达。"],
              ["02", "发来原图", "一张清晰、单人、无遮挡的照片即可。我们会先人工检查。"],
              ["03", "查看两张", "制作后发送两张带保护标识的小图，由你做最终选择。"],
              ["04", "收到高清", "交付选中照片的高清大图、头像版、简历版与白底版。"],
            ].map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-delivery" id="delivery">
          <div className="delivery-copy">
            <div className="eyebrow">ONE SIMPLE PRICE</div>
            <h2>一份 9.9 元，交付真正会用到的尺寸。</h2>
            <p>
              没有会员、自动续费或隐藏加购。选中一张后，我们把高清无水印版本整理成一个文件包。
            </p>
            <div className="delivery-list">
              {[
                "两张候选预览",
                "选定一张高清大图",
                "1:1 社交头像版",
                "简历竖版",
                "白底版本",
              ].map((item) => (
                <span key={item}>
                  <Check size={15} /> {item}
                </span>
              ))}
            </div>
          </div>
          <div className="delivery-card">
            <div className="delivery-price">
              <span>CATV Portrait</span>
              <strong>
                <small>¥</small>9.9
              </strong>
              <em>一份 · 一人 · 一种风格</em>
            </div>
            <div className="delivery-icons">
              <span>
                <FileArchive size={20} />
                <b>7</b>
                <small>常用文件</small>
              </span>
              <span>
                <Clock3 size={20} />
                <b>人工</b>
                <small>逐张审核</small>
              </span>
              <span>
                <ShieldCheck size={20} />
                <b>私有</b>
                <small>限期清理</small>
              </span>
            </div>
          </div>
        </section>

        <section className="public-privacy" id="privacy">
          <div className="privacy-symbol">
            <LockKeyhole size={36} />
          </div>
          <div>
            <div className="eyebrow">PORTRAIT PRIVACY</div>
            <h2>你的脸，不是我们的数据。</h2>
            <p>
              客户照片只用于当前订单，不公开、不用于训练、不建立人脸数据库，
              不保存人脸识别模板。交付后按期限清理图片；你也可以随时要求提前删除。
            </p>
          </div>
          <div className="privacy-points">
            <span>不推断性格、职业或阶层</span>
            <span>所有客户可见图片人工审核</span>
            <span>高清母图不使用公开永久链接</span>
          </div>
        </section>

        <section className="public-contact-section" id="contact">
          <span className="contact-orbit" aria-hidden="true" />
          <div className="eyebrow">READY WHEN YOU ARE</div>
          <h2>选好风格，就来找我们。</h2>
          <p>私信时告诉我们风格名称，并准备一张清晰的单人照片。</p>
          <a className="button button-public-primary" href="#">
            <MessageCircle size={17} /> 小红书搜索 CATV
          </a>
          <small>第一阶段为人工接单，暂不支持网页自助上传与在线支付。</small>
        </section>
      </main>

      <footer className="public-footer">
        <a className="public-brand" href="#top">
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
        <p>职业形象可以被重新拍摄，但身份不该被重新定义。</p>
        <span>© 2026 CATV</span>
      </footer>
    </div>
  );
}

