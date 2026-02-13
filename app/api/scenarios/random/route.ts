import { NextRequest, NextResponse } from 'next/server'
// 假设你把上面的 JSON 存成了这个文件
import unifiedCorpus from '@/lib/scenario-corpus.json'

const QWEN_API_KEY = process.env.DASHSCOPE_API_KEY || ''
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'


// ==========================================

export async function GET(request: NextRequest) {
  try {
    if (!QWEN_API_KEY) {
      console.error('Missing DASHSCOPE_API_KEY');
      return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams
    const level = (searchParams.get('level') || 'intermediate')

    // step 1: 筛选符合难度的语料种子 (The Seed)
    const validSeeds = unifiedCorpus.corpus.filter(item => item.level === level);
    
    // 容错：如果该难度没数据，就从所有数据里抽
    const pool = validSeeds.length > 0 ? validSeeds : unifiedCorpus.corpus;
    
    // step 2: 随机抽取一颗种子
    const seed = pool[Math.floor(Math.random() * pool.length)];

    // step 3: 构建 System Prompt (模仿模式)
    // 我们把 Seed 里的 example 作为 Few-Shot 喂给 AI
    const systemPrompt = `你是一名专业的企业英语教练。
你的目标是基于一个特定的“种子”模仿生成一个独特的职场角色扮演的对话场景。

你的任务说明：
1. 分析种子数据：查看用户提示中提供的示例对话，理解其情绪、结构、语气和关键词汇深度。
2. 生成变体：创建一个新的对话，完成类似的任务。
3. 仅生成一个对话：确保生成的内容是单一的对话场景，包含 4-6 轮对话，不要生成多个对话或额外内容。
4. 自然风格：口语化，避免教科书式的生硬表达。
5. 关键规则：
   - 首先写出英文的参考答案（reference.answer）。
   - 然后将其直接翻译成中文作为 userPrompt。userPrompt 必须是参考答案的中文直接翻译，
   - 示例：如果参考答案是“我完全理解，但我下午3点有冲突”的英文，userPrompt 必须是“我完全理解，但我下午3点有冲突”（中文）。
   - userPrompt错误示例：“告诉他你下午3点有冲突”（指令式，不是翻译）和“你需要委婉拒绝”（描述式，不是翻译）。
   - keyPhrases可以为重点词汇或短语，但必须是对话里的出现过的，不能是额外添加的。 

6.输出格式（要按严格 JSON格式输出）：
{
  "title": "场景标题（中文）",
  "level": "${seed.level}",
  "scenario": "一句话场景描述（英文）",
  "messages": [
    {
      "role": "ai",
      "english": "AI 发言英文",
      "chinese": "AI 发言中文翻译"
    },
    {
      "role": "user",
      "userPrompt": "【必须是 reference.answer 的逐字中文翻译】",
      "reference": {
        "answer": "参考答案英文",
        "keyPhrases": ["关键短语1", "关键短语2"]
      }
    }
  ]
}`;

    // step 4: 构建 User Prompt (注入种子信息)
    const randomDegree = Math.random().toFixed(2); // 随机生成模仿程度（0.00 - 1.00）
    const userPrompt = `**种子数据（请模仿此风格，不要直接复制）：**
- **任务：** ${seed.task_description || seed.category}
- **语气：** ${seed.mood_suggestion || "Professional"}
- **示例对话：** ${JSON.stringify(seed.example)}

**操作：**
根据以上任务生成一个全新的对话（4-6轮）。
模仿程度：${randomDegree}（0 表示完全原创，1 表示完全模仿，注意即使完全模仿也要保持一定的创新，而且userPrompt必须是参考答案的直接中文翻译）。`;

    // step 5: 调用 AI
    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen3-max', // 必须用 max 保证模仿能力
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 1.0, // 保持高创造性，否则会跟种子太像
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Qwen API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText.substring(0, 500) // 截取前500字符避免日志过长
      });
      throw new Error(`AI provider error: ${response.status} - ${errorText.substring(0, 100)}`);
    }
    const data = await response.json();

    // 添加日志记录 API 返回的数据
    console.log('AI API Response:', JSON.stringify(data, null, 2));

    // 解析内容，处理可能的 Markdown 代码块
    let content = data.choices[0].message.content;
    if (content.includes('```json')) {
      content = content.replace(/```json\n?|\n?```/g, '');
    } else if (content.includes('```')) {
      content = content.replace(/```\n?|\n?```/g, '');
    }
    
    return NextResponse.json(JSON.parse(content));

  } catch (error) {
    console.error('Generator Error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
