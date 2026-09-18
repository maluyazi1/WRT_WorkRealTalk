import { NextRequest, NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || ''
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

// Initialize BigQuery client
const initGoogleCredentials = () => {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) return undefined;
  try {
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    if (creds.private_key) {
      creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }
    return creds;
  } catch (e) {
    console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON", e);
    return undefined;
  }
};

const bigquery = new BigQuery({
  projectId: 'sturdy-lore-480006-e6',
  credentials: initGoogleCredentials(),
});

// ==========================================

export async function GET(request: NextRequest) {
  try {
    if (!QWEN_API_KEY) {
      console.error('Missing DASHSCOPE_API_KEY');
      return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams
    const level = (searchParams.get('level') || 'intermediate')

    // step 1: 在数据库侧按难度筛选并随机取一条（避免全表拉取到内存）
    let rows: any[] = [];
    try {
      const query = `
        SELECT *
        FROM \`sturdy-lore-480006-e6.corpus_data.xhs_structured_corpus\`
        WHERE level = @level
        ORDER BY RAND()
        LIMIT 1
      `;
      [rows] = await bigquery.query({ query, params: { level } });

      // 该难度暂无匹配语料时，回退到全表随机一条，保证练习可用
      if (rows.length === 0) {
        [rows] = await bigquery.query({
          query: `
            SELECT *
            FROM \`sturdy-lore-480006-e6.corpus_data.xhs_structured_corpus\`
            ORDER BY RAND()
            LIMIT 1
          `
        });
      }
    } catch (bqError: any) {
      console.error("BigQuery fetch error:", bqError);
      return NextResponse.json({
        error: 'Failed to fetch corpus data from database',
        details: bqError.message || bqError.toString()
      }, { status: 500 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No corpus data available' }, { status: 500 });
    }

    // step 2: 数据库已随机取出一条，把 example_json 反序列化后作为种子
    const rawSeed = rows[0];
    let parsedExample: any = rawSeed.example ?? null;
    if (!parsedExample && rawSeed.example_json) {
      if (typeof rawSeed.example_json === 'string') {
        try {
          parsedExample = JSON.parse(rawSeed.example_json);
        } catch (e) {
          console.error('Failed to parse example_json:', e);
          parsedExample = null;
        }
      } else {
        parsedExample = rawSeed.example_json;
      }
    }
    const seed = { ...rawSeed, example: parsedExample };

    // step 3: 直接返回语料数据（秒开模式） — 不再经过 AI 重写
    let scenarioData = seed.example || {};
    if (typeof scenarioData === 'string') {
      try {
        scenarioData = JSON.parse(scenarioData);
      } catch (e) {
        // ignore
      }
    }

    // 格式标准化，兼容不同的字段名
    if (scenarioData.messages && Array.isArray(scenarioData.messages)) {
      scenarioData.messages = scenarioData.messages.map((msg: any) => {
        const english = msg.english || msg.en || msg.english_text || '';
        const chinese = msg.chinese || msg.zh || msg.chinese_text || '';
        let reference = msg.reference;
        if (!reference && msg.referenceAnswer) {
          reference = {
            answer: msg.referenceAnswer,
            keyPhrases: msg.keyPhrases || []
          };
        }
        return {
          ...msg,
          english,
          chinese,
          reference
        };
      });
    }

    // 注入 BigQuery 中的其他元数据（如 ID, 关键词池等）
    return NextResponse.json({
      ...scenarioData,
      id: seed.id,
      keywords_pool: seed.keywords_pool || [],
      level: seed.level,
      category: seed.category
    });

  } catch (error) {
    console.error('Scenario API Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve scenario' }, { status: 500 });
  }
}
