'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  PixelIconMessageSquare,
  PixelIconSparkles,
  PixelIconTrendingUp,
  PixelIconMic,
  PixelIconBookOpen,
  PixelIconMenu,
  PixelIconSeedling,
  PixelIconRocket,
  PixelIconLightning,
} from '@/components/ui/pixel-icons'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export default function Page() {
  const [customTopic, setCustomTopic] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-4 border-pixel-ink bg-pixel-paper">
        <div className="container mx-auto flex items-center justify-between px-4 pb-4 pt-safe-4">
          <div className="flex items-center gap-2">
            {/* Logo：方形像素块 */}
            <div className="flex h-8 w-8 items-center justify-center border-2 border-pixel-ink bg-pixel-primary text-white">
              <PixelIconMessageSquare className="h-5 w-5" />
            </div>
            <h1 className="px-font text-lg text-pixel-ink">REAL TALK</h1>
          </div>

          {/* 桌面端导航 */}
          <nav className="hidden items-center gap-4 md:flex">
            <a href="#features" className="px-font text-[10px] text-pixel-ink-dim hover:text-pixel-ink">
              FEATURES
            </a>
            <a href="#how-it-works" className="px-font text-[10px] text-pixel-ink-dim hover:text-pixel-ink">
              HOW IT WORKS
            </a>
            <Link href="/freetalk">
              <Button size="sm" variant="outline" className="gap-2">
                <PixelIconMic className="h-5 w-5" />
                AI 口语对练
              </Button>
            </Link>
            <Link href="/vocabulary">
              <Button size="sm" variant="ghost" className="gap-2">
                <PixelIconBookOpen className="h-5 w-5" />
                生词本
              </Button>
            </Link>
          </nav>

          {/* 移动端菜单：md 以下原导航整体隐藏，会导致「AI 口语对练 / 生词本」入口丢失 */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-11 w-11"
                aria-label="打开菜单"
              >
                <PixelIconMenu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80%] max-w-xs border-l-4 border-pixel-ink bg-pixel-paper">
              <SheetHeader>
                <SheetTitle className="px-font text-sm">导航</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2">
                <Link href="/freetalk" onClick={() => setMenuOpen(false)}>
                  <Button variant="outline" className="h-12 w-full justify-start gap-2">
                    <PixelIconMic className="h-5 w-5" />
                    AI 口语对练
                  </Button>
                </Link>
                <Link href="/vocabulary" onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" className="h-12 w-full justify-start gap-2">
                    <PixelIconBookOpen className="h-5 w-5" />
                    生词本
                  </Button>
                </Link>
                <a href="#features" onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" className="h-12 w-full justify-start">
                    功能特性
                  </Button>
                </a>
                <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
                  <Button variant="ghost" className="h-12 w-full justify-start">
                    学习流程
                  </Button>
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-10 md:py-24">
        <div className="anim-rise mx-auto max-w-4xl space-y-6 text-center sm:space-y-8">
          <div className="inline-flex items-center gap-2 border-2 border-pixel-ink bg-pixel-highlight px-3 py-1.5 text-pixel-ink">
            <PixelIconSparkles className="h-4 w-4" />
            <span className="px-font text-[10px]">职场英语实战平台</span>
          </div>

          <h2 className="text-balance text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            在真实对话中
            <br />
            <span className="border-b-8 border-pixel-primary">即学即用</span>
          </h2>

          <p className="mx-auto max-w-2xl text-balance text-base text-pixel-ink-dim sm:text-lg md:text-xl">
            通过 AI 驱动的角色扮演对话，模拟真实职场情境，让你在实战中提升英语表达能力
          </p>
        </div>

        {/* Mode Selection */}
        <div className="max-w-5xl mx-auto mt-10 md:mt-16 space-y-10 md:space-y-12">
          {/* Mode B: Custom Topic */}
          <div className="anim-rise space-y-4">
            <h3 className="px-font text-center text-[10px] text-pixel-ink-dim">
              定制练习场景
            </h3>
            <Card className="bg-pixel-paper p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="我想练习... (例如：向老板请病假)"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="h-12 border-[3px] border-pixel-ink bg-pixel-paper px-4 text-base focus-visible:ring-4 focus-visible:ring-pixel-primary md:border-4"
                  />
                </div>
                <Link href={`/practice?mode=custom&topic=${encodeURIComponent(customTopic)}`} className="w-full md:w-auto">
                  <Button
                    size="lg"
                    className="h-12 w-full px-8 md:w-auto"
                    disabled={!customTopic.trim()}
                  >
                    开始练习
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Mode A: Difficulty Levels */}
          <div className="space-y-4 anim-rise">
            <h3 className="px-font text-center text-[10px] text-pixel-ink-dim">
              或选择难度开始
            </h3>
            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
              {[
                {
                  level: 'beginner',
                  title: '初级',
                  subtitle: 'Beginner',
                  description: '基础日常对话场景',
                  door: 'bg-pixel-success',
                  icon: 'seedling' as const
                },
                {
                  level: 'intermediate',
                  title: '进阶',
                  subtitle: 'Intermediate',
                  description: '常见职场交流场景',
                  door: 'bg-pixel-accent',
                  icon: 'rocket' as const
                },
                {
                  level: 'advanced',
                  title: '高阶',
                  subtitle: 'Advanced',
                  description: '复杂商务沟通场景',
                  door: 'bg-pixel-warn',
                  icon: 'lightning' as const
                }
              ].map((item) => {
                const Icon =
                  item.icon === 'seedling'
                    ? PixelIconSeedling
                    : item.icon === 'rocket'
                      ? PixelIconRocket
                      : PixelIconLightning
                return (
                  <Link key={item.level} href={`/practice?mode=random&level=${item.level}`}>
                    <Card className="group h-full overflow-hidden bg-pixel-paper p-0">
                      <div
                        className={`${item.door} flex h-24 items-center justify-center border-b-[3px] border-pixel-ink md:border-b-4`}
                      >
                        <Icon className="h-12 w-12" />
                      </div>
                      <div className="space-y-2 p-5">
                        <h4 className="text-2xl font-bold text-pixel-ink transition-colors group-hover:text-pixel-primary">
                          {item.title}
                        </h4>
                        <p className="px-mono text-xs text-pixel-ink-dim">{item.subtitle}</p>
                        <p className="text-sm leading-relaxed text-pixel-ink-dim">
                          {item.description}
                        </p>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Mode C: Free Talk */}
          <div className="anim-rise space-y-4">
            <h3 className="px-font text-center text-[10px] text-pixel-ink-dim">
              自由对话练习
            </h3>
            <Link href="/freetalk">
              <Card className="bg-pixel-paper p-6 md:p-8">
                <div className="flex items-center gap-5 md:gap-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center border-[3px] border-pixel-ink bg-pixel-primary text-white md:border-4">
                    <PixelIconMic className="h-10 w-10" />
                  </div>
                  <div className="flex-1">
                    <h4 className="flex items-center gap-2 text-2xl font-bold text-pixel-ink transition-colors group-hover:text-pixel-primary">
                      AI 口语对练
                      <span className="border-2 border-pixel-ink bg-pixel-highlight px-1.5 py-0.5 text-[9px] text-pixel-ink">
                        NEW
                      </span>
                    </h4>
                    <p className="mt-1 px-mono text-xs text-pixel-ink-dim">
                      Free Talk · 纠音 · 润色 · 生词本
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-pixel-ink-dim">
                      与 AI 母语者自由对话，实时纠正语法错误，学习地道表达，自动收集生词
                    </p>
                  </div>
                  <div className="hidden items-center gap-2 text-pixel-primary md:flex">
                    <span className="text-sm font-medium">开始对话</span>
                    <span className="text-xl">→</span>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-4xl">
          <h3 className="px-font mb-12 text-center text-sm text-pixel-ink">学习流程</h3>
          <div className="space-y-8">
            {[
              { step: '01', title: '查看中文', description: '了解对话情境和你需要表达的内容' },
              { step: '02', title: '组织英文', description: '思考如何用地道的英文表达你的意思' },
              { step: '03', title: '回答内容', description: '点击麦克风按钮或者手动输入你的答案' },
              { step: '04', title: '核对答案', description: '查看参考答案和AI评语，学习关键短语的地道表达' },
              { step: '05', title: '添加生词', description: '将不熟悉的单词或短语加入生词本，随时复习' },
              { step: '06', title: '口语交流', description: '和AI 口语老师进行互动，获得专业点评和改进建议' }
            ].map((item, index) => (
              <div key={index} className="group flex items-start gap-4 sm:gap-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-pixel-ink bg-pixel-primary text-white sm:h-12 sm:w-12">
                  <span className="px-font text-[10px]">{item.step}</span>
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="mb-2 text-xl font-semibold text-pixel-ink">{item.title}</h4>
                  <p className="leading-relaxed text-pixel-ink-dim">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto bg-pixel-bg px-4 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <h3 className="px-font mb-12 text-center text-sm text-pixel-ink">
            为什么选择 RealTalk？
          </h3>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <PixelIconMessageSquare className="h-8 w-8 text-pixel-primary" />,
                title: '真实场景模拟',
                description: '基于真实职场情境的对话练习，学以致用'
              },
              {
                icon: <PixelIconSparkles className="h-8 w-8 text-pixel-primary" />,
                title: 'AI 智能反馈',
                description: '即时获得地道的英文表达和关键短语解析'
              },
              {
                icon: <PixelIconTrendingUp className="h-8 w-8 text-pixel-primary" />,
                title: '渐进式学习',
                description: '从基础到高级，循序渐进提升表达能力'
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-pixel-paper p-6">
                <div className="space-y-4">
                  <div className="flex h-14 w-14 items-center justify-center border-[3px] border-pixel-ink bg-pixel-bg">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-semibold text-pixel-ink">{feature.title}</h4>
                  <p className="leading-relaxed text-pixel-ink-dim">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 border-t-4 border-pixel-ink bg-pixel-paper md:mt-16">
        <div className="container mx-auto px-4 py-8">
          <p className="px-mono text-center text-xs text-pixel-ink-dim">
            © 2024 RealTalk. 让英语学习更高效.
          </p>
        </div>
      </footer>
    </div>
  )
}
