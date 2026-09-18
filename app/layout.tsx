import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RealTalk - 职场英语实战',
  description: '在真实对话流中即学即用，提升职场英语口语实战能力',
  generator: 'v0.app',
}

// 移动端适配：viewportFit: 'cover' 是 env(safe-area-inset-*) 生效的前提，
// 缺少它时所有安全区样式都不会起作用（刘海屏 / 底部 Home 指示条）。
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
