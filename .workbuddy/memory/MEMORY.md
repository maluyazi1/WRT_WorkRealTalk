# RealTalk 项目长期约定

## 技术栈与架构

- Next.js 16（App Router）+ React 19 + TypeScript + TailwindCSS v3.4 + shadcn/ui（Radix）。
- 无数据库、无账号体系。用户数据仅 `localStorage`（生词本 key：`realtalk_vocabulary_list`）。
- 语料存于 Google BigQuery 表 `sturdy-lore-480006-e6.corpus_data.xhs_structured_corpus`，前端只能经服务端 API 访问。
- AI 供应商：Qwen（场景/FreeTalk/生词加工）、DeepSeek（点评）、DashScope Paraformer（STT）、CosyVoice（TTS）。
- API 路由共 8 个：`tts` / `stt` / `freetalk` / `evaluate` / `answers/evaluate` / `scenarios/random` / `scenarios/custom` / `vocabulary/enrich`。
- 部署：GitHub `maluyazi1/WRT_WorkRealTalk`（main 分支）→ Vercel 自动部署。仓库内无 `.vercel` / `vercel.json`，走 GitHub 集成。

## 样式约定

- **高度单位统一用 `dvh`，不要用 `screen`**。移动浏览器地址栏伸缩会让 `100vh` 与可视区不一致，导致底部元素被遮挡或布局跳变。
  - 普通页面：`min-h-dvh`
  - 应用外壳布局（如 `app/freetalk`，根节点 `flex flex-col` + 子节点 `flex-1 overflow-hidden`）：必须用 `h-dvh`（需要确定高度）
- **安全区工具类**（定义在 `app/globals.css`）：`pt-safe-3` / `pt-safe-4` / `pb-safe-4`。
  - 依赖 `app/layout.tsx` 的 `viewport.viewportFit = 'cover'`，缺了这步全部失效。
  - 只能与**不同方向**的 padding 搭配，例如 `px-4 pt-safe-4 pb-4`；**不可**与 `p-4` / `py-4` 共用，否则 padding 覆盖顺序不确定。
  - Tailwind 会清除未使用的工具类；新增后如未生效，先确认是否真的被引用。
- 输入控件已在 `components/ui/input.tsx` / `textarea.tsx` 用 `text-base md:text-sm`，移动端为 16px，不会触发 iOS 聚焦缩放，不要再改小。

## 已知待办

- `app/freetalk/page.tsx` 的录音仍使用浏览器 `SpeechRecognition`（`speechSupported`），未与 `app/practice/page.tsx` 对齐到 `MediaRecorder` + `/api/stt`；iOS Safari 上可能不可用。
- `app/api/tts/route.ts` 存在协议不匹配缺陷：URL 用阿里云 NLS 网关（`nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/tts`），请求体却是 CosyVoice 多模态格式（`model: 'cosyvoice-v1'`），两套协议不兼容，且模型版本已过时。
- 小程序方向已暂停（备案 + 主体 + 常驻后端成本过高），优先做 Web 移动端。
