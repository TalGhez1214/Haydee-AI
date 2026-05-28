import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, AiCallLogRow } from '@/types/database'

// Claude Sonnet: $3/M input tokens, $15/M output tokens
export function calcCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000
}

export async function logAiCall(params: {
  supabase: SupabaseClient<Database>
  projectId: string
  userId: string
  jobType: AiCallLogRow['job_type']
  inputTokens: number
  outputTokens: number
  cached?: boolean
}): Promise<void> {
  const { supabase, projectId, userId, jobType, inputTokens, outputTokens, cached = false } = params
  await supabase.from('ai_call_log').insert({
    project_id: projectId,
    user_id: userId,
    job_type: jobType,
    model_used: 'claude-sonnet-4-6',
    tokens_input: inputTokens,
    tokens_output: outputTokens,
    cost_usd: calcCostUsd(inputTokens, outputTokens),
    cached,
  })
}
