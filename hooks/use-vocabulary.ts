'use client'

import { useState, useEffect, useCallback } from 'react'

// 生词本存储 Key
const VOCAB_STORAGE_KEY = 'realtalk_vocabulary_list'

// 生词条目类型
export interface VocabItem {
  word: string
  phonetic: string
  chinese: string
  englishExplanation: string
  example: string
  addedAt: Date
  source?: 'freetalk' | 'practice' | 'manual' // 来源标记
}

// 新词汇输入类型（添加时使用）
export interface VocabInput {
  word: string
  phonetic?: string
  chinese?: string
  englishExplanation?: string
  example?: string
  source?: 'freetalk' | 'practice' | 'manual'
}

/**
 * 全局生词本 Hook
 * 提供生词本的增删查功能，数据持久化到 localStorage
 */
export function useVocabulary() {
  const [vocabList, setVocabList] = useState<VocabItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // 加载生词本
  useEffect(() => {
    const saved = localStorage.getItem(VOCAB_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setVocabList(parsed.map((item: VocabItem) => ({
          ...item,
          addedAt: new Date(item.addedAt)
        })))
      } catch (e) {
        console.error('Failed to parse vocabulary list:', e)
      }
    }
    setIsLoaded(true)
  }, [])

  // 保存生词本（当列表变化时自动保存）
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(vocabList))
    }
  }, [vocabList, isLoaded])

  // 检查单词是否已收藏
  const isWordSaved = useCallback((word: string): boolean => {
    return vocabList.some(item => item.word.toLowerCase() === word.toLowerCase())
  }, [vocabList])

  // 添加到生词本
  const addWord = useCallback((vocab: VocabInput): boolean => {
    if (!vocab.word) return false
    
    // 检查是否已存在
    if (isWordSaved(vocab.word)) {
      return false
    }

    const newItem: VocabItem = {
      word: vocab.word,
      phonetic: vocab.phonetic || '',
      chinese: vocab.chinese || '',
      englishExplanation: vocab.englishExplanation || '',
      example: vocab.example || '',
      addedAt: new Date(),
      source: vocab.source || 'manual'
    }

    setVocabList(prev => [newItem, ...prev])
    return true
  }, [isWordSaved])

  // 从生词本删除
  const removeWord = useCallback((word: string): void => {
    setVocabList(prev => prev.filter(item => item.word.toLowerCase() !== word.toLowerCase()))
  }, [])

  // 切换收藏状态
  const toggleWord = useCallback((vocab: VocabInput): boolean => {
    if (!vocab.word) return false
    
    if (isWordSaved(vocab.word)) {
      removeWord(vocab.word)
      return false // 返回 false 表示现在未收藏
    } else {
      addWord(vocab)
      return true // 返回 true 表示现在已收藏
    }
  }, [isWordSaved, removeWord, addWord])

  // 清空生词本
  const clearAll = useCallback((): void => {
    setVocabList([])
  }, [])

  return {
    vocabList,
    isLoaded,
    isWordSaved,
    addWord,
    removeWord,
    toggleWord,
    clearAll,
    count: vocabList.length
  }
}
