import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { generateEmbedding } from './embeddings'

export interface ChapterContext {
  chapter_number: number
  chapter_title: string | null
  summary: string
}

// Resolves the most recent manuscript ID for a project.
async function getManuscriptId(
  supabase: SupabaseClient<Database>,
  projectId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('manuscripts')
    .select('id')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data?.id ?? null
}

// Semantic search: finds the top-K chunks most relevant to the query text.
// Returns empty array gracefully if embeddings are not ready yet.
export async function retrieveRelevantChunks(
  supabase: SupabaseClient<Database>,
  query: string,
  projectId: string,
  limit = 4
): Promise<ChapterContext[]> {
  let queryEmbedding: number[]
  try {
    queryEmbedding = await generateEmbedding(query)
  } catch {
    return []
  }

  const embeddingStr = `[${queryEmbedding.join(',')}]`

  // match_chunks defined in migration 0021; not yet in generated types so we cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('match_chunks', {
    query_embedding: embeddingStr,
    match_project_id: projectId,
    match_count: limit,
  })

  if (error || !data) return []

  return (data as ChapterContext[]).filter((c) => c.summary)
}

// Structural retrieval: loads a chapter and its immediate neighbours (N-1, N, N+1).
// Used by translation to provide narrative context without a semantic search call.
export async function retrieveChapterContext(
  supabase: SupabaseClient<Database>,
  projectId: string,
  chapterNumber: number
): Promise<ChapterContext[]> {
  const manuscriptId = await getManuscriptId(supabase, projectId)
  if (!manuscriptId) return []

  const { data } = await supabase
    .from('chunks')
    .select('chapter_number, chapter_title, summary')
    .eq('manuscript_id', manuscriptId)
    .in('chapter_number', [chapterNumber - 1, chapterNumber, chapterNumber + 1])
    .not('summary', 'is', null)
    .order('chapter_number', { ascending: true })

  if (!data) return []
  return data
    .filter((c): c is typeof c & { summary: string } => c.summary !== null)
    .map((c) => ({
      chapter_number: c.chapter_number,
      chapter_title: c.chapter_title,
      summary: c.summary,
    }))
}
