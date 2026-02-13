import { NextRequest, NextResponse } from 'next/server'

// 使用 DeepSeek 进行评分和纠错
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

export async function POST(request: NextRequest) {
  try {
    const { userText, referenceText, userPrompt, topic } = await request.json()

    if (!userText || !referenceText) {
      return NextResponse.json(
        { error: '缺少必要的参数' },
        { status: 400 }
      )
    }

    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: '未配置 DEEPSEEK_API_KEY 环境变量' },
        { status: 500 }
      )
    }

    const conversationContext = request.headers.get('X-Conversation-Context') || '';

    const systemPrompt = `你是一位拥有10年经验的资深口语沟通教练。你的学生正在练习口语，你的任务是基于输入的所有数据，精准地评价学生的【实际回答】。

请严格遵守以下评价逻辑：

1. 预处理规则 
忽略 ASR 错误：不要评价拼写错误、标点符号缺失或大小写问题。默认这些是识别问题，不是用户的口语问题。
关注口语表达的听感：只关注这句话说出来是否口语化，是否自然、是否符合礼仪、是否“中式英语”。

2. 核心任务：差异分析
请仔细比对【用户的实际回答】 和【参考答案】，参照英语口语交流的标准：
意图一致性：用户是否表达了和参考答案相同的意思？
语气和用词差异 ： 用户的回答是否相比之下显得太生硬或太书面？太于冗余或者啰嗦？


5.json 输出内容：
*feedback* (String, 中文, 不超过200字，但也不要太简短):
    要点：拒绝废话，不要说“总体表达不错”、“有一些小错误”这种无关痛痒的话。禁止以“用户表达意图基本一致”、“意思基本传达”、“总体不错”等废话开头。直接说问题！
    严禁纠结 ASR 错误：如果用户说 'ang'、'hullo'、'plz'，默认这是语音识别噪音，直接忽略，不要在反馈中提到拼写错误。
    严禁只给建议不给原因：所有建议必须明确指出原因，例如“这个词在什么情境下更地道、更自然”，而不是简单说“你可以用这个词”。
    重点是英语母语者一般会怎么表达？用户的表达是否具有语法错误？如果有，怎么修改比较符合口语化的表达？


*alternative_expressions*(不要带标点符号):
    提供 2-3 个高频、短、地道的替代口语短语或者单词。
    不要整句：只给关键的那个“梗”或“短语动词”。
    例如：不要给 "I think you should verify it again."，要给 ["Double check", "Give it a second look"]。

输入数据：
1. 场景/话题: ${topic}
2. 用户的目标: ${userPrompt}
3. 参考答案: ${referenceText}
4. 用户的实际回答: ${userText}
5. 上下文: ${conversationContext}

请确保输出为 JSON 格式。`

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `用户回答: "${userText}"` }
        ],
        temperature: 1.0,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('DeepSeek API Error:', errorData)
      return NextResponse.json(
        { error: '评分服务暂时不可用' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices[0].message.content
    
    try {
      const result = JSON.parse(content)
      return NextResponse.json(result)
    } catch (e) {
      console.error('JSON Parse Error:', content)
      return NextResponse.json(
        { error: '评分结果解析失败' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Evaluation Error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
