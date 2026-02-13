'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Volume2, 
  Trash2, 
  BookOpen, 
  ArrowLeft, 
  Filter,
  SortAsc,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { useVocabulary, VocabItem } from '@/hooks/use-vocabulary'
import { Badge } from '@/components/ui/badge'

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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="w-8 h-8 text-primary" />
                我的生词本
              </h1>
              <p className="text-muted-foreground mt-1">
                已收录 {vocabList.length} 个单词/短语
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* 暂时预留导出功能 */}
            {/* <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button> */}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border rounded-xl p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="搜索单词或中文释义..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <Button 
              variant={filterSource === 'all' ? 'default' : 'outline'} 
              onClick={() => setFilterSource('all')}
              className="rounded-full whitespace-nowrap"
            >
              全部
            </Button>
            <Button 
              variant={filterSource === 'practice' ? 'default' : 'outline'} 
              onClick={() => setFilterSource('practice')}
              className="rounded-full whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3 mr-2" />
              场景练习
            </Button>
            <Button 
              variant={filterSource === 'freetalk' ? 'default' : 'outline'} 
              onClick={() => setFilterSource('freetalk')}
              className="rounded-full whitespace-nowrap"
            >
              <Layers className="w-3 h-3 mr-2" />
              自由对话
            </Button>
          </div>
        </div>

        {/* Content */}
        {displayList.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">暂无相关生词</p>
            <p className="text-sm">去练习中添加一些生词吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayList.map((item) => (
              <Card key={item.word} className="flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="p-6 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-primary mb-1">{item.word}</h3>
                      {item.phonetic && (
                        <p className="text-sm text-muted-foreground font-mono">{item.phonetic}</p>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => speakWord(item.word)}
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Volume2 className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="bg-muted/50 p-2 rounded-lg">
                      <p className="font-medium text-lg">{item.chinese}</p>
                    </div>
                    
                    {item.englishExplanation && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.englishExplanation}
                      </p>
                    )}
                  </div>

                  {item.example && (
                    <div className="pt-2 border-t border-dashed">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Example</p>
                      <p className="text-sm italic text-foreground/80">{item.example}</p>
                    </div>
                  )}
                </div>

                <div className="bg-muted/30 px-6 py-3 border-t flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.addedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-normal">
                      {item.source === 'practice' ? '场景练习' : item.source === 'freetalk' ? '自由对话' : '手动'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 hover:text-destructive hover:bg-destructive/10 -mr-2"
                      onClick={() => handleDelete(item.word)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
