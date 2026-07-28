# CATV Portrait Studio

CATV 职业肖像工作室第一阶段：面向小红书、微信等人工销售渠道的 AI 职业肖像生产后台。它不是用户自助生成站，而是一套可追踪的人工接单、AI 辅助生成、人工审核、客户选择、高清交付与隐私清理系统。

公开介绍页位于 `/portrait`，生产后台位于 `/admin/portrait`。

## 第一阶段业务流程

```text
创建订单 → 私有上传客户原图 → 绑定 Signature 风格与 DNA 版本
→ 编译结构化 Prompt → Mock / OpenAI / 外部手工生成
→ 4 张内部候选 → 人工审核 → 选择 2 张带保护标识预览
→ 记录客户选择与反馈 → 可选小幅微调
→ 导出高清与常用裁切 ZIP → 确认交付 → 到期物理删除图片
```

人工审核是强制环节。自动质量分数只帮助排序，不会成为直接交付依据。

## 技术与目录

项目采用 TypeScript、Next App Router 兼容的 Vinext、Cloudflare D1、Cloudflare R2、Drizzle、Vitest，并提供独立的 Vercel 交互 Demo。

源码仓库：[eureka-wr/portrait](https://github.com/eureka-wr/portrait)

```text
app/
  portrait/                       公开产品页
  admin/portrait/                 生产后台路由
  api/portrait/                   受权限保护的订单、资产与任务 API
src/modules/portrait/
  domain/                         订单、候选、DNA、状态机
  prompts/                        Prompt Compiler
  providers/                      Mock / Manual / OpenAI Adapter
  assets/                         私有对象存储、校验与签名访问
  database/                       D1 初始化、Seed 与 Repository
  jobs/                           Queue 与 Orchestrator 接口
  analysis/                       Source Image Analyzer 接口
  quality/                        Quality Judge 接口
  ui/                             运营工作台
db/schema.ts                      Drizzle 数据模型
drizzle/                          可部署迁移
docs/                             架构、隐私与运营文档
tests/                            Prompt、状态机、Provider 与安全契约测试
```

这是一个独立 Portrait 模块；未来可以迁移进 CATV Monorepo 的 `apps/portrait-admin` 与 `packages/portrait-*`，不需要改写业务模型。

## 本地启动

要求 Node.js 22+ 与 pnpm。

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

打开终端打印的本地地址。端口 3000 被占用时 Vinext 会自动选择下一个端口。

本地开发自动使用 Miniflare 提供的 D1 与 R2 模拟绑定。第一次访问 `/api/portrait/state` 会幂等创建表、四个风格、四套 DNA、基础 Prompt 模块、两个角色和一张示例订单。

也可以显式触发 Seed：

```bash
PORTRAIT_LOCAL_URL=http://localhost:3001 pnpm db:seed
```

数据库迁移：

```bash
pnpm db:generate
```

## 管理员与权限

- 本地 `localhost` 自动使用 `dev.admin@catv.local`，不需要硬编码前端密码。
- 生产后台通过服务端身份适配器识别用户；API 端再次验证身份。
- `PORTRAIT_ADMIN_EMAIL` 对应 Admin，其余已登录后台用户默认为 Operator。
- Operator 可完成生产流程，但看不到系统密钥，不能发布 DNA 或修改 Provider。
- Admin 可复制 DNA 草稿、查看完整 Prompt、管理 Provider 与保留策略。

正式环境不要使用明文密码。如果部署环境已有 CATV 统一认证，可只替换 `src/modules/portrait/auth.ts`，业务 API 不需要改写。

## 四种 Signature 风格与 Portrait DNA

数据源位于 `src/modules/portrait/domain/catalog.ts`，运行时 Seed 到 `portrait_styles`、`portrait_dna_versions` 与 `prompt_modules`：

1. Quiet Executive Signature / 静默领导者
2. Global Professional Signature / 国际职业形象
3. Boardroom Leadership Signature / 高管领导力
4. Founder Studio Signature / 创业者工作室

DNA 不是长 Prompt。它由 identity、career identity、composition、pose、expression、camera、lens、lighting、background、wardrobe、hair、skin、color、retouch、rendering、output 与 negative 模块组合。订单保存具体 DNA 版本；发布新版本不会回写旧订单。

创建新 DNA 版本：进入 `/admin/portrait/styles`，Admin 点击“复制为新版本草稿”，在后续模块编辑界面修改并发布。新增第五种风格时，在 Catalog 添加新的独立 style id 与模块，生成迁移/Seed，运行测试，再激活。

## Prompt Compiler

实现位于 `src/modules/portrait/prompts/compiler.ts`。

- Identity Preservation 始终第一。
- 编译顺序固定。
- 保存完整 positive / negative Prompt、模块版本、DNA 版本与 Compiler 版本。
- 对可追踪输入生成稳定 SHA-256 checksum。
- 已生成 Prompt 只新增，不静默覆盖。
- Operator 页面不会收到完整 Prompt；Admin 可查看与复制。
- refinement 只追加明确的小幅修改，并要求保持身份和未请求属性。

## Provider

`src/modules/portrait/providers/` 提供统一 `PortraitProvider` 接口。

- `MockPortraitProvider`：默认可用，支持成功、部分成功、超时、整批失败、质量失败与存储失败模拟。
- `ManualUploadProvider`：先复制 Prompt，在外部图像编辑工具手工生成，再上传回订单；只记录工具/模型备注，不保存外部敏感凭证。
- `OpenAIImageProvider`：真实服务端适配器，调用官方 `/v1/images/edits`，默认 `gpt-image-1.5`，支持参考图高保真编辑、超时和有限重试。模型可通过环境变量覆盖。

配置真实 Provider：

```dotenv
PORTRAIT_PROVIDER=openai
PORTRAIT_PROVIDER_API_KEY=...
PORTRAIT_PROVIDER_BASE_URL=https://api.openai.com/v1
PORTRAIT_PROVIDER_MODEL=gpt-image-1.5
```

密钥只在服务端读取。配置缺失时自动回退到 Mock；错误响应不记录原图、密钥或完整私有 URL。官方接口依据：[OpenAI Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)。

增加新的 Provider：实现 `PortraitProvider`，在 `getPortraitProvider()` 注册；资产、候选、Prompt 与审计流程不变。

## Mock 与 Manual 生产

Mock：

1. 创建订单并上传测试图片。
2. 编译 Prompt。
3. Provider 选 Mock，点击“生成 4 张候选”。
4. 审核、选择两张、下载预览、记录客户选择、导出 ZIP、完成与删除。

Manual：

1. 编译并复制 Prompt。
2. 把客户原图与 Prompt 提交到有权使用的外部图像编辑工具。
3. 在“生成任务”下上传结果，并填写工具/模型备注。
4. 上传结果以 `manual_external` Candidate 进入相同审核、反馈与交付流程。

## 图片与隐私安全

- 原图、母图与高清资产默认进入私有 R2，不使用永久公开 URL。
- API 返回的 Studio State 不包含 `storageKey`。
- 图片读取要求后台身份或短时 HMAC 签名路径。
- 上传校验 MIME、文件签名、体积与基础尺寸；拒绝 SVG、脚本和损坏文件。
- 浏览器导出的预览与最终文件通过 Canvas 重编码，清除 EXIF。
- 客户预览默认 640px 内、JPG、单处半透明 `CATV Portrait · Preview`。
- 高清 ZIP 不带 Logo、水印、文字或边框，包含 JPG、PNG、1:1、4:5、简历、白底画布与压缩版。
- 默认未完成订单保留 14 天，完成后保留 7 天；Maintenance API 可由定时任务调用清理。
- 删除会物理移除 R2 对象并软删除资产记录；订单、反馈与审计保留。
- 不建立人脸数据库、不保存人脸识别模板、不推断性格、职业、财富、健康、政治或宗教。

详见 `docs/privacy-and-security.md`。

## 队列与存储切换

第一阶段任务状态持久化在 D1，执行使用本地流程；浏览器刷新不会丢失 job 状态。`src/modules/portrait/jobs/queue.ts` 定义了稳定 Queue 端口。

- 切换 BullMQ：实现 `PortraitJobQueue`，配置 `REDIS_URL`，让 worker 调用现有 Orchestrator。
- 切换托管 Workflow / Queue：保持 `GenerationJob` 状态和幂等 key 不变。
- 切换对象存储：实现与 `put/read/delete` 相同的 Asset Storage 端口，并继续把真实 key 隔离在服务端。

## 测试与构建

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:demo
```

Vitest 覆盖 Prompt 顺序、Identity 首位、模块版本、checksum 稳定、DNA 差异、refinement、四风格、订单状态机、Mock 成功/部分/超时与存储安全契约。

Playwright 规格位于 `tests/e2e/portrait-production.spec.ts`（安装浏览器运行时后使用 `pnpm test:e2e`）。本次实现还通过本地 API 实际跑通了创建 → 上传 → 编译 → 4 张候选 → 审核 → 两张预览 → 客户选择 → 导出状态 → 完成 → 物理删除。

## 部署

仓库区分两个部署面：

- `pnpm build:demo`：构建公开、无真实照片、无真实模型调用的浏览器内交互 Demo，输出到 `demo-dist/`；`vercel.json` 已配置 Vercel 使用该构建。
- `pnpm build`：构建完整 Cloudflare Worker 生产系统。生产环境需要自行创建 D1 `DB`、私有 R2 `PORTRAIT_ASSETS`，应用 `drizzle/` 迁移，并配置身份适配器。

Vercel Demo：

```bash
vercel link
vercel --prod
```

完整生产环境必须配置：

- 管理员邮箱与访问策略
- 强随机 `ASSET_SIGNING_SECRET`
- 如启用真实生成，配置 Provider Key
- 定时调用受 Admin 保护的 `/api/portrait/maintenance`

公开 `/portrait` 不提供上传、登录或支付；后台 `/admin/portrait` 需要身份。

Vercel Demo 只使用虚构几何人物与浏览器内状态，不保存订单，也不代表真实 Provider 已配置。

## CATV 主站集成

当前目录没有 CATV 主站，因此只创建独立 `/portrait` 产品页。接入现有主站时：

1. 将公开路由和品牌导航挂入 `catv-web`。
2. Portrait 后台与 API 保持独立模块和私有绑定。
3. 共用现有 auth/database/shared-ui 时只替换 adapter，不改 Portrait Domain。

## 当前限制与第二阶段

- 第一阶段没有用户注册、自助上传、在线支付、会员、自动交付或公开作品。
- Mock Analyzer 与 Mock Quality Judge 只提供技术占位；身份、伪影和交付全部依赖人工。
- 最终尺寸和预览在浏览器端安全重编码并下载；需要服务端长期保存派生文件时，可把同一规格迁入图片 worker。
- Queue 端口已定义，但第一阶段未部署 Redis。
- DNA 草稿复制可用，完整可视化模块编辑器和发布审批仍建议作为下一增量。

第二阶段建议依次增加：用户自助删除、对象存储派生任务、支付、自动质检、异步 worker；再进入多模型、A/B 测试与 Portrait DNA 实验。
