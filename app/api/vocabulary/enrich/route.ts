import { NextRequest, NextResponse } from 'next/server'
import { pickLLMProvider, callLLM } from '@/lib/llm'

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

    const provider = pickLLMProvider()
    if (!provider) {
      return NextResponse.json(
        { error: '未配置 DEEPSEEK_API_KEY 或 DASHSCOPE_API_KEY' },
        { status: 500 }
      )
    }
    
    const llm = await callLLM(provider, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      jsonMode: true,
    })

    if (!llm.ok) {
      return NextResponse.json(
        { error: llm.message, provider: llm.provider },
        { status: llm.status }
      )
    }

    const content = llm.text

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
