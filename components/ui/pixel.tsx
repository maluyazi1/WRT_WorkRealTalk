'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/* ============================================================
   逐字显示
   ------------------------------------------------------------
   尊重 prefers-reduced-motion：系统开启减弱动效时直接全文显示。
   只改变渲染的字数，不触发 layout 抖动以外的动画属性。
   ============================================================ */
export function useTypewriter(text: string, speed = 18) {
  const [count, setCount] = useState(0)
  const reduceRef = useRef(false)

  useEffect(() => {
    reduceRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (!text) {
      setCount(0)
      return
    }
    if (reduceRef.current) {
      setCount(text.length)
      return
    }
    setCount(0)
    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev >= text.length) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return { shown: text.slice(0, count), done: count >= text.length }
}

/* ============================================================
   像素音波柱：录音状态反馈
   ============================================================ */
export function PixelWave({
  count = 5,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-end gap-1 h-6', className)}
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="anim-bar w-1.5 h-6 bg-pixel-primary border-2 border-pixel-ink"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

/* ============================================================
   判定印章：批改反馈
   ------------------------------------------------------------
   落下动画走 anim-stamp（steps(3) 逐帧），收尾带固定倾斜，
   模拟手工盖章。
   ============================================================ */
export function PixelStamp({
  kind,
  children,
  className,
}: {
  kind: 'good' | 'miss' | 'warn'
  children: React.ReactNode
  className?: string
}) {
  const tone =
    kind === 'good'
      ? 'bg-pixel-success text-white'
      : kind === 'miss'
        ? 'bg-pixel-primary text-white'
        : 'bg-pixel-highlight text-pixel-ink'

  return (
    <span
      className={cn(
        'px-font anim-stamp inline-block shrink-0',
        'border-[3px] md:border-4 border-pixel-ink px-2.5 py-1.5',
        'text-[9px] md:text-[10px] leading-none',
        tone,
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ============================================================
   像素对话气泡
   ------------------------------------------------------------
   尾巴用一个带边框的小方块拼，保持硬边，不用圆角三角。
   ============================================================ */
export function PixelBubble({
  who,
  side = 'left',
  children,
  className,
}: {
  who: string
  side?: 'left' | 'right'
  children: React.ReactNode
  className?: string
}) {
  const isLeft = side === 'left'
  return (
    <div className={cn('relative max-w-[86%]', isLeft ? 'self-start' : 'self-end')}>
      <div
        className={cn(
          'border-[3px] md:border-4 border-pixel-ink px-3.5 py-3',
          isLeft
            ? 'bg-pixel-accent text-white px-shadow'
            : 'bg-pixel-paper text-pixel-ink px-shadow',
          className,
        )}
      >
        <span className="px-font mb-2 block text-[8px] opacity-80">{who}</span>
        {children}
      </div>
      {/* 像素尾巴：方块 + 相邻两边框 */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute bottom-[-14px] h-3 w-3 border-pixel-ink',
          isLeft
            ? 'left-5 border-b-[3px] border-l-[3px] bg-pixel-accent md:border-b-4 md:border-l-4'
            : 'right-5 border-b-[3px] border-r-[3px] bg-pixel-paper md:border-b-4 md:border-r-4',
        )}
      />
    </div>
  )
}
