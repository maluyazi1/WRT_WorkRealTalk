'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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

  // 新增：高亮关键词并支持点击收藏
  const renderHighlightedText = (text: string, keywords: string[] = []) => {
    if (!text) return ''
    if (!keywords || keywords.length === 0) return text

    // 将关键词按长度倒序排列，优先匹配长词
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length)
    const pattern = sortedKeywords
      .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // 转义正则特殊字符
      .join('|')

    if (!pattern) return text
    const regex = new RegExp(`(${pattern})`, 'gi')
    const parts = text.split(regex)

    return (
      <>
        {parts.map((part, i) => {
          const isMatch = keywords.some(k => k.toLowerCase() === part.toLowerCase())
          if (isMatch) {
            return (
              <span
                key={i}
                className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 px-1 rounded cursor-pointer border-b border-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors inline-block"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddToVocab(part, text)
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
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="text-muted-foreground">正在生成场景...</div>
      </div>
    )
  }

  if (!currentScenario || !currentScenario.messages || !Array.isArray(currentScenario.messages) || currentScenario.messages.length === 0) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-lg p-8 max-w-lg w-full text-center border">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">场景加载失败</h2>
          <p className="text-muted-foreground mb-6 text-sm whitespace-pre-wrap">{error || '场景数据格式不正确，请重试'}</p>
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
            <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3 text-left mt-4">
              <p className="font-medium mb-1">常见解决方案：</p>
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
      <header className="border-b border-border bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 pb-4 pt-safe-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
                <Home className="w-5 h-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{currentScenario.title}</h1>
              <p className="text-xs text-muted-foreground truncate">{currentScenario.scenario}</p>
            </div>
          </div>
          <Button onClick={handleNewScenario} variant="outline" size="sm" className="rounded-full bg-transparent flex-shrink-0" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            下一题
          </Button>
        </div>
        {vocabList.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs text-center py-1 flex items-center justify-center gap-2">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            已收藏 {vocabList.length} 个短语，前往 <Link href="/freetalk" className="underline font-medium">AI 口语对练</Link> 查看生词本
          </div>
        )}
        {error && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs text-center py-1">
            {error}
          </div>
        )}
        {audioError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-xs text-center py-1">
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
                <div key={index} className="flex gap-2 sm:gap-3 animate-in slide-in-from-left duration-500">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Card className="p-4 bg-card shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-foreground leading-relaxed">
                        {renderHighlightedText(message.english || '', currentScenario.keywords_pool)}
                      </p>
                      {showTranslation === index && (
                        <p className="text-sm text-muted-foreground mt-2 pt-2 border-t animate-in fade-in slide-in-from-top-2">
                          {message.chinese}
                        </p>
                      )}
                    </Card>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setShowTranslation(showTranslation === index ? null : index)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {showTranslation === index ? '隐藏' : '查看'}翻译
                      </Button>
                    </div>
                  </div>
                </div>
              )
            } else {
              // User turn
              return (
                <div key={index} className="flex gap-2 sm:gap-3 justify-end animate-in slide-in-from-right duration-500">
                  <div className="flex-1 space-y-3">
                    {/* User Prompt */}
                    <Card className="p-4 bg-accent/30 border-accent relative overflow-hidden">
                      <p className="text-sm text-muted-foreground mb-2">💡 参考中文：</p>
                      <p className="text-foreground font-medium mb-3 text-lg">{message.userPrompt}</p>

                      {/* Hint System */}
                      {index === currentTurnIndex && (
                        <div className="flex flex-wrap gap-2 items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                            onClick={() => setShowHint(!showHint)}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {showHint ? '隐藏提示' : '给我一点提示'}
                          </Button>

                          {showHint && message.reference?.keyPhrases && (
                            <div className="flex flex-wrap gap-2 animate-in fade-in zoom-in-95 duration-200">
                              {message.reference.keyPhrases.map((phrase, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
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
                        <div className="flex justify-center gap-2 bg-muted/50 p-1 rounded-full w-fit mx-auto">
                          <Button
                            variant={inputMode === 'voice' ? 'default' : 'ghost'}
                            size="sm"
                            className="rounded-full h-8 px-4"
                            onClick={() => setInputMode('voice')}
                          >
                            <Mic className="w-4 h-4 mr-1" />
                            语音输入
                          </Button>
                          <Button
                            variant={inputMode === 'text' ? 'default' : 'ghost'}
                            size="sm"
                            className="rounded-full h-8 px-4"
                            onClick={() => setInputMode('text')}
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            手动输入
                          </Button>
                        </div>

                        {/* 语音输入模式 */}
                        {inputMode === 'voice' && (
                          <>
                            {/* 录音中提示 + 计时 */}
                            {isRecording && (
                              <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 animate-in fade-in">
                                <div className="flex items-center gap-3">
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                  <p className="text-sm font-medium text-red-700 dark:text-red-300">正在录音…</p>
                                  <span className="ml-auto text-sm font-mono tabular-nums text-muted-foreground">
                                    {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                                    {String(recordingSeconds % 60).padStart(2, '0')}
                                  </span>
                                </div>
                              </Card>
                            )}
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={handleRecord}
                                size="lg"
                                className={`rounded-full ${isRecording ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                                disabled={isTranscribing}
                              >
                                {isTranscribing ? (
                                  <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    识别中...
                                  </>
                                ) : isRecording ? (
                                  <>
                                    <MicOff className="w-5 h-5 mr-2 animate-pulse" />
                                    停止并识别
                                  </>
                                ) : (
                                  <>
                                    <Mic className="w-5 h-5 mr-2" />
                                    点击录音
                                  </>
                                )}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              录音结束后自动识别，可先修改识别结果再提交 · 如遇问题可切换到「手动输入」
                            </p>
                          </>
                        )}

                        {/* 手动输入模式 */}
                        {inputMode === 'text' && (
                          <Card className="p-4 bg-muted/30 border animate-in fade-in">
                            <div className="space-y-3">
                              <Textarea
                                value={manualInputText}
                                onChange={(e) => setManualInputText(e.target.value)}
                                className="min-h-[80px] bg-white dark:bg-gray-800"
                                placeholder="请用英文输入您的回答..."
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setManualInputText('')}
                                  className="rounded-full"
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
                                  className="rounded-full"
                                  disabled={!manualInputText.trim()}
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
                      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 animate-in slide-in-from-bottom-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                              请确认或修改您的回答
                            </p>
                          </div>
                          <Textarea
                            value={editedTranscription}
                            onChange={(e) => setEditedTranscription(e.target.value)}
                            className="min-h-[80px] bg-white dark:bg-gray-800"
                            placeholder="您的回答..."
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelTranscription}
                              className="rounded-full"
                            >
                              <X className="w-4 h-4 mr-1" />
                              重新录音
                            </Button>
                            <Button
                              size="sm"
                              onClick={confirmTranscription}
                              className="rounded-full"
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
                      <div className="space-y-4 animate-in slide-in-from-bottom-4">
                        {/* 1. 用户的实际回答 */}
                        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-green-800 dark:text-green-200 flex items-center">
                              <Mic className="w-3 h-3 mr-1" /> 您的回答
                            </p>
                            <p className="text-foreground leading-relaxed font-medium">{userConfirmedText}</p>
                          </div>
                        </Card>

                        {/* 2. AI 评价加载中 */}
                        {isEvaluating && (
                          <Card className="p-6 bg-card border-dashed">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <Loader2 className="w-6 h-6 animate-spin text-primary" />
                              <p className="text-sm">AI 正在分析您的口语表现...</p>
                            </div>
                          </Card>
                        )}

                        {/* 3. AI 评价结果 */}
                        {!isEvaluating && (evaluation || historyEvaluations[index]) && (
                          <Card className="p-0 overflow-hidden bg-card border-primary/20 shadow-sm">
                            <div className="p-4 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
                              <h3 className="font-semibold text-primary flex items-center">
                                <Sparkles className="w-4 h-4 mr-2" />
                                AI 智能点评
                              </h3>
                            </div>

                            <div className="p-4 space-y-4">
                              {/* 纠错与反馈 */}
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">🎯 点评与建议</p>
                                <p className="text-sm">{(evaluation || historyEvaluations[index]).feedback}</p>
                              </div>

                              {/* 更多表达方式 */}
                              {(evaluation || historyEvaluations[index]).alternative_expressions && (evaluation || historyEvaluations[index]).alternative_expressions.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-muted-foreground">✨ 其他地道说法 <span className="text-xs text-muted-foreground font-normal">(点击收藏)</span></p>
                                  <div className="flex flex-wrap gap-2">
                                    {(evaluation || historyEvaluations[index]).alternative_expressions.map((phrase: string, i: number) => {
                                      const isSaved = isWordSaved(phrase)
                                      return (
                                        <button
                                          key={i}
                                          onClick={() => handleAddToVocab(phrase, currentScenario?.scenario)}
                                          disabled={addingWords.has(phrase)}
                                          className={`px-3 py-1 text-sm rounded-full border transition-all flex items-center gap-1.5 hover:scale-105 ${isSaved
                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                            : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                            } ${addingWords.has(phrase) ? 'opacity-70 cursor-wait' : ''}`}
                                        >
                                          {addingWords.has(phrase) ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Star className={`w-3 h-3 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
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
                      <Card className="p-4 bg-primary/5 border-primary/20 animate-in slide-in-from-bottom-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-primary mb-1">📝 参考答案</p>
                            <p className="text-foreground leading-relaxed">
                              {renderHighlightedText(message.reference.answer, currentScenario.keywords_pool)}
                            </p>
                          </div>
                          {message.reference.keyPhrases && message.reference.keyPhrases.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-primary mb-2">✨ 关键短语 <span className="text-muted-foreground font-normal">(点击收藏)</span></p>
                              <div className="flex flex-wrap gap-2">
                                {message.reference.keyPhrases.map((phrase, i) => {
                                  const isSaved = isWordSaved(phrase)
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => handleAddToVocab(phrase, message.reference?.answer)}
                                      disabled={addingWords.has(phrase)}
                                      className={`px-3 py-1 text-sm rounded-full border transition-all flex items-center gap-1.5 hover:scale-105 ${isSaved
                                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                        : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                        } ${addingWords.has(phrase) ? 'opacity-70 cursor-wait' : ''}`}
                                    >
                                      {addingWords.has(phrase) ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Star className={`w-3 h-3 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
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
                        <Button onClick={handleRevealReference} variant="outline" className="rounded-full bg-transparent">
                          <Eye className="w-4 h-4 mr-2" />
                          查看参考回答
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xl sm:text-2xl">
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
        <div className="border-t border-border bg-card px-4 pt-4 pb-safe-4 sticky bottom-0">
          <div className="container mx-auto max-w-3xl flex flex-col items-center gap-2">
            {isUserTurn && !userConfirmedText && (
              <p className="text-xs text-muted-foreground">本轮尚未作答，可直接跳过</p>
            )}
            <Button
              onClick={handleNextTurn}
              size="lg"
              className="rounded-full px-8 w-full sm:w-auto"
              disabled={isLoading}
            >
              继续对话
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
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
