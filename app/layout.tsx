import React from "react"
import type { Metadata, Viewport } from 'next'

import './globals.css'

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
      <head>
        {/*
          像素字体自托管并预加载：
          不走 next/font/google，避免构建期与运行期依赖 fonts.googleapis.com
          （国内访问不稳定，且会阻塞首屏渲染）
        */}
        <link
          rel="preload"
          href="/fonts/press-start-2p-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      {/* 不吃 antialiased：像素风需要硬边缘，字体平滑会把轮廓磨糊 */}
      <body className="font-cn">{children}</body>
    </html>
  )
}
