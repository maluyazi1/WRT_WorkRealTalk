// 场景消息类型
export interface Message {
  role: 'ai' | 'user'
  english?: string
  chinese?: string
  userPrompt?: string
  reference?: {
    answer: string
    keyPhrases: string[]
  }
}

// 场景类型
export interface Scenario {
  title: string
  scenario: string
  messages: Message[]
}

// 答案评估结果类型
export interface EvaluationResult {
  feedback: string
  alternative_expressions?: string[]
}

// API 响应错误类型
export interface ApiError {
  error: string
}
