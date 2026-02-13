'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { MessageSquare, Sparkles, TrendingUp, Mic, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default function Page() {
  const [customTopic, setCustomTopic] = useState('')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">RealTalk</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <Link href="/freetalk">
              <Button size="sm" variant="outline" className="rounded-full gap-2">
                <Mic className="w-4 h-4" />
                AI 口语对练
              </Button>
            </Link>
            <Link href="/vocabulary">
              <Button size="sm" variant="ghost" className="rounded-full gap-2">
                <BookOpen className="w-4 h-4" />
                生词本
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-2 bg-accent/50 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-accent">
            <Sparkles className="w-4 h-4" />
            职场英语实战平台
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-foreground leading-tight text-balance">
            在真实对话中
            <br />
            <span className="text-primary">即学即用</span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            通过 AI 驱动的角色扮演对话，模拟真实职场情境，让你在实战中提升英语表达能力
          </p>
        </div>

        {/* Mode Selection */}
        <div className="max-w-5xl mx-auto mt-16 space-y-12">
          {/* Mode B: Custom Topic */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
            <h3 className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
              定制练习场景
            </h3>
            <Card className="p-6 md:p-8 bg-card border-border shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="我想练习... (例如：向老板请病假)"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="h-12 text-base bg-background border-border"
                  />
                </div>
                <Link href={`/practice?mode=custom&topic=${encodeURIComponent(customTopic)}`}>
                  <Button 
                    size="lg" 
                    className="w-full md:w-auto h-12 px-8 rounded-full"
                    disabled={!customTopic.trim()}
                  >
                    开始练习
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Mode A: Difficulty Levels */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
            <h3 className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
              或选择难度开始
            </h3>
            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
              {[
                {
                  level: 'beginner',
                  title: '初级',
                  subtitle: 'Beginner',
                  description: '基础日常对话场景',
                  color: 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30',
                  borderColor: 'border-blue-200 dark:border-blue-800',
                  icon: '🌱'
                },
                {
                  level: 'intermediate',
                  title: '进阶',
                  subtitle: 'Intermediate',
                  description: '常见职场交流场景',
                  color: 'from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30',
                  borderColor: 'border-purple-200 dark:border-purple-800',
                  icon: '🚀'
                },
                {
                  level: 'advanced',
                  title: '高阶',
                  subtitle: 'Advanced',
                  description: '复杂商务沟通场景',
                  color: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
                  borderColor: 'border-amber-200 dark:border-amber-800',
                  icon: '⚡'
                }
              ].map((item, index) => (
                <Link key={item.level} href={`/practice?mode=random&level=${item.level}`}>
                  <Card 
                    className={`p-6 bg-gradient-to-br ${item.color} border ${item.borderColor} hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group h-full animate-in fade-in slide-in-from-bottom-8 delay-${(index + 4) * 100}`}
                  >
                    <div className="space-y-4">
                      <div className="text-4xl">{item.icon}</div>
                      <div>
                        <h4 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-sm text-muted-foreground font-medium">{item.subtitle}</p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Mode C: Free Talk */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-400">
            <h3 className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
              自由对话练习
            </h3>
            <Link href="/freetalk">
              <Card className="p-6 md:p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-foreground group-hover:text-green-600 transition-colors flex items-center gap-2">
                      AI 口语对练
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">NEW</span>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">Free Talk · 纠音 · 润色 · 生词本</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      与 AI 母语者自由对话，实时纠正语法错误，学习地道表达，自动收集生词
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-green-600">
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
      <section id="how-it-works" className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-12 text-balance">
            学习流程
          </h3>
          <div className="space-y-8">
            {[
              { step: '1', title: '查看中文', description: '了解对话情境和你需要表达的内容' },
              { step: '2', title: '组织英文', description: '思考如何用地道的英文表达你的意思' },
              { step: '3', title: '回答内容', description: '点击麦克风按钮或者手动输入你的答案' },
              { step: '4', title: '核对答案', description: '查看参考答案和AI评语，学习关键短语的地道表达' },
              { step: '5', title: '添加生词', description: '将不熟悉的单词或短语加入生词本，随时复习' },
              { step: '6', title: '口语交流', description: '和AI 口语老师进行互动，获得专业点评和改进建议' }
            ].map((item, index) => (
              <div key={index} className="flex gap-6 items-start group">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  {item.step}
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="text-xl font-semibold mb-2 text-foreground">{item.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-12 text-balance">
            为什么选择 RealTalk？
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageSquare className="w-8 h-8 text-primary" />,
                title: '真实场景模拟',
                description: '基于真实职场情境的对话练习，学以致用'
              },
              {
                icon: <Sparkles className="w-8 h-8 text-primary" />,
                title: 'AI 智能反馈',
                description: '即时获得地道的英文表达和关键短语解析'
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-primary" />,
                title: '渐进式学习',
                description: '从基础到高级，循序渐进提升表达能力'
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 bg-card hover:shadow-lg transition-shadow duration-300">
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-semibold text-foreground">{feature.title}</h4>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 RealTalk. 让英语学习更高效.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
