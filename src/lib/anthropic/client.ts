import { ChatAnthropic } from '@langchain/anthropic'

export const llm = new ChatAnthropic({
  model: 'claude-sonnet-4-6',
  apiKey: process.env.ANTHROPIC_API_KEY,
  temperature: 0,
  maxRetries: 2,
})
