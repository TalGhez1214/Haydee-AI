import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { projectId: string } }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()

  const { data: manuscript } = await supabase
    .from('manuscripts')
    .select('id')
    .eq('project_id', params.projectId)
    .single()

  if (!manuscript) return apiSuccess([])

  const { data: chunks, error } = await supabase
    .from('chunks')
    .select('id, chapter_number, chapter_title, word_count, character_mentions, created_at')
    .eq('manuscript_id', manuscript.id)
    .order('chapter_number', { ascending: true })

  if (error) return apiError(error.message, 500)

  const chunkIds = (chunks ?? []).map((c) => c.id)
  const { data: flagCounts } = await supabase
    .from('flags')
    .select('chunk_id, status')
    .in('chunk_id', chunkIds.length > 0 ? chunkIds : ['00000000-0000-0000-0000-000000000000'])

  const flagsByChunk: Record<string, { open: number; total: number }> = {}
  for (const flag of flagCounts ?? []) {
    if (!flag.chunk_id) continue
    if (!flagsByChunk[flag.chunk_id]) flagsByChunk[flag.chunk_id] = { open: 0, total: 0 }
    flagsByChunk[flag.chunk_id].total++
    if (flag.status === 'open') flagsByChunk[flag.chunk_id].open++
  }

  const result = (chunks ?? []).map((c) => ({
    ...c,
    flag_counts: flagsByChunk[c.id] ?? { open: 0, total: 0 },
  }))

  return apiSuccess(result)
}
