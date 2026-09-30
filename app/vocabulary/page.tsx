'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  PixelIconSearch,
  PixelIconVolume,
  PixelIconTrash,
  PixelIconBookOpen,
  PixelIconArrowLeft,
  PixelIconCalendar,
  PixelIconSparkles,
  PixelIconLayers,
} from '@/components/ui/pixel-icons'
import Link from 'next/link'
import { useVocabulary, VocabItem } from '@/hooks/use-vocabulary'

export default function VocabularyPage() {
  const { vocabList, removeWord } = useVocabulary()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSource, setFilterSource] = useState<'all' | 'freetalk' | 'practice' | 'manual'>('all')
  const [displayList, setDisplayList] = useState<VocabItem[]>([])

  useEffect(() => {
    let filtered = vocabList

    // 搜索过滤
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.word.toLowerCase().includes(lowerTerm) || 
        item.chinese.includes(searchTerm)
      )
    }

    // 来源过滤
    if (filterSource !== 'all') {
      filtered = filtered.filter(item => item.source === filterSource)
    }

    // 默认按时间倒序
    filtered.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())

    setDisplayList(filtered)
  }, [vocabList, searchTerm, filterSource])

  const speakWord = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }

  const handleDelete = (word: string) => {
    if (confirm(`确定要删除 "${word}" 吗？`)) {
      removeWord(word)
    }
  }

  return (
    <div className="min-h-dvh bg-background px-4 pb-4 pt-safe-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <PixelIconArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-pixel-ink sm:text-3xl">
                <PixelIconBookOpen className="h-8 w-8 text-pixel-primary" />
                我的生词本
              </h1>
              <p className="px-mono mt-1 text-xs text-pixel-ink-dim">
                已收录 {vocabList.length} 个单词/短语
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 border-[3px] border-pixel-ink bg-pixel-paper p-4 md:flex-row md:border-4">
          <div className="relative flex-1">
            <PixelIconSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-pixel-ink-dim" />
            <Input
              placeholder="搜索单词或中文释义..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 border-2 border-pixel-ink bg-pixel-paper pl-10 text-base"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <Button
              variant={filterSource === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterSource('all')}
              className="whitespace-nowrap"
            >
              全部
            </Button>
            <Button
              variant={filterSource === 'practice' ? 'default' : 'outline'}
              onClick={() => setFilterSource('practice')}
              className="whitespace-nowrap"
            >
              <PixelIconSparkles className="mr-2 h-4 w-4" />
              场景练习
            </Button>
            <Button
              variant={filterSource === 'freetalk' ? 'default' : 'outline'}
              onClick={() => setFilterSource('freetalk')}
              className="whitespace-nowrap"
            >
              <PixelIconLayers className="mr-2 h-4 w-4" />
              自由对话
            </Button>
          </div>
        </div>

        {/* Content */}
        {displayList.length === 0 ? (
          <div className="flex flex-col items-center gap-4 border-[3px] border-pixel-ink bg-pixel-paper px-6 py-16 text-center md:border-4">
            <PixelIconBookOpen className="h-16 w-16 text-pixel-ink-dim" />
            <p className="px-font text-xs text-pixel-ink">暂无相关生词</p>
            <p className="text-sm text-pixel-ink-dim">去练习中添加一些生词吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
            {displayList.map((item) => {
              const sourceLabel =
                item.source === 'practice'
                  ? '场景练习'
                  : item.source === 'freetalk'
                    ? '自由对话'
                    : '手动'
              const sourceTone =
                item.source === 'practice'
                  ? 'bg-pixel-highlight text-pixel-ink'
                  : item.source === 'freetalk'
                    ? 'bg-pixel-accent text-white'
                    : 'bg-pixel-bg text-pixel-ink'
              return (
                <Card key={item.word} className="flex flex-col overflow-hidden bg-pixel-paper p-0">
                  {/* 顶部色条：按来源区分，像素风不用渐变 */}
                  <div className="h-2 border-b-[3px] border-pixel-ink bg-pixel-primary" />

                  <div className="flex-1 space-y-4 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="px-mono text-2xl font-bold text-pixel-primary">
                          {item.word}
                        </h3>
                        {item.phonetic && (
                          <p className="px-mono mt-1 text-xs text-pixel-ink-dim">
                            {item.phonetic}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => speakWord(item.word)}
                        aria-label={`朗读 ${item.word}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-pixel-ink bg-pixel-bg text-pixel-ink transition-colors hover:bg-pixel-highlight"
                      >
                        <PixelIconVolume className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="border-2 border-pixel-ink bg-pixel-highlight px-2 py-1.5">
                        <p className="text-lg font-medium text-pixel-ink">{item.chinese}</p>
                      </div>

                      {item.englishExplanation && (
                        <p className="text-sm leading-relaxed text-pixel-ink-dim">
                          {item.englishExplanation}
                        </p>
                      )}
                    </div>

                    {item.example && (
                      <div className="border-t-2 border-dashed border-pixel-ink-dim pt-2">
                        <p className="px-font mb-1 text-[9px] text-pixel-ink-dim">EXAMPLE</p>
                        <p className="px-mono text-xs text-pixel-ink">{item.example}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t-[3px] border-pixel-ink bg-pixel-bg px-5 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-pixel-ink-dim">
                      <PixelIconCalendar className="h-4 w-4" />
                      {new Date(item.addedAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-font border-2 border-pixel-ink px-1.5 py-0.5 text-[9px] ${sourceTone}`}>
                        {sourceLabel}
                      </span>
                      <button
                        onClick={() => handleDelete(item.word)}
                        aria-label={`删除 ${item.word}`}
                        className="flex h-7 w-7 items-center justify-center border-2 border-pixel-ink bg-pixel-paper text-pixel-ink transition-colors hover:bg-pixel-primary hover:text-white"
                      >
                        <PixelIconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
