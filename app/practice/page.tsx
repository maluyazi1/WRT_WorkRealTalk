'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  PixelBubble,
  PixelStamp,
  PixelWave,
  useTypewriter,
} from '@/components/ui/pixel'
import { MessageSquare, Mic, Eye, ArrowRight, Home, Sparkles, Loader2, Check, X, Edit3, MicOff, Star } from 'lucide-react'
import Link from 'next/link'
import { useVocabulary } from '@/hooks/use-vocabulary'
import { useToast } from '@/hooks/use-toast'

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

/* ============================================================
   关键词高亮（纯函数，供气泡与参考答案共用）
   ============================================================ */
function highlightKeywords(
  text: string,
  keywords: string[],
  onPick: (word: string) => void,
) {
  if (!text) return null
  if (!keywords || keywords.length === 0) return text

  // 将关键词按长度倒序排列，优先匹配长词
  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length)
  const pattern = sortedKeywords
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // 转义正则特殊字符
    .join('|')

  if (!pattern) return text
  const regex = new RegExp(`(${pattern})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = keywords.some((k) => k.toLowerCase() === part.toLowerCase())
        if (isMatch) {
          return (
            <span
              key={i}
              // 像素高亮：黄底 + 墨色粗边，不用圆角与柔光
              className="cursor-pointer border-2 border-pixel-ink bg-pixel-highlight px-1 text-pixel-ink transition-colors hover:bg-pixel-warn inline-block"
              onClick={(e) => {
                e.stopPropagation()
                onPick(part)
              }}
              title="点击加入生词本"
            >
              {part}
            </span>
          )
        }
        return part
      })}
    </>
  )
}

/* ============================================================
   AI 气泡：逐字显示 + 像素尾巴
   单独抽成组件是因为逐字显示需要 hook，不能写在 map 循环里。
   ============================================================ */
function AiMessageBubble({
  message,
  keywords,
  showChinese,
  onToggleTranslation,
  renderHighlightedText,
}: {
  message: Message
  keywords?: string[]
  showChinese: boolean
  onToggleTranslation: () => void
  renderHighlightedText: (text: string, keywords?: string[]) => React.ReactNode
}) {
  const { shown, done } = useTypewriter(message.english || '')

  return (
    <div className="flex flex-col items-start gap-2">
      <PixelBubble who="AI" side="left">
        <p className="px-mono text-sm leading-relaxed md:text-base">
          {renderHighlightedText(shown, keywords)}
          {/* 光标只在逐字过程中闪烁，打完即消失 */}
          {!done && (
            <span className="anim-blink ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-pixel-highlight align-middle" />
          )}
        </p>
        {showChinese && (
          <p className="mt-2 border-t-2 border-pixel-ink pt-2 text-xs text-pixel-ink-dim">
            {message.chinese}
          </p>
        )}
      </PixelBubble>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={onToggleTranslation}
        >
          <Eye className="mr-1 h-3 w-3" />
          {showChinese ? '隐藏' : '查看'}翻译
        </Button>
      </div>
    </div>
  )
}

function PracticeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get('mode')
  const level = searchParams.get('level') || 'beginner'
  const topic = searchParams.get('topic')

  // 使用全局生词本 hook
  const { isWordSaved, addWord, vocabList } = useVocabulary()
  const { toast } = useToast()
  const [addingWords, setAddingWords] = useState<Set<string>>(new Set())

  const handleAddToVocab = async (phrase: string, context?: string) => {
    if (isWordSaved(phrase)) return

    setAddingWords(prev => new Set(prev).add(phrase))
    toast({
      title: "正在收录...",
      description: "AI 正在为单词生成的详细解释...",
    })

    try {
      const res = await fetch('/api/vocabulary/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: phrase, context })
      })

      if (!res.ok) throw new Error('Enrich API failed')

      const enrichedData = await res.json()
      addWord({
        ...enrichedData,
        source: 'practice'
      })

      toast({
        title: "已添加到生词本",
        description: `${phrase} 已收录`,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "收录失败",
        description: "请稍后重试",
        variant: "destructive"
      })
    } finally {
      setAddingWords(prev => {
        const next = new Set(prev)
        next.delete(phrase)
        return next
      })
    }
  }

  // 高亮关键词并支持点击收藏
  const renderHighlightedText = (text: string, keywords: string[] = []) => {
    return highlightKeywords(text, keywords, (word) =>
      handleAddToVocab(word, text),
    )
  }

  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null)
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0)
  const [revealedMessages, setRevealedMessages] = useState<number[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [showReference, setShowReference] = useState(false)
  const [showHint, setShowHint] = useState(false) // 新增：提示状态
  const [evaluation, setEvaluation] = useState<any>(null) // 新增：评分结果
  const [isEvaluating, setIsEvaluating] = useState(false) // 新增：评分加载状态
  const [showTranslation, setShowTranslation] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 音频错误提示
  const [audioError, setAudioError] = useState<string | null>(null)

  // 录音和语音识别状态
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isEditingTranscription, setIsEditingTranscription] = useState(false)
  const [editedTranscription, setEditedTranscription] = useState<string>('')
  const [userConfirmedText, setUserConfirmedText] = useState<string>('')
  const [recordingSeconds, setRecordingSeconds] = useState(0) // 录音计时（秒）
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice') // 输入模式：语音或文字
  const [manualInputText, setManualInputText] = useState<string>('') // 手动输入的文字

  // MediaRecorder 录音相关
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 防抖：追踪是否正在请求中
  const isFetchingRef = useRef(false)
  // 记录上一次请求的参数，避免重复请求
  const lastFetchParamsRef = useRef<string | null>(null)

  // 从后端 API 获取场景
  const fetchScenario = async (forceRefresh = false) => {
    // 构建当前请求参数的唯一标识
    const currentParams = `${mode}-${level}-${topic}`

    // 防抖：如果正在请求中，直接返回
    if (isFetchingRef.current) {
      console.log('fetchScenario: 请求正在进行中，跳过重复调用')
      return
    }

    // 如果不是强制刷新，且参数没有变化，跳过请求
    if (!forceRefresh && lastFetchParamsRef.current === currentParams && currentScenario) {
      console.log('fetchScenario: 参数未变化且已有数据，跳过请求')
      return
    }

    isFetchingRef.current = true
    lastFetchParamsRef.current = currentParams

    setIsLoading(true)
    setError(null)
    setCurrentScenario(null)

    try {
      let url: string

      if (mode === 'custom' && topic) {
        // Mode B: 定向练习 (添加 level 参数)
        url = `/api/scenarios/custom?topic=${encodeURIComponent(topic)}&level=${level}`
      } else {
        // Mode A: 随机探索
        url = `/api/scenarios/random?level=${level}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '未知错误' }))
        let errorMessage = errorData.error || `请求失败 (${response.status})`

        // 根据状态码提供更友好的错误提示
        if (response.status === 401 || response.status === 403) {
          errorMessage = `API 认证失败: ${errorMessage}。请检查 API Key 是否正确配置。`
        } else if (response.status === 429) {
          errorMessage = `请求频率过高: ${errorMessage}。请稍后重试。`
        } else if (response.status >= 500) {
          errorMessage = `服务器错误: ${errorMessage}。AI 服务暂时不可用，请稍后重试。`
        }

        throw new Error(errorMessage)
      }

      const data: Scenario = await response.json()
      setCurrentScenario(data)
    } catch (err) {
      console.error('Error fetching scenario:', err)
      let errorMessage = '加载场景失败'

      if (err instanceof Error) {
        // 判断错误类型并给出更友好的提示
        if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Network') || err.name === 'TypeError') {
          errorMessage = `网络连接失败。请检查您的网络连接或代理设置。`
        } else if (err.message.includes('timeout') || err.message.includes('Timeout')) {
          errorMessage = `请求超时。请检查网络速度或稍后重试。`
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      // 不再使用备用场景，让用户看到错误并重试
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }

  // 使用 useRef 存储初始参数，避免 useEffect 重复触发
  const initialParamsRef = useRef({ mode, level, topic })
  const isFirstRenderRef = useRef(true)

  useEffect(() => {
    // 首次渲染时直接调用
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      fetchScenario()
      return
    }

    // 后续只有当参数真正变化时才调用
    const prevParams = initialParamsRef.current
    if (prevParams.mode !== mode || prevParams.level !== level || prevParams.topic !== topic) {
      initialParamsRef.current = { mode, level, topic }
      fetchScenario()
    }
  }, [mode, level, topic])

  // 组件卸载时释放麦克风与定时器，避免录音残留
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(track => track.stop())
    }
  }, [])

  // 录音资源清理：定时器、麦克风轨道、recorder 引用
  const cleanupRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
  }

  // 挑选浏览器支持的录音编码
  const pickAudioMimeType = () => {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return ''
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || ''
  }

  // 开始录音 - MediaRecorder 采集音频，交给服务端 DashScope 识别（国内可直连，不依赖 Google）
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setAudioError('当前浏览器不支持录音，请切换到「手动输入」')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []

      const mimeType = pickAudioMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      recorder.onerror = () => {
        setAudioError('录音过程出错，请重试')
        setIsRecording(false)
        cleanupRecording()
      }

      recorder.onstop = () => {
        // 去掉 codecs 参数，保证上传的 MIME 干净可解析
        const cleanType = (recorder.mimeType || 'audio/webm').split(';')[0]
        const blob = new Blob(audioChunksRef.current, { type: cleanType })
        cleanupRecording()

        if (blob.size < 1200) {
          setAudioError('录音太短，请多说几句再停止')
          return
        }
        transcribeAudio(blob)
      }

      recorder.start()
      setAudioError(null)
      setIsRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(prev => prev + 1), 1000)
    } catch (err) {
      cleanupRecording()
      const name = (err as { name?: string })?.name
      if (name === 'NotAllowedError') {
        setAudioError('麦克风权限被拒绝，请在浏览器设置中允许访问')
      } else if (name === 'NotFoundError') {
        setAudioError('未检测到麦克风设备')
      } else {
        setAudioError('无法启动录音，请检查麦克风设备或切换到手动输入')
      }
    }
  }

  // 停止录音（真正的上传识别在 recorder.onstop 中触发）
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    } else {
      cleanupRecording()
    }
    setIsRecording(false)
  }

  // 录音按钮处理
  const handleRecord = () => {
    if (isRecording) {
      stopRecording()
      return
    }
    // 重置之前的状态
    setUserConfirmedText('')
    setEditedTranscription('')
    setIsEditingTranscription(false)
    startRecording()
  }

  // 语音转文字 - 使用通义千问 Paraformer（服务端 /api/stt）
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    setAudioError(null)

    try {
      const extension = audioBlob.type.split('/')[1] || 'webm'
      const formData = new FormData()
      formData.append('audio', audioBlob, `recording.${extension}`)

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData
      })

      const data = await response.json().catch(() => ({}) as { text?: string; error?: string })

      if (!response.ok) {
        console.error('STT Error:', data)
        setAudioError(data.error || '语音识别失败，请重试或切换到「手动输入」')
        return
      }

      const text = (data.text || '').trim()
      if (!text) {
        setAudioError('没有识别到内容，请靠近麦克风重试')
        return
      }

      setEditedTranscription(text)
      setIsEditingTranscription(true)
    } catch (err) {
      console.error('Transcription error:', err)
      setAudioError('语音识别服务出错，请重试或切换到「手动输入」')
    } finally {
      setIsTranscribing(false)
    }
  }

  const [historyEvaluations, setHistoryEvaluations] = useState<Record<number, any>>({}) // 新增：保存历史评分
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({}) // 记录每轮实际作答，用于拼装对话上下文

  // 提交并请求评分
  const handleEvaluate = async (text: string) => {
    if (!currentScenario) return

    const currentMessage = currentScenario.messages[currentTurnIndex]
    if (!currentMessage.reference) return

    setIsEvaluating(true)
    setEvaluation(null)

    // 记录本轮作答，并把此前的对话拼成上下文，供评分模型判断表达是否得体
    const answersWithCurrent = { ...userAnswers, [currentTurnIndex]: text }
    setUserAnswers(answersWithCurrent)

    const conversationContext = currentScenario.messages
      .slice(0, currentTurnIndex)
      .map((msg, i) => msg.role === 'ai'
        ? `AI: ${msg.english || ''}`
        : `User: ${answersWithCurrent[i] || '(未作答)'}`)
      .join('\n')

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userText: text,
          referenceText: currentMessage.reference.answer,
          userPrompt: currentMessage.userPrompt,
          topic: currentScenario.title,
          conversationContext
        })
      })

      if (response.ok) {
        const data = await response.json()
        setEvaluation(data)
        // Save evaluation to history
        setHistoryEvaluations(prev => ({
          ...prev,
          [currentTurnIndex]: data
        }))
      } else {
        console.error('Evaluation failed')
      }
    } catch (error) {
      console.error('Evaluation error:', error)
    } finally {
      setIsEvaluating(false)
    }
  }

  // 确认转录文字（不再直接完成，而是触发评分）
  const confirmTranscription = () => {
    setUserConfirmedText(editedTranscription)
    setIsEditingTranscription(false)
    // 触发评分
    handleEvaluate(editedTranscription)
  }

  // 取消/重新录音
  const cancelTranscription = () => {
    setEditedTranscription('')
    setIsEditingTranscription(false)
    setEvaluation(null)
    setIsEvaluating(false)
  }

  const handleNextTurn = () => {
    if (!currentScenario) return

    if (currentTurnIndex < currentScenario.messages.length - 1) {
      setCurrentTurnIndex(currentTurnIndex + 1)
      setShowReference(false)
      setShowHint(false) // Reset hint
      setEvaluation(null) // Reset evaluation
      setIsEvaluating(false)
      setUserConfirmedText('')
      setIsEditingTranscription(false)
      setManualInputText('') // 重置手动输入

      // Auto-reveal AI messages
      if (currentScenario.messages[currentTurnIndex + 1].role === 'ai') {
        setRevealedMessages([...revealedMessages, currentTurnIndex + 1])
      }
    } else {
      // Scenario complete
      toast({
        title: '场景完成 🎉',
        description: '本场景已练完，点击右上角「下一题」继续练习。',
      })
    }
  }

  const handleRevealReference = () => {
    setShowReference(true)
  }

  const handleNewScenario = () => {
    // 重置状态并重新获取场景
    setCurrentTurnIndex(0)
    setHistoryEvaluations({}) // Clear history
    setUserAnswers({}) // Clear recorded answers
    setRevealedMessages([])
    setShowReference(false)
    setShowHint(false)
    setShowTranslation(null)
    setUserConfirmedText('')
    setIsEditingTranscription(false)
    setManualInputText('') // 重置手动输入
    setInputMode('voice') // 重置输入模式为语音
    fetchScenario(true) // 强制刷新
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background">
        {/* 像素加载：方块依次闪烁，不用旋转 spinner */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="anim-blink h-4 w-4 border-[3px] border-pixel-ink bg-pixel-primary"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <p className="px-font text-[10px] text-pixel-ink-dim">LOADING...</p>
      </div>
    )
  }

  if (!currentScenario || !currentScenario.messages || !Array.isArray(currentScenario.messages) || currentScenario.messages.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        {/* 失败态：整卡震一次，配合红底图标块 */}
        <div className="anim-shake w-full max-w-lg border-[3px] border-pixel-ink bg-pixel-paper p-6 text-center md:border-4 md:p-8 px-shadow">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border-[3px] border-pixel-ink bg-pixel-primary text-white md:border-4">
            <X className="h-8 w-8" />
          </div>
          <h2 className="px-font mb-3 text-xs text-pixel-ink">场景加载失败</h2>
          <p className="mb-6 whitespace-pre-wrap text-sm text-pixel-ink-dim">{error || '场景数据格式不正确，请重试'}</p>
          <div className="space-y-3">
            <Button
              onClick={() => fetchScenario(true)}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              重新加载
            </Button>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </Button>
            </Link>
            <div className="mt-4 border-[3px] border-pixel-ink bg-pixel-bg p-3 text-left text-xs text-pixel-ink-dim">
              <p className="px-font mb-2 text-[9px] text-pixel-ink">常见解决方案</p>
              <ul className="list-disc list-inside space-y-1">
                <li>检查网络连接是否正常</li>
                <li>如果使用代理，请确保代理设置正确</li>
                <li>检查 .env.local 中的 DASHSCOPE_API_KEY 是否有效</li>
                <li>稍后重试（可能是 AI 服务暂时不可用）</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentMessage = currentScenario.messages[currentTurnIndex]
  const isUserTurn = currentMessage.role === 'user'

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-4 border-pixel-ink bg-pixel-paper">
        <div className="container mx-auto flex items-center justify-between px-4 pb-4 pt-safe-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Home className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{currentScenario.title}</h1>
              <p className="text-xs text-muted-foreground truncate">{currentScenario.scenario}</p>
            </div>
          </div>
          <Button onClick={handleNewScenario} variant="outline" size="sm" className="flex-shrink-0" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            下一题
          </Button>
        </div>
        {vocabList.length > 0 && (
          <div className="flex items-center justify-center gap-2 border-b-[3px] border-pixel-ink bg-pixel-highlight py-1.5 text-center text-xs text-pixel-ink">
            <Star className="h-3 w-3 fill-pixel-warn text-pixel-warn" />
            已收藏 {vocabList.length} 个短语，前往{' '}
            <Link href="/freetalk" className="font-medium underline">
              AI 口语对练
            </Link>{' '}
            查看生词本
          </div>
        )}
        {error && (
          <div className="border-b-[3px] border-pixel-ink bg-pixel-warn py-1.5 text-center text-xs text-pixel-ink">
            {error}
          </div>
        )}
        {audioError && (
          <div className="anim-shake border-b-[3px] border-pixel-ink bg-pixel-primary py-1.5 text-center text-xs text-white">
            {audioError}
          </div>
        )}
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-3 sm:px-4 py-5 md:py-8 max-w-3xl space-y-5 md:space-y-6">
          {currentScenario.messages.slice(0, currentTurnIndex + 1).map((message, index) => {
            if (message.role === 'ai') {
              return (
                <div key={index} className="flex items-end gap-2 sm:gap-3">
                  {/* 头像：方形 + 粗边框，像素风不用圆形 */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border-[3px] border-pixel-ink bg-pixel-accent text-white sm:h-10 sm:w-10">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <AiMessageBubble
                    message={message}
                    keywords={currentScenario.keywords_pool}
                    showChinese={showTranslation === index}
                    onToggleTranslation={() =>
                      setShowTranslation(showTranslation === index ? null : index)
                    }
                    renderHighlightedText={renderHighlightedText}
                  />
                </div>
              )
            } else {
              // User turn
              return (
                <div key={index} className="flex justify-end gap-2 sm:gap-3">
                  <div className="flex-1 space-y-3">
                    {/* User Prompt */}
                    {/* 任务卡：像素卷轴，黄底 + 粗边 */}
                    <Card className="bg-pixel-highlight p-4">
                      <p className="px-font mb-2 text-[9px] text-pixel-ink">
                        你要表达
                      </p>
                      <p className="mb-3 text-lg font-medium leading-snug text-pixel-ink">
                        {message.userPrompt}
                      </p>

                      {/* Hint System */}
                      {index === currentTurnIndex && (
                        <div className="flex flex-wrap gap-2 items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 border-2 border-pixel-ink bg-pixel-paper text-xs text-pixel-ink hover:bg-pixel-warn"
                            onClick={() => setShowHint(!showHint)}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {showHint ? '隐藏提示' : '给我一点提示'}
                          </Button>

                          {showHint && message.reference?.keyPhrases && (
                            <div className="flex flex-wrap gap-2">
                              {message.reference.keyPhrases.map((phrase, i) => (
                                <span key={i} className="anim-pop px-font border-2 border-pixel-ink bg-pixel-paper px-2 py-1 text-[9px] text-pixel-ink">
                                  {phrase}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>

                    {/* Recording Interface */}
                    {index === currentTurnIndex && !isEditingTranscription && !userConfirmedText && (
                      <div className="space-y-3">
                        {/* 输入模式切换按钮 */}
                        <div className="mx-auto flex w-fit justify-center gap-2 border-[3px] border-pixel-ink bg-pixel-bg p-1 md:border-4">
                          <Button
                            variant={inputMode === 'voice' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-9 px-4"
                            onClick={() => setInputMode('voice')}
                          >
                            <Mic className="w-4 h-4 mr-1" />
                            语音输入
                          </Button>
                          <Button
                            variant={inputMode === 'text' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-9 px-4"
                            onClick={() => setInputMode('text')}
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            手动输入
                          </Button>
                        </div>

                        {/* 语音输入模式 */}
                        {inputMode === 'voice' && (
                          <>
                            {/* 录音中：像素 HUD + 音波柱 + 计时 */}
                            {isRecording && (
                              <div className="px-shadow-sm flex items-center gap-3 border-[3px] border-pixel-ink bg-pixel-primary px-3 py-2.5 text-white md:border-4">
                                <PixelWave />
                                <span className="px-font text-[10px]">REC</span>
                                <span className="px-mono ml-auto text-sm tabular-nums">
                                  {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}
                                  :
                                  {String(recordingSeconds % 60).padStart(2, '0')}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-end gap-2">
                              {/*
                                待机浮动 / 录音脉冲放在外层 wrapper：
                                循环动画与按钮 hover 位移都占用 transform，
                                挂在同一元素上会互相覆盖。
                              */}
                              <div
                                className={`inline-flex ${isRecording ? 'anim-pulse' : 'anim-float'}`}
                              >
                                <Button
                                  onClick={handleRecord}
                                  size="lg"
                                  className={isRecording ? 'bg-pixel-ink hover:bg-pixel-ink' : ''}
                                  disabled={isTranscribing}
                                >
                                  {isTranscribing ? (
                                    <>
                                      <Loader2 className="anim-blink mr-2 h-5 w-5" />
                                      识别中...
                                    </>
                                  ) : isRecording ? (
                                    <>
                                      <MicOff className="mr-2 h-5 w-5" />
                                      停止并识别
                                    </>
                                  ) : (
                                    <>
                                      <Mic className="mr-2 h-5 w-5" />
                                      点击录音
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              录音结束后自动识别，可先修改识别结果再提交 · 如遇问题可切换到「手动输入」
                            </p>
                          </>
                        )}

                        {/* 手动输入模式 */}
                        {inputMode === 'text' && (
                          <Card className="bg-pixel-paper p-4">
                            <div className="space-y-3">
                              <Textarea
                                value={manualInputText}
                                onChange={(e) => setManualInputText(e.target.value)}
                                className="min-h-[80px] border-[3px] border-pixel-ink bg-pixel-paper"
                                placeholder="请用英文输入您的回答..."
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setManualInputText('')}
                                  disabled={!manualInputText.trim()}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  清空
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (manualInputText.trim()) {
                                      setUserConfirmedText(manualInputText.trim())
                                      handleEvaluate(manualInputText.trim())
                                      setManualInputText('')
                                    }
                                  }}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  提交答案
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* 语音识别结果编辑界面 */}
                    {index === currentTurnIndex && isEditingTranscription && (
                      <Card className="bg-pixel-paper p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Edit3 className="h-4 w-4 text-pixel-ink" />
                            <p className="px-font text-[10px] text-pixel-ink">
                              确认你的回答
                            </p>
                          </div>
                          <Textarea
                            value={editedTranscription}
                            onChange={(e) => setEditedTranscription(e.target.value)}
                            className="min-h-[80px] border-[3px] border-pixel-ink bg-pixel-paper"
                            placeholder="您的回答..."
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelTranscription}
                            >
                              <X className="w-4 h-4 mr-1" />
                              重新录音
                            </Button>
                            <Button
                              size="sm"
                              onClick={confirmTranscription}
                              disabled={!editedTranscription.trim()}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              确认提交
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* 用户已确认的回答 & 评分反馈 */}
                    {index === currentTurnIndex && userConfirmedText && (
                      <div className="anim-rise space-y-4">
                        {/* 1. 用户的实际回答 */}
                        <Card className="bg-pixel-paper p-4">
                          <div className="flex flex-col gap-2">
                            <PixelStamp kind="warn">YOU</PixelStamp>
                            <p className="px-mono text-sm font-medium leading-relaxed">
                              {userConfirmedText}
                            </p>
                          </div>
                        </Card>

                        {/* 2. AI 评价加载中 */}
                        {isEvaluating && (
                          <Card className="bg-pixel-paper p-6">
                            <div className="flex flex-col items-center justify-center gap-3 text-pixel-ink-dim">
                              {/* 像素加载：方块闪烁，不用 spinner 旋转 */}
                              <div className="flex gap-1.5">
                                {[0, 1, 2].map((i) => (
                                  <span
                                    key={i}
                                    className="anim-blink h-3 w-3 border-2 border-pixel-ink bg-pixel-primary"
                                    style={{ animationDelay: `${i * 0.2}s` }}
                                  />
                                ))}
                              </div>
                              <p className="px-font text-[10px]">ANALYZING...</p>
                            </div>
                          </Card>
                        )}

                        {/* 3. AI 评价结果 */}
                        {!isEvaluating && (evaluation || historyEvaluations[index]) && (
                          <Card className="bg-pixel-paper p-0">
                            <div className="flex items-center justify-between gap-2 border-b-[3px] border-pixel-ink bg-pixel-highlight px-3 py-2.5 md:border-b-4">
                              <h3 className="px-font flex items-center text-[10px] text-pixel-ink">
                                <Sparkles className="mr-2 h-4 w-4" />
                                AI REVIEW
                              </h3>
                              <PixelStamp kind="warn">REVIEW</PixelStamp>
                            </div>

                            <div className="space-y-4 p-4">
                              {/* 纠错与反馈 */}
                              <div className="space-y-2">
                                <p className="px-font text-[9px] text-pixel-ink-dim">
                                  点评与建议
                                </p>
                                <p className="text-sm leading-relaxed">
                                  {(evaluation || historyEvaluations[index]).feedback}
                                </p>
                              </div>

                              {/* 更多表达方式 */}
                              {(evaluation || historyEvaluations[index]).alternative_expressions && (evaluation || historyEvaluations[index]).alternative_expressions.length > 0 && (
                                <div className="space-y-2">
                                  <p className="px-font text-[9px] text-pixel-ink-dim">
                                    其他地道说法 · 点击收藏
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {(evaluation || historyEvaluations[index]).alternative_expressions.map((phrase: string, i: number) => {
                                      const isSaved = isWordSaved(phrase)
                                      return (
                                        <button
                                          key={i}
                                          onClick={() => handleAddToVocab(phrase, currentScenario?.scenario)}
                                          disabled={addingWords.has(phrase)}
                                          className={`px-shadow-sm flex items-center gap-1.5 border-[3px] border-pixel-ink px-2.5 py-1 text-xs transition-colors ${isSaved
                                            ? 'bg-pixel-highlight text-pixel-ink'
                                            : 'bg-pixel-paper text-pixel-ink hover:bg-pixel-highlight'
                                            } ${addingWords.has(phrase) ? 'cursor-wait opacity-70' : ''}`}
                                        >
                                          {addingWords.has(phrase) ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Star className={`h-3 w-3 ${isSaved ? 'fill-pixel-warn text-pixel-warn' : ''}`} />
                                          )}
                                          {phrase}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* 操作按钮 (仅在当前回合且未自动显示时可操作) */}
                              {index === currentTurnIndex && (
                                <div className="flex gap-3 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowReference(!showReference)}
                                    className="flex-1"
                                  >
                                    {showReference ? '隐藏参考答案' : '查看参考答案'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Reference Answer - 历史记录中始终显示，或当前回合点击显示 */}
                    {(showReference || index < currentTurnIndex) && message.reference && (
                      <Card className="bg-pixel-paper p-4">
                        <div className="space-y-3">
                          <div>
                            <PixelStamp kind="good">ANSWER</PixelStamp>
                            <p className="px-mono mt-3 text-sm leading-relaxed">
                              {renderHighlightedText(message.reference.answer, currentScenario.keywords_pool)}
                            </p>
                          </div>
                          {message.reference.keyPhrases && message.reference.keyPhrases.length > 0 && (
                            <div>
                              <p className="px-font mb-2 text-[9px] text-pixel-ink-dim">
                                关键短语 · 点击收藏
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {message.reference.keyPhrases.map((phrase, i) => {
                                  const isSaved = isWordSaved(phrase)
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => handleAddToVocab(phrase, message.reference?.answer)}
                                      disabled={addingWords.has(phrase)}
                                      className={`px-shadow-sm flex items-center gap-1.5 border-[3px] border-pixel-ink px-2.5 py-1 text-xs transition-colors ${isSaved
                                        ? 'bg-pixel-highlight text-pixel-ink'
                                        : 'bg-pixel-paper text-pixel-ink hover:bg-pixel-highlight'
                                        } ${addingWords.has(phrase) ? 'cursor-wait opacity-70' : ''}`}
                                    >
                                      {addingWords.has(phrase) ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Star className={`h-3 w-3 ${isSaved ? 'fill-pixel-warn text-pixel-warn' : ''}`} />
                                      )}
                                      {phrase}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* Reveal Button */}
                    {index === currentTurnIndex && !showReference && !(evaluation || historyEvaluations[index]) && (
                      <div className="flex justify-end">
                        <Button onClick={handleRevealReference} variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          查看参考回答
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* 头像：方形 + 粗边框，不用圆形 */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border-[3px] border-pixel-ink bg-pixel-bg text-base sm:h-10 sm:w-10 sm:text-xl">
                    👤
                  </div>
                </div>
              )
            }
          })}
        </div>
      </div>

      {/* Bottom Action Bar */}
      {currentTurnIndex < currentScenario.messages.length - 1 && (
        <div className="sticky bottom-0 border-t-4 border-pixel-ink bg-pixel-paper px-4 pt-4 pb-safe-4">
          <div className="container mx-auto flex max-w-3xl flex-col items-center gap-2">
            {isUserTurn && !userConfirmedText && (
              <p className="px-font text-[9px] text-pixel-ink-dim">
                本轮尚未作答，可直接跳过
              </p>
            )}
            <div className="anim-float w-full sm:w-auto">
              <Button
                onClick={handleNextTurn}
                size="lg"
                className="w-full px-8 sm:w-auto"
                disabled={isLoading}
              >
                继续对话
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <PracticeContent />
    </Suspense>
  )
}
