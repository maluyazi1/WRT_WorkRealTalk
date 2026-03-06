# RealTalk 职场英语实战

> 在真实对话流中即学即用，跨越“知道单词但不会应用”的鸿沟。

**RealTalk** 是一款专为大学生及职场新人设计的 AI 驱动职场英语学习平台。通过模拟真实业务语境中的角色扮演对话，采用“提示 -> 思考 -> 表达 -> 翻牌核对”的沉浸式自测学习模式，帮助用户低成本、高效率地提升职场环境下的英语实战和即兴表达能力。

---

## ✨ 核心功能

- **🚀 极速定向练习 (Level-based Practice)**  
  直连云端高质量职场语料库（BigQuery），按初、中、高难度划分。实现“零延迟”抽题，涵盖日常沟通、专业汇报、危机处理等真实场景，还原最地道的职场表达。
  
- **🎯 专属场景定制 (Custom Scenario Practice)**  
  支持输入自定义主题（如：“物流催单”、“薪资谈判”），系统会结合职场语料种子，通过 AI 实时为你量身打造 4-6 轮的专属角色扮演情景。
  
- **🗣️ AI 实时口语搭子 (AI Speaking Buddy)**  
  非结构化自由对话模式，提供全真全沉浸的英文聊天环境，随时随地锻炼你的即兴反应和口语语感。
  
- **💡 智能反馈与纠错 (AI Evaluation)**  
  录音结束后，AI 会根据你的回答进行多维度评估，提供具体评分、语法纠错、以及更地道的职场高频词组（Key Phrases）替换建议。

- **📒 智能生词本 (Smart Vocabulary)**
  练习过程中，对于不会的高频短语可一键标亮并收藏入库。AI 将自动为你扩写音标、双语释义及结合语境的真实造句。

---

## 🚀 快速开始

### 1. 环境准备

确保本地已安装 [Node.js](https://nodejs.org/) (推荐版本 v18 或以上)。

### 2. 克隆项目

```bash
git clone https://github.com/maluyazi1/WRT_WorkRealTalk.git
cd WRT_WorkRealTalk
```

### 3. 安装依赖

```bash
npm install
```

### 4. 设置环境变量

在项目根目录下新建 `.env.local` 文件，并根据你的实际环境填入必要的 API 授权秘钥（大模型授权及 GCP 数据库凭证）：

```bash
# 阿里云通义千问 API Key (用于 AI 文本生成及语音处理)
DASHSCOPE_API_KEY=your_dashscope_api_key_here

# Google Cloud BigQuery 凭证文件 (压缩为单行 JSON 字符串)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key":"..."}
```

### 5. 本地启动服务

```bash
npm run dev
```

终端显示启动成功后，在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可开始体验！

---

## 🛠 技术栈

- **前端框架**: Next.js 14, React, TailwindCSS, Shadcn UI
- **大语言模型**: 通义千问 Qwen-Max (场景生成及综合评估)
- **云端数据仓库**: Google Cloud BigQuery (存储海量优质语料)
- **API 接口与渲染**: RESTful API / Next.js API Routes
- **持续集成与部署**: Vercel

---

## 📂 目录结构

```text
.
├── app/                  # Next.js App Router 前端页面及后端 API 路由
│   ├── api/              # API 接口 (场景生成、AI 评估、生词查询等)
│   ├── freetalk/         # AI 自由口语对练页面
│   ├── practice/         # 场景实战练习核心页面
│   ├── layout.tsx        # 全局页面布局
│   └── page.tsx          # 平台首页入口
├── components/           # 页面复用组件 (UI、布局等)
├── hooks/                # React 自定义 Hook (语音录制、生词本本地状态管理等)
├── MediaCrawler/         # 语料数据爬虫及语料库构建工具
├── .env.local            # 本地环境变量配置（不加入版本控制）
└── README.md             # 本说明文档
```

---

> **注意**：本项目定位为职场英语实战辅助工具，AI 生成的对话提示和评估内容仅供语言学习参考。
