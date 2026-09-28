import { NextRequest, NextResponse } from 'next/server'
import { getRandomScenario, activeBackend } from '@/lib/corpus'

/**
 * 分难度随机取一条语料场景（秒开模式，不经过 AI 重写）。
 *
 * 语料读取统一走 lib/corpus.ts 抽象层，实际后端由 DATA_BACKEND 决定：
 *   snapshot（默认）/ bigquery（回滚用）
 * 迁移方案见 迁移方案_BigQuery替换.md §2.3。
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const level = (searchParams.get('level') || 'intermediate').trim()

    const scenario = await getRandomScenario(level)

    if (!scenario) {
      return NextResponse.json({ error: 'No corpus data available' }, { status: 500 })
    }

    // 契约保持不变（§1.4）：example 的字段 + id / keywords_pool / level / category
    return NextResponse.json(scenario)
  } catch (error) {
    console.error('Scenario API Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve scenario',
        backend: activeBackend(),
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
