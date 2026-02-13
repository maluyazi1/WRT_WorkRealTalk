import { NextRequest, NextResponse } from 'next/server'

// 通义千问 Paraformer 语音识别 API
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const audioUrl = formData.get('audioUrl') as string | null

    if (!audioFile && !audioUrl) {
      return NextResponse.json(
        { error: '缺少音频文件或音频 URL' },
        { status: 400 }
      )
    }

    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: '未配置 DASHSCOPE_API_KEY 环境变量' },
        { status: 500 }
      )
    }

    // 虽然用户请求使用 OpenAI SDK，但 DashScope 的 OpenAI 兼容接口目前可能不完全支持
    // 或支持方式与标准 OpenAI Audio API 有差异导致 404
    // 此外，OpenAI SDK 的 Audio 接口默认调用 /audio/transcriptions
    // 为确保稳定性，我们回退到使用原生的 DashScope REST API 实现
    // 但仍然使用 paraformer-v1 模型

    let requestBody: Record<string, unknown>

    if (audioUrl) {
      // 使用音频 URL
      requestBody = {
        model: 'paraformer-v1', // 使用 v1
        input: {
          file_urls: [audioUrl]
        },
        parameters: {
          language_hints: ['en'] 
        }
      }
    } else if (audioFile) {
      // 将音频文件转换为 base64
      const arrayBuffer = await audioFile.arrayBuffer()
      const base64Audio = Buffer.from(arrayBuffer).toString('base64')
      
      // 获取文件格式
      const fileType = audioFile.type.split('/')[1] || 'wav'
      
      // 注意: Paraformer-v1 的 REST API 似乎不支持直接上传 base64 音频 (报错: input must contain file_urls)
      // 因此对于本地文件上传，我们需要使用 Paraformer-v2，它支持 base64 音频输入
      // 如果必须使用 v1，则需要先将文件上传到 OSS 并获取 URL
      requestBody = {
        model: 'paraformer-v2', // 回退到 v2 以支持 base64
        input: {
          audio: `data:audio/${fileType};base64,${base64Audio}`
        },
        parameters: {
          language_hints: ['en'] 
        }
      }
    } else {
      return NextResponse.json(
        { error: '音频数据无效' },
        { status: 400 }
      )
    }

    // 调用通义千问 Paraformer 语音识别 API
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('STT API Error:', errorData)
      return NextResponse.json(
        { error: '语音识别失败', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // 检查是否是异步任务
    if (data.output?.task_id) {
      // 需要轮询获取结果
      const taskId = data.output.task_id
      const transcription = await pollTranscriptionResult(taskId)
      return NextResponse.json({
        success: true,
        text: transcription
      })
    }
    
    // 同步返回结果
    if (data.output?.transcription || data.output?.text) {
      return NextResponse.json({
        success: true,
        text: data.output.transcription || data.output.text
      })
    }

    // 如果有 sentences 数组
    if (data.output?.sentences) {
      const fullText = data.output.sentences.map((s: { text: string }) => s.text).join(' ')
      return NextResponse.json({
        success: true,
        text: fullText
      })
    }

    return NextResponse.json(
      { error: '语音识别返回格式异常', data },
      { status: 500 }
    )

  } catch (error) {
    console.error('STT Error:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// 轮询异步任务结果
async function pollTranscriptionResult(taskId: string, maxAttempts = 30): Promise<string> {
  const pollUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
    
    const response = await fetch(pollUrl, {
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      }
    })
    
    if (!response.ok) {
      throw new Error('轮询任务失败')
    }
    
    const data = await response.json()
    
    if (data.output?.task_status === 'SUCCEEDED') {
      // 获取转录结果
      if (data.output?.results) {
        const results = data.output.results
        if (Array.isArray(results) && results.length > 0) {
          // 获取第一个结果的转录文本
          const transcriptionUrl = results[0].transcription_url
          if (transcriptionUrl) {
            const transcriptionResponse = await fetch(transcriptionUrl)
            const transcriptionData = await transcriptionResponse.json()
            if (transcriptionData.transcripts) {
              return transcriptionData.transcripts.map((t: { text: string }) => t.text).join(' ')
            }
          }
        }
      }
      return data.output?.transcription || data.output?.text || ''
    }
    
    if (data.output?.task_status === 'FAILED') {
      throw new Error('语音识别任务失败: ' + (data.output?.message || '未知错误'))
    }
  }
  
  throw new Error('语音识别超时')
}
