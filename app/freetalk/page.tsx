'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  PixelIconMessageSquare,
  PixelIconMic,
  PixelIconSquare,
  PixelIconSend,
  PixelIconHome,
  PixelIconVolume,
  PixelIconBookOpen,
  PixelIconChevronDown,
  PixelIconChevronUp,
  PixelIconStar,
  PixelIconX,
  PixelIconSparkles,
  PixelIconInfo,
} from '@/components/ui/pixel-icons'
import { PixelWave } from '@/components/ui/pixel'
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
      <header className="sticky top-0 z-50 border-b-4 border-pixel-ink bg-pixel-paper">
        <div className="container mx-auto flex items-center justify-between px-4 pb-3 pt-safe-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <PixelIconHome className="h-6 w-6" />
              </Button>
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-pixel-ink bg-pixel-primary text-white">
                <PixelIconMessageSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-pixel-ink sm:text-lg">
                  AI 口语对练
                </h1>
                <p className="px-mono truncate text-[10px] text-pixel-ink-dim">
                  Free Talk · 润色 · 生词本
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 gap-2"
            onClick={() => setShowVocabPanel(!showVocabPanel)}
          >
            <PixelIconBookOpen className="h-5 w-5" />
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
            <div className="mx-auto mb-6 max-w-3xl border-[3px] border-pixel-ink bg-pixel-bg p-4 md:border-4">
              <h3 className="px-font mb-3 flex items-center gap-2 text-[10px] text-pixel-ink">
                <PixelIconSparkles className="h-4 w-4 text-pixel-warn" />
                AI 助手功能说明
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-pixel-ink">
                    <span className="h-2.5 w-2.5 shrink-0 border-2 border-pixel-ink bg-pixel-warn" />
                    智能纠错
                  </div>
                  <p className="text-[11px] leading-relaxed text-pixel-ink-dim">
                    AI 会自动检测语法错误，并提供地道的表达建议和详细解释。
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-pixel-ink">
                    <span className="h-2.5 w-2.5 shrink-0 border-2 border-pixel-ink bg-pixel-accent" />
                    生词积累
                  </div>
                  <p className="text-[11px] leading-relaxed text-pixel-ink-dim">
                    对话中出现的高级词汇会被自动提取，你可以一键加入生词本。
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-pixel-ink">
                    <span className="h-2.5 w-2.5 shrink-0 border-2 border-pixel-ink bg-pixel-success" />
                    发音反馈
                  </div>
                  <p className="text-[11px] leading-relaxed text-pixel-ink-dim">
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
                  {/* 主消息气泡：直角 + 粗边 + 实心投影 */}
                  <div
                    className={`px-shadow border-[3px] border-pixel-ink px-4 py-3 md:border-4 ${
                      message.role === 'user'
                        ? 'bg-pixel-primary text-white'
                        : 'bg-pixel-paper text-pixel-ink'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => playTTS(message.content, message.id)}
                        className={`mt-2 inline-flex items-center gap-1 border-2 border-pixel-ink px-2 py-1 text-xs transition-colors ${
                          playingId === message.id
                            ? 'bg-pixel-highlight text-pixel-ink'
                            : 'bg-pixel-bg text-pixel-ink hover:bg-pixel-highlight'
                        }`}
                      >
                        {playingId === message.id ? (
                          <>
                            <PixelIconSquare className="h-3.5 w-3.5" />
                            停止播放
                          </>
                        ) : (
                          <>
                            <PixelIconVolume className="h-4 w-4" />
                            播放
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* 纠错卡片 */}
                  {message.correction?.hasError && (
                    <Card className="overflow-hidden bg-pixel-paper p-0">
                      <button
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-pixel-warn"
                        onClick={() => toggleCardExpand(message.id, 'correction')}
                      >
                        <span className="px-font flex items-center gap-2 text-[10px] text-pixel-ink">
                          <PixelIconSparkles className="h-4 w-4 text-pixel-warn" />
                          表达纠正
                        </span>
                        {expandedCards.has(`${message.id}-correction`) ? (
                          <PixelIconChevronUp className="h-5 w-5 text-pixel-ink" />
                        ) : (
                          <PixelIconChevronDown className="h-5 w-5 text-pixel-ink" />
                        )}
                      </button>
                      {expandedCards.has(`${message.id}-correction`) && (
                        <div className="anim-rise space-y-2 border-t-2 border-pixel-ink px-4 py-3 text-sm">
                          <div>
                            <span className="text-pixel-ink-dim">你说的：</span>
                            <span className="ml-2 text-pixel-primary line-through">
                              {message.correction.userSaid}
                            </span>
                          </div>
                          <div>
                            <span className="text-pixel-ink-dim">更地道：</span>
                            <span className="ml-2 font-medium text-pixel-success">
                              {message.correction.shouldSay}
                            </span>
                          </div>
                          {message.correction.explanation && (
                            <p className="mt-1 text-xs text-pixel-ink-dim">
                              {message.correction.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* 生词卡片 */}
                  {message.vocabulary?.hasNewWord && (
                    <Card className="overflow-hidden bg-pixel-paper p-0">
                      <button
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-pixel-accent hover:text-white"
                        onClick={() => toggleCardExpand(message.id, 'vocabulary')}
                      >
                        <span className="px-font flex items-center gap-2 text-[10px] text-pixel-ink">
                          <PixelIconBookOpen className="h-4 w-4 text-pixel-accent" />
                          新词汇: {message.vocabulary.word}
                        </span>
                        {expandedCards.has(`${message.id}-vocabulary`) ? (
                          <PixelIconChevronUp className="h-5 w-5 text-pixel-ink" />
                        ) : (
                          <PixelIconChevronDown className="h-5 w-5 text-pixel-ink" />
                        )}
                      </button>
                      {expandedCards.has(`${message.id}-vocabulary`) && (
                        <div className="anim-rise space-y-2 border-t-2 border-pixel-ink px-4 py-3 text-sm">
                          <div className="flex items-center gap-3">
                            <span className="px-mono text-lg font-bold text-pixel-primary">
                              {message.vocabulary.word}
                            </span>
                            <span className="px-mono text-xs text-pixel-ink-dim">
                              {message.vocabulary.phonetic}
                            </span>
                            <button
                              onClick={() => playTTS(message.vocabulary?.word || '')}
                              aria-label="朗读单词"
                              className="flex h-7 w-7 items-center justify-center border-2 border-pixel-ink bg-pixel-bg text-pixel-ink transition-colors hover:bg-pixel-highlight"
                            >
                              <PixelIconVolume className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-pixel-ink">{message.vocabulary.chinese}</p>
                          <p className="text-pixel-ink-dim">{message.vocabulary.englishExplanation}</p>
                          {message.vocabulary.example && (
                            <p className="border-2 border-pixel-ink bg-pixel-bg px-2 py-1.5 text-xs text-pixel-ink">
                              {message.vocabulary.example}
                            </p>
                          )}
                          <button
                            onClick={() => addToVocabList(message.vocabulary!)}
                            className={`mt-2 inline-flex items-center gap-1 border-[3px] border-pixel-ink px-2.5 py-1 text-xs transition-colors ${
                              isWordSaved(message.vocabulary.word || '')
                                ? 'bg-pixel-highlight text-pixel-ink'
                                : 'bg-pixel-paper text-pixel-ink hover:bg-pixel-highlight'
                            }`}
                          >
                            <PixelIconStar
                              className={`h-4 w-4 ${
                                isWordSaved(message.vocabulary.word || '')
                                  ? 'text-pixel-warn'
                                  : ''
                              }`}
                            />
                            {isWordSaved(message.vocabulary.word || '') ? '已收藏' : '加入生词本'}
                          </button>
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 border-[3px] border-pixel-ink bg-pixel-paper px-4 py-3 md:border-4">
                  {/* 像素加载：方块依次闪烁，不用旋转 spinner */}
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="anim-blink h-3 w-3 border-2 border-pixel-ink bg-pixel-primary"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t-4 border-pixel-ink bg-pixel-paper px-4 pt-4 pb-safe-4">
            <div className="mx-auto flex max-w-3xl items-end gap-2 sm:gap-3">
              <div className="relative flex-1">
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
                  className={`max-h-[150px] min-h-[50px] resize-none border-[3px] border-pixel-ink bg-pixel-paper pr-14 md:border-4 ${interimTranscript ? 'text-pixel-ink-dim' : ''}`}
                  rows={1}
                  readOnly={isRecording}
                />
                {isRecording && (
                  <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                    <PixelWave count={3} className="h-4" />
                    <span className="px-font text-[9px] text-pixel-primary">REC</span>
                  </div>
                )}
              </div>
              {/* 录音脉冲放外层，避免与按钮 hover 位移抢 transform */}
              <div className={isRecording ? 'anim-pulse' : ''}>
                <Button
                  variant={isRecording ? 'destructive' : 'outline'}
                  size="icon"
                  className={`h-12 w-12 flex-shrink-0 ${isRecording ? 'bg-pixel-ink hover:bg-pixel-ink' : ''}`}
                  onClick={toggleRecording}
                  disabled={!speechSupported}
                  title={speechSupported ? (isRecording ? '停止录音' : '开始语音输入') : '浏览器不支持语音识别'}
                >
                  {isRecording ? (
                    <PixelIconSquare className="h-6 w-6" />
                  ) : (
                    <PixelIconMic className="h-6 w-6" />
                  )}
                </Button>
              </div>
              <Button
                size="icon"
                className="h-12 w-12 flex-shrink-0"
                onClick={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
              >
                <PixelIconSend className="h-6 w-6" />
              </Button>
            </div>
            <p className="px-mono mt-2 text-center text-[10px] text-pixel-ink-dim">
              支持中英文混合输入 · 实时语音识别 · 实时纠错
            </p>
          </div>
        </div>

        {/* Vocabulary Panel */}
        {showVocabPanel && (
          <div className="fixed inset-0 z-40 flex w-full flex-col bg-pixel-bg md:static md:z-auto md:w-80 md:border-l-4 md:border-pixel-ink">
            <div className="flex items-center justify-between border-b-4 border-pixel-ink bg-pixel-paper px-4 pb-4 pt-safe-4">
              <h3 className="px-font flex items-center gap-2 text-[10px] text-pixel-ink">
                <PixelIconBookOpen className="h-5 w-5 text-pixel-primary" />
                我的生词本
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowVocabPanel(false)}
              >
                <PixelIconX className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {vocabList.length === 0 ? (
                <p className="px-mono py-8 text-center text-xs text-pixel-ink-dim">
                  还没有收藏的生词
                  <br />
                  对话中遇到新词会自动添加哦
                </p>
              ) : (
                vocabList.map((item, index) => (
                  <Card key={`${item.word}-${index}`} className="space-y-1 bg-pixel-paper p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <span className="px-mono font-bold text-pixel-primary">{item.word}</span>
                        <span className="px-mono ml-2 text-[10px] text-pixel-ink-dim">
                          {item.phonetic}
                        </span>
                      </div>
                      <button
                        onClick={() => removeWord(item.word)}
                        aria-label={`删除 ${item.word}`}
                        className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center border-2 border-pixel-ink bg-pixel-paper text-pixel-ink transition-colors hover:bg-pixel-primary hover:text-white"
                      >
                        <PixelIconX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-pixel-ink">{item.chinese}</p>
                    <p className="text-xs text-pixel-ink-dim">{item.englishExplanation}</p>
                    {item.example && (
                      <p className="mt-1 border-2 border-pixel-ink bg-pixel-bg px-2 py-1 text-xs text-pixel-ink">
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
