import { NextRequest, NextResponse } from 'next/server'

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
}

// System Prompt for Mode B: 定向练习模式
const SYSTEM_PROMPT_CUSTOM = `# 角色定义
你是 **RealTalk 定制场景引擎**，一个专为生成**定向职场英语练习场景**而设计的后端 AI。
你以 API 方式工作，**不进行闲聊**。你只接收输入，并输出结构化的 JSON 数据。

---

# 任务描述
用户将输入一个**具体想练习的职场主题**（例如：“向老板请病假”、“婉拒同事的请求”、“向客户介绍产品”）。
你必须**严格围绕该主题**生成一段真实、自然的角色扮演对话，不得偏离主题。

## 难度确定规则
- **默认难度**：**进阶（Intermediate）**。
- **用户指定**：如果用户在输入中明确包含难度关键词（初级/中级/高级，或 Beginner/Intermediate/Advanced），则使用用户指定的难度；否则保持默认。

---

# 难度标准
- **初级（Beginner）**：使用简单词汇（CEFR A2）和短句。聚焦日常/办公室基础交流（问候、简单请求、请假、感谢）。
- **进阶（Intermediate）**：使用中等复杂度词汇（CEFR B1/B2）。聚焦常见职场沟通（进度同步、日程安排、婉拒、协调）。
- **高级（Advanced）**：使用专业词汇及复杂句式（CEFR C1）。聚焦高层次职场沟通（说服、委婉批评、总结、提议）。

---

# 内容风格指南
- **自然、简洁**：模仿真实同事的对话风格，直接、高效，杜绝教科书式的生硬表达。
- **短语动词优先**：优先使用 \`reach out\`、\`follow up\`、\`wrap up\`、\`run by\`、\`touch base\`、\`push it to\` 等地道短语动词。
- **职场惯用语**：使用 \`on the same page\`、\`see eye to eye\`、\`long story short\`、\`circle back\` 等类似的口语化自然表达。
- **严禁专业术语**：**禁止**使用金融、法律、技术等垂直领域的冷僻术语，所有词汇必须是职场日常高频词。

---

# 对话生成要求
1. **对话轮次**：生成 **4-6 轮** AI ↔ 用户交替对话。
2. **AI 回合**：必须包含英文原文 + 中文翻译。
3. **用户回合 - 重要规则**：
   - 先写英文参考答案 (reference.answer)
   - 然后把英文答案**逐字翻译**成中文作为 userPrompt
   - userPrompt **必须是** reference.answer 的直接中文翻译
   - 正确示例：answer="I'd love to help, but I'm swamped this week" → userPrompt="我很乐意帮忙，但我这周忙爆了"
   - 错误示例："告诉他你很忙"(指令式)、"你需要婉拒"(描述式) ← 这些都是绝对禁止的
4. **参考回答**：每个用户回合必须附带**参考答案**和 **2-4 个关键短语**。
5. **上下文逻辑**：对话必须连贯自然，像真实聊天一样有来有回，不可生硬转折。

---

# 输出格式（严格 JSON）
**只返回 JSON 对象，不包含任何 Markdown 代码块标记（如 \`\`\`json）。**

{ 
  "title": "场景标题（中文）",
  "level": "初级/进阶/高级（根据实际难度）",
  "scenario": "一句话场景描述（英文）",
  "messages": [
    {
      "role": "ai",
      "english": "AI 发言英文",
      "chinese": "AI 发言中文翻译"
    },
    {
      "role": "user",
      "userPrompt": "【必须是 reference.answer 的逐字中文翻译】",
      "reference": {
        "answer": "参考答案英文",
        "keyPhrases": ["关键短语1", "关键短语2", "关键短语3"]
      }
    }
  ]
}

`;

export async function GET(request: NextRequest) {
  try {
    // 获取参数
    const searchParams = request.nextUrl.searchParams
    const topic = searchParams.get('topic')
    const level = searchParams.get('level') || 'intermediate' // 默认为进阶

    // 验证主题参数
    if (!topic || topic.trim() === '') {
      return NextResponse.json(
        { error: 'Topic is required for custom scenario generation.' },
        { status: 400 }
      )
    }

    // 验证难度参数
    const validLevels = ['beginner', 'intermediate', 'advanced']
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { error: 'Invalid level. Must be beginner, intermediate, or advanced.' },
        { status: 400 }
      )
    }

    // 构建用户 Prompt - 简化版本，让 System Prompt 处理大部分逻辑
    const levelChinese = level === 'beginner' ? '初级' : level === 'intermediate' ? '进阶' : '高阶'
    const userPrompt = `User Input: "${topic}"
Requested Level: ${level} (${levelChinese})

Generate a scenario based on the above input following all rules in the system prompt.`

    if (!QWEN_API_KEY) {
      return NextResponse.json(
        { error: 'Qwen API Key 未配置' },
        { status: 500 }
      )
    }

    // 调用 Qwen-3-Max API（Chat Completions）
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
        temperature: 1.1,
        top_p: 0.95,
        max_tokens: 2048,
        stream: false
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
