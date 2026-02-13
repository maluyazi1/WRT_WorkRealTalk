import { NextRequest, NextResponse } from 'next/server'

// 通义千问 API 配置（OpenAI 兼容模式）
const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || ''
const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const QWEN_API_URL = `${QWEN_BASE_URL}/chat/completions`

// System Prompt for Free Talk Mode
const SYSTEM_PROMPT = `从现在开始，你是一位 native English speaker（英语母语者）兼语言导师。
你的任务是帮助用户提升口语和听力，让表达更自然、流利、地道。用户的英文水平是刚好过了六级，请你以比用户水平高一点的英文进行对话。

请严格按照以下方式互动：

1. 全程使用英语对话。
   - 如果用户既说了中文又说了英文，表明用户不会用英文说这段中文。此时先教用户把这段话说成英文，再继续对话。
   - 当用户用中文说话时，帮用户翻译成自然的英文。
   - 当用户用英文说话时，不要翻译成中文。
   - 保持对话在英文环境中。

2. 扮演母语者角色与用户对话。
   - 保持自然口语表达，像真实的英语母语者一样交谈。
   - 不要用过度书面或机械的语气。

3. 纠正与反馈规则：
   - 无论何时用户出现语法或表达问题，立即纠正。
   - 当用户的表达正确但不太地道、有中式英语感觉时，告诉用户更流畅的表达方式。

4. 生词与短语学习：
   - 每当用户遇到新的单词或短语，教用户它的意思和用法。
   - 引导用户多造句、多练习。

5. 语气与教学风格：
   - 使用鼓励式教育风格。
   - 在学术讨论时保持严谨认真。
   - 单词来源基于牛津词典。

【重要】你必须严格按照以下 JSON 格式返回，不要包含任何 Markdown 代码块标记：
{
  "reply": "你的英文回复内容",
  "correction": {
    "hasError": true/false,
    "userSaid": "用户原本说的内容（如果有错误）",
    "shouldSay": "正确/地道的表达方式",
    "explanation": "简短的中文解释"
  },
  "vocabulary": {
    "hasNewWord": true/false,
    "word": "新单词",
    "phonetic": "音标",
    "chinese": "中文释义",
    "englishExplanation": "英文解释",
    "example": "例句"
  }
}

如果没有需要纠正的内容，correction.hasError 设为 false，其他字段可以省略。
如果没有新词汇，vocabulary.hasNewWord 设为 false，其他字段可以省略。`

// 对话历史类型
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// 响应结构类型
interface FreeTalkResponse {
  reply: string
  correction?: {
    hasError: boolean
    userSaid?: string
    shouldSay?: string
    explanation?: string
  }
  vocabulary?: {
    hasNewWord: boolean
    word?: string
    phonetic?: string
    chinese?: string
    englishExplanation?: string
    example?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history = [] } = body as { message: string; history: ChatMessage[] }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!QWEN_API_KEY) {
      return NextResponse.json(
        { error: 'API Key 未配置' },
        { status: 500 }
      )
    }

    // 构建消息数组
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: message }
    ]

    // 调用 Qwen API
    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen3-max',
        messages,
        temperature: 0.8,
        top_p: 0.95,
        max_tokens: 1024,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Qwen API Error:', errorText)
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
        { status: 500 }
      )
    }

    const data = await response.json()
    let text = data.choices?.[0]?.message?.content || ''

    // 清理可能的 Markdown 代码块标记
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // 尝试提取 JSON（处理模型可能在 JSON 前后添加文字的情况）
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      text = jsonMatch[0]
    }

    // 解析 JSON
    let result: FreeTalkResponse
    try {
      result = JSON.parse(text)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      console.error('Raw text:', text)
      // 如果解析失败，返回原始文本作为回复
      result = {
        reply: text,
        correction: { hasError: false },
        vocabulary: { hasNewWord: false }
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    )
  }
}
