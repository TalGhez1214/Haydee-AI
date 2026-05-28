import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { projectId: string; chapterNum: string } }

const PatchSchema = z.object({
  draft_translation: z.record(z.string(), z.string()).optional(),
  mark_translated: z.boolean().optional(),
})

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const chapterNum = parseInt(params.chapterNum, 10)
  if (isNaN(chapterNum)) return apiError('Invalid chapter number', 400)

  const supabase = createClient()

  const { data: manuscript } = await supabase
    .from('manuscripts')
    .select('id')
    .eq('project_id', params.projectId)
    .single()

  if (!manuscript) return apiError('No manuscript found for this project', 404)

  const { data: chunk, error } = await supabase
    .from('chunks')
    .select('*')
    .eq('manuscript_id', manuscript.id)
    .eq('chapter_number', chapterNum)
    .single()

  if (error || !chunk) return apiError('Chapter not found', 404)

  const { data: flags } = await supabase
    .from('flags')
    .select('*')
    .eq('chunk_id', chunk.id)
    .order('created_at', { ascending: true })

  return apiSuccess({ chunk, flags: flags ?? [] })
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const chapterNum = parseInt(params.chapterNum, 10)
  if (isNaN(chapterNum)) return apiError('Invalid chapter number', 400)

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return apiError('Validation failed', 400)
  if (parsed.data.draft_translation === undefined && parsed.data.mark_translated === undefined) {
    return apiError('Nothing to update', 400)
  }

  const supabase = createClient()

  const { data: manuscript } = await supabase
    .from('manuscripts')
    .select('id')
    .eq('project_id', params.projectId)
    .single()
  if (!manuscript) return apiError('No manuscript found for this project', 404)

  const { data: chunk } = await supabase
    .from('chunks')
    .select('id, word_count, translated_at, draft_translation')
    .eq('manuscript_id', manuscript.id)
    .eq('chapter_number', chapterNum)
    .single()
  if (!chunk) return apiError('Chapter not found', 404)

  // Specific type — no index signature — required to satisfy Supabase's RejectExcessProperties
  const updates: {
    draft_translation?: Record<string, string> | null
    translated_at?: string | null
  } = {}

  if (parsed.data.draft_translation !== undefined) {
    updates.draft_translation = parsed.data.draft_translation

    // Recalculate word_count_translated from actual translated word counts across all chunks.
    // This keeps the hero progress bar accurate regardless of how many words are typed.
    const { data: allChunks } = await supabase
      .from('chunks')
      .select('id, draft_translation')
      .eq('manuscript_id', manuscript.id)

    const countWords = (draft: Record<string, string>) =>
      Object.values(draft).join(' ').trim().split(/\s+/).filter(Boolean).length

    const totalTranslatedWords = (allChunks ?? []).reduce((sum, c) => {
      const draft =
        c.id === chunk.id
          ? parsed.data.draft_translation!
          : (c.draft_translation as Record<string, string> | null)
      return sum + (draft ? countWords(draft) : 0)
    }, 0)

    await supabase
      .from('projects')
      .update({ word_count_translated: totalTranslatedWords })
      .eq('id', params.projectId)
  }

  if (parsed.data.mark_translated !== undefined) {
    const wasTranslated = !!chunk.translated_at
    const willBeTranslated = parsed.data.mark_translated
    if (wasTranslated !== willBeTranslated) {
      updates.translated_at = willBeTranslated ? new Date().toISOString() : null
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('chunks').update(updates).eq('id', chunk.id)
    if (error) return apiError(error.message, 500)
  }

  return apiSuccess({ success: true })
}
