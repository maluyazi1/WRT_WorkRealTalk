import { NextRequest, NextResponse } from 'next/server'

// Qwen API 配置（OpenAI 兼容模式）
const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || ''
const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const QWEN_API_URL = `${QWEN_BASE_URL}/chat/completions`

// 评估结果类型定义
interface EvaluationResult {
  score: number // 0-100 分
  suggestedAnswer: string // 建议的改进答案
  keyPhrases: string[] // 推荐的关键短语
  corrections: string[] // 错误纠正列表
  feedback: string // 综合反馈（中文）
}

// System Prompt for Answer Evaluation
const SYSTEM_PROMPT_EVALUATE = `你是一个专业的英语口语教练，专注于职场英语表达的评估和改进。

你的任务是评估用户的英语回答，并提供详细的反馈。

评估标准：
1. 语法正确性 (30%)
2. 表达地道性 (30%)
3. 内容完整性 (20%)
4. 语境适当性 (20%)

输出要求：
1. 必须输出纯 JSON 格式，不要包含任何 Markdown 代码块标记
2. score: 0-100 的整数分数
3. suggestedAnswer: 改进后的参考答案
4. keyPhrases: 推荐学习的 2-4 个关键短语
5. corrections: 具体的错误纠正列表（如果有）
6. feedback: 综合反馈（中文，50-100字）

JSON 结构：
{
  "score": 85,
  "suggestedAnswer": "改进后的英文答案",
  "keyPhrases": ["关键短语1", "关键短语2"],
  "corrections": ["错误1 -> 正确1", "错误2 -> 正确2"],
  "feedback": "综合评价和学习建议（中文）"
}

注意：
- 即使用户回答有错误，也要给予鼓励性反馈
- corrections 数组可以为空（如果没有明显错误）
- 评分要客观公正，不要过于严苛或宽松`

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json()
    const { prompt, userAnswer } = body

    // 验证参数
    if (!prompt || !userAnswer) {
      return NextResponse.json(
        { error: 'Both prompt and userAnswer are required.' },
        { status: 400 }
      )
    }

    if (!QWEN_API_KEY) {
      return NextResponse.json(
        { error: 'Qwen API Key 未配置' },
        { status: 500 }
      )
    }

    // 构建评估 Prompt
    const evaluationPrompt = `请评估以下用户的英语回答：

【场景提示（用户需要表达的内容）】
${prompt}

【用户的英语回答】
${userAnswer}

请根据评估标准，提供详细的评分和反馈。严格按照 JSON 格式输出，不要添加任何额外文字或代码块标记。`

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
          { role: 'system', content: SYSTEM_PROMPT_EVALUATE },
          { role: 'user', content: evaluationPrompt }
        ],
        temperature: 0.5,
        top_p: 0.9,
        max_tokens: 1024,
        stream: false
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Qwen API Error:', errorText)
      return NextResponse.json(
        { error: 'Failed to evaluate answer with Qwen.' },
        { status: 500 }
      )
    }

    const data = await response.json()
    let text = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || ''

    // 清理可能的 Markdown 代码块标记
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // 解析 JSON
    let evaluation: EvaluationResult
    try {
      evaluation = JSON.parse(text)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      console.error('Raw text:', text)
      return NextResponse.json(
        { error: 'Failed to parse AI evaluation response' },
        { status: 500 }
      )
    }

    // 验证数据结构
    if (
      typeof evaluation.score !== 'number' ||
      !evaluation.suggestedAnswer ||
      !Array.isArray(evaluation.keyPhrases) ||
      !Array.isArray(evaluation.corrections) ||
      !evaluation.feedback
    ) {
      return NextResponse.json(
        { error: 'Invalid evaluation structure from AI' },
        { status: 500 }
      )
    }

    // 确保分数在 0-100 范围内
    evaluation.score = Math.max(0, Math.min(100, evaluation.score))

    return NextResponse.json(evaluation)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate answer. Please try again.' },
      { status: 500 }
    )
  }
}
