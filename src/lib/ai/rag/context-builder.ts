import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { retrieveRelevantChunks, retrieveChapterContext, type ChapterContext } from './retrieve'

export interface AssistantRAGContext {
  relevantChapters: ChapterContext[]
  characters: Array<{
    name: string
    role: string
    confirmed_target_name: string | null
    tone_tags: string[]
    translator_note: string | null
  }>
  approvedGlossary: Array<{
    source_term: string
    approved_translation: string
    term_type: string | null
  }>
}

export async function buildAssistantContext(
  supabase: SupabaseClient<Database>,
  projectId: string,
  query: string,
  chapterNumber?: number
): Promise<AssistantRAGContext> {
  const [semanticChunks, charactersResult, glossaryResult] = await Promise.all([
    retrieveRelevantChunks(supabase, query, projectId, 4),
    supabase
      .from('characters')
      .select('name, role, confirmed_target_name, tone_tags, translator_note')
      .eq('project_id', projectId)
      .order('role', { ascending: true }),
    supabase
      .from('glossary_terms')
      .select('source_term, approved_translation, term_type')
      .eq('project_id', projectId)
      .eq('status', 'approved')
      .not('approved_translation', 'is', null),
  ])

  // If the user is on a specific chapter, pin that chapter's summary at the
  // front of context (plus its neighbours) even if semantic search didn't rank it.
  let relevantChapters: ChapterContext[]
  if (chapterNumber !== undefined) {
    const currentAlreadyIncluded = semanticChunks.some((c) => c.chapter_number === chapterNumber)
    if (currentAlreadyIncluded) {
      relevantChapters = semanticChunks
    } else {
      const neighbourChunks = await retrieveChapterContext(supabase, projectId, chapterNumber)
      // Put the current-chapter neighbourhood first, then fill from semantic results
      const semanticExtras = semanticChunks.filter(
        (c) => !neighbourChunks.some((n) => n.chapter_number === c.chapter_number)
      )
      relevantChapters = [...neighbourChunks, ...semanticExtras].slice(0, 5)
    }
  } else {
    relevantChapters = semanticChunks
  }

  const characters = (charactersResult.data ?? []).map((c) => ({
    name: c.name,
    role: c.role ?? 'secondary',
    confirmed_target_name: c.confirmed_target_name,
    tone_tags: c.tone_tags ?? [],
    translator_note: c.translator_note,
  }))

  const approvedGlossary = (glossaryResult.data ?? [])
    .filter((t): t is typeof t & { approved_translation: string } => !!t.approved_translation)
    .map((t) => ({
      source_term: t.source_term,
      approved_translation: t.approved_translation,
      term_type: t.term_type,
    }))

  return { relevantChapters, characters, approvedGlossary }
}
