import { NextRequest, NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

// Initialize BigQuery client
const initGoogleCredentials = () => {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) return undefined;
  try {
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    if (creds.private_key) {
      creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }
    return creds;
  } catch (e) {
    console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON", e);
    return undefined;
  }
};

const bigquery = new BigQuery({
  projectId: 'sturdy-lore-480006-e6',
  credentials: initGoogleCredentials(),
});

// Qwen API 配置（OpenAI 兼容模式）
const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || ''
const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const QWEN_API_URL = `${QWEN_BASE_URL}/chat/completions`

// 场景数据结构类型定义
interface Message {
  role: 'ai' | 'user'
  english?: string
  chinese?: string
  userPrompt?: string
  reference?: {
    answer: string
    keyPhrases: string[]
  }
}

interface Scenario {
  title: string
  scenario: string
  messages: Message[]
  keywords_pool?: string[]
}

// System Prompt for Custom Scenario Generation
const SYSTEM_PROMPT_CUSTOM = `# 角色定义
你是 **RealTalk 定制场景引擎**，专为生成**职场英语练习场景**的后端 AI。
你只输出结构化 JSON，不闲聊。

---

# ⚠️ 最高优先级规则：userPrompt 必须是 reference.answer 的逐字中文翻译

**这是本系统最重要的规则，违反此规则的输出将被视为无效。**

## 规则详解
- userPrompt 的作用：显示在用户屏幕上，用户看着这段中文来说出对应的英文。
- 因此 userPrompt **必须是 reference.answer 的逐字、逐句中文翻译**。
- **绝对禁止**：指令式（如"告诉他你很忙"）、概括式（如"确认需要完成的具体内容"）、描述式（如"你需要婉拒"）。

## 正确示例
| reference.answer | userPrompt (✅ 正确) |
|---|---|
| "I'd love to help, but I'm swamped this week." | "我很乐意帮忙，但我这周忙得不可开交。" |
| "Could we push the deadline to next Wednesday?" | "我们能把截止日期推迟到下周三吗？" |
| "Let me circle back on that after the meeting." | "会后我再回头跟进这件事。" |

## 错误示例
| reference.answer | userPrompt (❌ 错误) | 错误原因 |
|---|---|---|
| "I'd love to help, but I'm swamped this week." | "婉拒同事的请求" | 指令式概括 |
| "Could we push the deadline to next Wednesday?" | "请求延长截止日期" | 内容大意 |
| "Let me circle back on that after the meeting." | "告诉对方会后再讨论" | 描述式指令 |

---

# 任务描述
用户输入一个**职场主题**，你围绕该主题生成角色扮演对话。

## 综合生成逻辑
如果 Prompt 附带 "SEED CONTEXT"（种子语料）：
1. 参考种子的地道表达风格。
2. 将地道表达应用到用户主题中。
3. 不直接复制种子内容。

---

# 对话生成要求
1. 生成 **4-6 轮** AI ↔ 用户交替对话。
2. **AI 回合**：包含 english（英文原文）+ chinese（中文翻译，同样必须是逐字翻译）。
3. **用户回合**：
   - 先写 reference.answer（英文参考答案）
   - 再把 reference.answer **逐字翻译**成中文，填入 userPrompt
   - userPrompt 和 reference.answer 必须一一对应
4. 包含 keywords_pool（3-5 个核心关键词/短语）。

---

# 输出格式（严格 JSON）
{ 
  "title": "场景标题（中文）",
  "level": "初级/进阶/高级",
  "scenario": "一句话场景描述（英文）",
  "keywords_pool": ["keyword1", "keyword2", "keyword3"],
  "messages": [
    {
      "role": "ai",
      "english": "AI 发言（英文）",
      "chinese": "AI 发言（逐字中文翻译）"
    },
    {
      "role": "user",
      "userPrompt": "reference.answer 的逐字中文翻译",
      "reference": {
        "answer": "参考答案（英文）",
        "keyPhrases": ["关键短语1", "关键短语2"]
      }
    }
  ]
}
`;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const topic = searchParams.get('topic')
    const level = searchParams.get('level') || 'intermediate'

    if (!topic || topic.trim() === '') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // step 1: 寻找种子语料辅助生成
    let seedContext = "";
    try {
      const query = `SELECT task_description, example_json, keywords_pool FROM \`sturdy-lore-480006-e6.corpus_data.xhs_structured_corpus\` LIMIT 50`;
      const [rows] = await bigquery.query({ query });

      const keywords = topic.split(/\s+/).filter(w => w.length > 1);
      const matched = rows.filter((r: any) =>
        keywords.some(kw => (r.task_description || "").toLowerCase().includes(kw.toLowerCase()))
      );
      const seed = matched.length > 0 ? matched[0] : rows[Math.floor(Math.random() * rows.length)];

      if (seed) {
        seedContext = `
### SEED CONTEXT (For inspiration):
- Style Reference: ${seed.task_description}
- Example Patterns: ${seed.example_json}
- Featured Keywords: ${seed.keywords_pool?.join(", ")}
        `;
      }
    } catch (e: any) {
      console.warn("Seed fetch skip", e);
      // 可选：如果希望即便种子失败也要让前端知道详情，可以在这里记录或调整逻辑
    }

    const userPrompt = `User Topic: "${topic}"
Level: ${level}
${seedContext}

Generate a scenario following all system rules.`;

    if (!QWEN_API_KEY) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 })

    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen3-max',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_CUSTOM },
          { role: 'user', content: userPrompt }
        ],
        temperature: 1.0,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Qwen API Error:', errorText)

      let errorMessage = 'AI 服务请求失败'
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'API Key 无效或已过期，请检查 DASHSCOPE_API_KEY 配置'
      } else if (response.status === 429) {
        errorMessage = 'API 请求频率超限，请稍后重试'
      } else if (response.status >= 500) {
        errorMessage = 'AI 服务暂时不可用，请稍后重试'
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    const data = await response.json()
    let text = data.choices[0].message.content

    // 清理可能的 Markdown 代码块标记
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()


    // 解析 JSON
    let scenario: Scenario
    try {
      scenario = JSON.parse(text)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      console.error('Raw text:', text)
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      )
    }

    // 验证数据结构
    if (!scenario.title || !scenario.scenario || !Array.isArray(scenario.messages)) {
      return NextResponse.json(
        { error: 'Invalid scenario structure from AI' },
        { status: 500 }
      )
    }

    // 格式标准化，兼容由于 Prompt 跟随 BQ 种子导致的字段变量 (en/zh -> english/chinese)
    scenario.messages = scenario.messages.map((msg: any) => {
      const english = msg.english || msg.en || msg.english_text || '';
      const chinese = msg.chinese || msg.zh || msg.chinese_text || '';
      let reference = msg.reference;
      if (!reference && msg.referenceAnswer) {
        reference = {
          answer: msg.referenceAnswer,
          keyPhrases: msg.keyPhrases || []
        };
      }
      return {
        ...msg,
        english,
        chinese,
        reference
      };
    });

    return NextResponse.json(scenario)

  } catch (error) {
    console.error('API Error:', error)

    let errorMessage = '场景生成失败，请重试'
    if (error instanceof Error) {
      if (error.message.includes('fetch') || error.message.includes('network') || error.name === 'TypeError') {
        errorMessage = '网络连接失败，请检查网络或代理设置'
      } else if (error.message.includes('timeout')) {
        errorMessage = '请求超时，请检查网络速度或稍后重试'
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
