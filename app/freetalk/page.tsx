'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { 
  MessageSquare, 
  Mic, 
  MicOff, 
  Send, 
  Home, 
  Loader2, 
  Volume2, 
  BookOpen,
  ChevronDown,
  ChevronUp,
  Star,
  X,
  Sparkles,
  Info,
  Square
} from 'lucide-react'
import Link from 'next/link'
import { useVocabulary, VocabItem } from '@/hooks/use-vocabulary'

// 类型定义
interface Correction {
  hasError: boolean
  userSaid?: string
  shouldSay?: string
  explanation?: string
}

interface Vocabulary {
  hasNewWord: boolean
  word?: string
  phonetic?: string
  chinese?: string
  englishExplanation?: string
  example?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  correction?: Correction
  vocabulary?: Vocabulary
  timestamp: Date
}

export default function FreeTalkPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showVocabPanel, setShowVocabPanel] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  
  // 使用全局生词本 hook
  const { vocabList, isWordSaved, addWord, removeWord } = useVocabulary()
  
  const [interimTranscript, setInterimTranscript] = useState('')
  const [speechSupported, setSpeechSupported] = useState(true)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // 初始化 TTS 语音列表
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        setAvailableVoices(voices)
      }
    }
    
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel() // 离开页面时停止播放
    }
  }, [])

  // 检测并初始化 Web Speech API
  useEffect(() => {
    // 检查浏览器是否支持 Web Speech API
    const SpeechRecognition = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      console.warn('Web Speech API is not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US' // 主要识别英语，也能处理中文

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }
      
      if (final) {
        setInputText(prev => prev + final)
        setInterimTranscript('')
      } else {
        setInterimTranscript(interim)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        setSpeechSupported(false)
        alert('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问')
      } else if (event.error === 'network') {
        // 网络错误：Chrome 的 Web Speech API 需要连接 Google 服务器
        // 在中国大陆可能无法访问，建议使用 VPN 或切换到其他识别方案
        console.warn('网络错误：Web Speech API 无法连接到 Google 服务器。请检查网络连接或尝试使用 VPN。')
        alert('语音识别网络错误：浏览器的语音识别需要连接 Google 服务器。\n\n解决方案：\n1. 确保网络连接正常\n2. 如在中国大陆，需要使用 VPN\n3. 或者直接输入文字发送')
      } else if (event.error === 'no-speech') {
        // 没有检测到语音，不需要提示
        console.log('未检测到语音输入')
      } else if (event.error === 'aborted') {
        // 用户主动停止，不需要提示
      } else {
        console.warn('语音识别错误:', event.error)
      }
      setIsRecording(false)
      setInterimTranscript('')
    }

    recognition.onend = () => {
      // 如果还在录音状态但识别结束了，重新开始（处理自动停止的情况）
      if (isRecording && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (e) {
          setIsRecording(false)
          setInterimTranscript('')
        }
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [isRecording])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 初始欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hey there! 👋 I'm your English conversation partner. Feel free to talk to me about anything - your day, your work, your hobbies, or any topic you'd like to practice. Don't worry about making mistakes - that's how we learn! What would you like to chat about today?",
        timestamp: new Date()
      }])
    }
  }, [messages.length])

  // 发送消息
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      // 构建历史记录（排除欢迎消息）
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content
        }))

      const response = await fetch('/api/freetalk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || "I'm sorry, I didn't quite catch that. Could you try again?",
        correction: data.correction,
        vocabulary: data.vocabulary,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      // 如果有新词汇且标记为新词，自动加入生词本
      if (data.vocabulary?.hasNewWord && data.vocabulary.word) {
        addToVocabList(data.vocabulary)
      }

    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Oops! Something went wrong. Let's try again - what were you saying?",
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // 添加到生词本
  const addToVocabList = (vocab: Vocabulary) => {
    if (!vocab.word) return
    
    addWord({
      word: vocab.word,
      phonetic: vocab.phonetic,
      chinese: vocab.chinese,
      englishExplanation: vocab.englishExplanation,
      example: vocab.example,
      source: 'freetalk'
    })
  }

  // 语音录制 - 使用 Web Speech API
  const toggleRecording = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
      setInterimTranscript('')
    } else {
      try {
        setInterimTranscript('')
        recognitionRef.current.start()
        setIsRecording(true)
      } catch (error) {
        console.error('Failed to start speech recognition:', error)
        alert('无法启动语音识别，请检查麦克风权限')
      }
    }
  }

  // TTS 播放 - 使用 Web Speech API
  const playTTS = (text: string, id?: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-Speech not supported')
      return
    }

    // 如果提供了 id 且当前正在播放该 id，则停止播放
    if (id && playingId === id) {
      window.speechSynthesis.cancel()
      setPlayingId(null)
      return
    }

    // 停止当前正在播放的音频
    window.speechSynthesis.cancel()
    
    // 如果是新播放，更新状态
    if (id) {
      setPlayingId(id)
    } else {
      setPlayingId(null)
    }

    // 移除可能存在的 Markdown 符号和括号备注，保持朗读流畅
    const cleanText = text
      .replace(/[*#_`]/g, '') // 移除 Markdown 符号
      .replace(/\(.*?\)/g, '') // 秘除圆括号备注
      .replace(/（.*?）/g, '') // 秘除中文括号备注

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'en-US'
    utterance.rate = 1.0
    utterance.pitch = 1.0

    // 播放结束或出错时重置状态
    utterance.onend = () => setPlayingId(null)
    utterance.onerror = () => setPlayingId(null)

    // 优先选择高质量的英语语音
    // 优先级: Google US English -> Microsoft -> 任何 en-US -> 任何 en
    const preferredVoice = 
      availableVoices.find(v => v.name === 'Google US English') ||
      availableVoices.find(v => v.name.includes('Samantha')) || // macOS 优质语音
      availableVoices.find(v => v.name.includes('Microsoft Zira')) || // Windows 优质语音
      availableVoices.find(v => v.lang === 'en-US') ||
      availableVoices.find(v => v.lang.startsWith('en'))

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    window.speechSynthesis.speak(utterance)
  }

  // 切换卡片展开状态
  const toggleCardExpand = (messageId: string, type: 'correction' | 'vocabulary') => {
    const key = `${messageId}-${type}`
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  return (
    <div className="h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 pb-3 pt-safe-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
                <Home className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-foreground truncate">AI 口语对练</h1>
                <p className="text-xs text-muted-foreground truncate">Free Talk · 润色 · 生词本</p>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 flex-shrink-0"
            onClick={() => setShowVocabPanel(!showVocabPanel)}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">生词本</span> ({vocabList.length})
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* 功能说明卡片 */}
            <div className="mx-auto max-w-3xl bg-muted/40 border border-border/50 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground/90">
                <Sparkles className="w-4 h-4 text-amber-500" />
                AI 助手功能说明
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium flex items-center gap-1.5 text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    智能纠错
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    AI 会自动检测语法错误，并提供地道的表达建议和详细解释。
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium flex items-center gap-1.5 text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    生词积累
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    对话中出现的高级词汇会被自动提取，你可以一键加入生词本。
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium flex items-center gap-1.5 text-foreground/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    发音反馈
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    支持实时语音输入，AI 也会通过标准发音朗读回复内容。
                  </p>
                </div>
              </div>
            </div>

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
                  {/* 主消息气泡 */}
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    {message.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`mt-2 h-7 px-2 text-xs opacity-70 hover:opacity-100 transition-all ${
                          playingId === message.id ? 'bg-primary/10 text-primary font-medium opacity-100' : ''
                        }`}
                        onClick={() => playTTS(message.content, message.id)}
                      >
                        {playingId === message.id ? (
                          <>
                            <Square className="w-3 h-3 mr-1 fill-current" />
                            停止播放
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 mr-1" />
                            播放
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* 纠错卡片 */}
                  {message.correction?.hasError && (
                    <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 overflow-hidden">
                      <button
                        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                        onClick={() => toggleCardExpand(message.id, 'correction')}
                      >
                        <span className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2">
                          ✏️ 表达纠正
                        </span>
                        {expandedCards.has(`${message.id}-correction`) ? (
                          <ChevronUp className="w-4 h-4 text-orange-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-orange-600" />
                        )}
                      </button>
                      {expandedCards.has(`${message.id}-correction`) && (
                        <div className="px-4 pb-3 space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">你说的：</span>
                            <span className="ml-2 text-red-600 dark:text-red-400 line-through">
                              {message.correction.userSaid}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">更地道：</span>
                            <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                              {message.correction.shouldSay}
                            </span>
                          </div>
                          {message.correction.explanation && (
                            <p className="text-xs text-muted-foreground mt-1">
                              💡 {message.correction.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* 生词卡片 */}
                  {message.vocabulary?.hasNewWord && (
                    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 overflow-hidden">
                      <button
                        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        onClick={() => toggleCardExpand(message.id, 'vocabulary')}
                      >
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                          📚 新词汇: {message.vocabulary.word}
                        </span>
                        {expandedCards.has(`${message.id}-vocabulary`) ? (
                          <ChevronUp className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                      {expandedCards.has(`${message.id}-vocabulary`) && (
                        <div className="px-4 pb-3 space-y-2 text-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-foreground">
                              {message.vocabulary.word}
                            </span>
                            <span className="text-muted-foreground">
                              {message.vocabulary.phonetic}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => playTTS(message.vocabulary?.word || '')}
                            >
                              <Volume2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-foreground">{message.vocabulary.chinese}</p>
                          <p className="text-muted-foreground italic">
                            {message.vocabulary.englishExplanation}
                          </p>
                          {message.vocabulary.example && (
                            <p className="text-xs bg-white dark:bg-gray-800 rounded p-2 border">
                              📝 {message.vocabulary.example}
                            </p>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className={`mt-2 gap-1 text-xs transition-colors ${
                              isWordSaved(message.vocabulary.word || '') 
                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' 
                                : ''
                            }`}
                            onClick={() => addToVocabList(message.vocabulary!)}
                          >
                            <Star className={`w-3 h-3 ${
                              isWordSaved(message.vocabulary.word || '') 
                                ? 'fill-amber-400 text-amber-400' 
                                : ''
                            }`} />
                            {isWordSaved(message.vocabulary.word || '') ? '已收藏' : '加入生词本'}
                          </Button>
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border/50 px-4 pt-4 pb-safe-4 bg-background">
            <div className="max-w-3xl mx-auto flex gap-2 sm:gap-3 items-end">
              <div className="flex-1 relative">
                <Textarea
                  value={inputText + (interimTranscript ? (inputText ? ' ' : '') + interimTranscript : '')}
                  onChange={(e) => {
                    if (!isRecording) {
                      setInputText(e.target.value)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(inputText)
                    }
                  }}
                  placeholder="Type in English or Chinese... (按 Enter 发送)"
                  className={`min-h-[50px] max-h-[150px] resize-none pr-12 ${interimTranscript ? 'text-muted-foreground' : ''}`}
                  rows={1}
                  readOnly={isRecording}
                />
                {isRecording && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-500">识别中...</span>
                  </div>
                )}
              </div>
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                className={`h-12 w-12 rounded-full flex-shrink-0 ${isRecording ? 'animate-pulse' : ''}`}
                onClick={toggleRecording}
                disabled={!speechSupported}
                title={speechSupported ? (isRecording ? '停止录音' : '开始语音输入') : '浏览器不支持语音识别'}
              >
                {isRecording ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full flex-shrink-0"
                onClick={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              支持中英文混合输入 · 实时语音识别 · 实时纠错
            </p>
          </div>
        </div>

        {/* Vocabulary Panel */}
        {showVocabPanel && (
          <div className="fixed inset-0 z-40 flex w-full flex-col bg-background md:static md:z-auto md:w-80 md:border-l md:border-border md:bg-muted/30">
            <div className="px-4 pt-safe-4 pb-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                我的生词本
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowVocabPanel(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {vocabList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  还没有收藏的生词
                  <br />
                  对话中遇到新词会自动添加哦 ✨
                </p>
              ) : (
                vocabList.map((item, index) => (
                  <Card key={`${item.word}-${index}`} className="p-3 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-medium">{item.word}</span>
                        <span className="text-xs text-muted-foreground ml-2">{item.phonetic}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 -mt-1 -mr-1"
                        onClick={() => removeWord(item.word)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground">{item.chinese}</p>
                    <p className="text-xs text-muted-foreground italic">{item.englishExplanation}</p>
                    {item.example && (
                      <p className="text-xs text-muted-foreground bg-background rounded p-2 mt-1">
                        {item.example}
                      </p>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
