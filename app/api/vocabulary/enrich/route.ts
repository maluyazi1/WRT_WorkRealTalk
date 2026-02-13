import { NextRequest, NextResponse } from 'next/server'

// 通义千问 API 配置
const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || ''
const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const QWEN_API_URL = `${QWEN_BASE_URL}/chat/completions`

const SYSTEM_PROMPT = `你是一个专业的英语词汇助手。请为用户提供的英语单词或短语提供详细的学习资料。
必须返回纯 JSON 格式，包含以下字段：
- word: 原词/短语
- phonetic: 音标 (IPA)
- chinese: 中文释义 (简单易懂，适合学习者)
- example: 例句 (包含英文句子和中文翻译)`

export async function POST(request: NextRequest) {
  try {
    const { word, context } = await request.json()

    if (!word) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 })
    }

    const userPrompt = `请解释这个单词/短语: "${word}"。${context ? `上下文语境: ${context}` : ''}
    
    请严格按照JSON格式返回，不要包含Markdown格式化。
    Example JSON structure:
    {
      "word": "word",
      "phonetic": "/wɜːrd/",
      "chinese": "单词",
      "example": "He wrote the word on the blackboard. 他在黑板上写下了这个单词。"
    }`

    const payload = {
      model: 'qwen3-max', // 或者使用 qwen-max
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    }

    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content
    
    let result
    try {
      result = JSON.parse(content)
    } catch (e) {
      // Fallback if model returns markdown json block
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1] || jsonMatch[0])
      } else {
        throw new Error('Failed to parse JSON response')
      }
    }

    // Remove englishExplanation from the result
    delete result.englishExplanation

    return NextResponse.json(result)

  } catch (error) {
    console.error('Vocabulary enrich error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}
