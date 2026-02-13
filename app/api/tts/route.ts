import { NextRequest, NextResponse } from 'next/server'

// 通义千问 TTS API - 使用 CosyVoice 语音合成
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || ''
const TTS_API_URL = 'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/tts'

// 使用通义千问的语音合成 API
const COSYVOICE_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'longxiaochun' } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: '缺少文本参数' },
        { status: 400 }
      )
    }

    if (!DASHSCOPE_API_KEY) {
      // 如果没有配置 API Key，返回一个提示
      return NextResponse.json(
        { error: '未配置 DASHSCOPE_API_KEY 环境变量' },
        { status: 500 }
      )
    }

    // 调用通义千问 CosyVoice 语音合成 API
    // 文档: https://help.aliyun.com/zh/dashscope/developer-reference/cosyvoice-quick-start
    const response = await fetch(TTS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'cosyvoice-v1',
        input: {
          text: text,
        },
        parameters: {
          voice: voice, // 可选: longxiaochun, longxiaoxia, longxiaohua 等
          format: 'mp3',
          sample_rate: 22050,
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('TTS API Error:', errorData)
      return NextResponse.json(
        { error: '语音合成失败', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // 返回音频 URL 或 base64 数据
    if (data.output?.audio_url) {
      return NextResponse.json({
        success: true,
        audioUrl: data.output.audio_url
      })
    } else if (data.output?.audio) {
      // 如果返回的是 base64 音频数据
      return NextResponse.json({
        success: true,
        audioData: data.output.audio,
        format: 'mp3'
      })
    }

    return NextResponse.json(
      { error: '语音合成返回格式异常', data },
      { status: 500 }
    )

  } catch (error) {
    console.error('TTS Error:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
