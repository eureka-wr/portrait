# CATV Portrait Studio

CATV 职业肖像生产系统第一阶段。运营人员上传一张真实客户照片，系统通过服务端 OpenAI Image API 生成四种职业形象，人工审核并定稿后，导出 6 种常用规格的私有 ZIP 交付包。

- 生产地址：[portrait.catv.space](https://portrait.catv.space)
- 源码仓库：[eureka-wr/portrait](https://github.com/eureka-wr/portrait)

## 当前可用流程

```text
安全口令登录
→ 上传单人原图
→ 浏览器压缩、校正方向、去除 EXIF
→ 服务端验证格式与尺寸
→ 私有 Vercel Blob 存储
→ 4 个独立身份保持 Prompt
→ OpenAI /v1/images/edits 生成四张职业肖像
→ 人工通过或驳回
→ 选择最终照片
→ 生成并下载 6 种规格 ZIP
→ 随时物理删除订单与全部图片
```

四个候选方向：

1. 静默领导者：灰蓝极简、克制自信
2. 国际职业形象：明亮中性、可信亲和
3. 高管领导力：温润棚拍、稳定权威
4. 创业者工作室：现代空间、自然松弛

## Vercel 生产架构

```text
demo/                         Vite + React 生产工作台
api/session.ts                访问口令与 HttpOnly 会话
api/studio.ts                 上传、生成、审核、定稿、交付与删除
api/asset.ts                  登录后代理读取私有图片/ZIP
server/portrait-production/
  auth.ts                     HMAC 会话、同源校验
  generation.ts               四 Prompt 图像编辑、尺寸派生与 ZIP
  store.ts                    私有 Blob 与不可猜测的版本化订单状态
  types.ts                    生产订单契约
```

照片不会得到永久公开 URL。浏览器只接收 `/api/asset` 代理地址，接口根据登录会话和订单归属读取私有 Blob。访问口令只用于签发 `HttpOnly + Secure + SameSite=Strict` Cookie，不存入前端状态。

订单状态使用不可覆盖的版本化 JSON 存放在私有 Blob；刷新浏览器后可通过本机保存的订单 ID 恢复。第一阶段为单运营人员工作台，不含客户自助账号、支付或多人并发排程。

## 环境变量

Vercel 项目必须配置：

```dotenv
# 连接私有 Blob 后由 Vercel 自动生成
BLOB_READ_WRITE_TOKEN=

# 自己设置的高强度工作台访问口令，至少 12 个字符
PORTRAIT_ACCESS_KEY=

# 仅服务端使用
OPENAI_API_KEY=

# 可选；当前编辑端点默认使用
OPENAI_IMAGE_MODEL=gpt-image-1.5
```

不要创建 `VITE_OPENAI_API_KEY`，也不要把任何模型 Key 写入浏览器代码或提交到 Git。

OpenAI 官方 Image API 文档说明单图编辑应使用 `/v1/images/edits`；本项目按当前端点规范使用 multipart 原图、`quality=high`、`1024x1536` 和 JPEG 输出。

## 本地开发

要求 Node.js 22+ 与 pnpm。

```bash
pnpm install
pnpm build:demo
pnpm typecheck
pnpm test
pnpm lint
```

只预览界面：

```bash
pnpm exec vite --config vite.demo.config.ts
```

运行包含 Vercel Functions 和私有 Blob 的完整本地流程：

```bash
vercel link
vercel env pull .env.local
vercel dev
```

`.env.local` 已被 Git 忽略。

## 部署

仓库已连接 Vercel 项目 `portrait`，`vercel.json` 会：

- 执行 `pnpm build:demo`
- 输出静态工作台到 `demo-dist`
- 部署 `api/session`、`api/studio`、`api/asset`
- 为生成函数配置最长 300 秒执行时间
- 添加基本安全响应头

部署：

```bash
vercel --prod
```

在首次生产部署前，先在 Vercel 项目的 Environment Variables 中配置 `PORTRAIT_ACCESS_KEY` 与 `OPENAI_API_KEY`。私有 Blob `catv-portrait-private` 已连接到该项目。

## 隐私与运营边界

- 只接受 JPEG、PNG、WebP；浏览器处理后必须小于 4MB。
- 服务端限制输入像素、检查可解码性和最小分辨率，并统一重编码为 JPEG。
- 不建立人脸数据库，不保存人脸识别模板，不推断敏感属性。
- 每张候选必须由人工检查身份相似度、五官/手部伪影、服装和背景。
- “重新生成四张”会再次产生四次模型费用，界面会二次确认。
- “删除订单与全部照片”会删除原图、候选、ZIP 和所有状态版本，不可恢复。

## 原始完整模块

仓库仍保留 `app/` 与 `src/modules/portrait/` 下的 Vinext / Cloudflare D1 + R2 版本，包含 DNA 版本、Prompt Compiler、角色权限、审计、客户预览、Maintenance 和更完整的订单域模型。当前 `portrait.catv.space` 使用上述轻量 Vercel 生产路径，以便第一阶段立即上传、生成、审核和交付；后续多人协作时可把 Vercel 工作台接回完整数据库域。

## 验证

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build:demo
```

测试覆盖 Prompt、状态机、Provider、安全契约、会话签名、同源校验，以及私有路径不泄漏。Vercel 预览部署还会实际验证：

- `/api/session` 正确报告存储与模型配置
- 未登录访问 `/api/studio` 被拒绝
- 三个 Serverless Functions 可成功构建与启动
