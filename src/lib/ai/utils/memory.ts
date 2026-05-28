import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, CharacterRow, GlossaryTermRow } from '@/types/database'

export type JobType = 'ingest' | 'character' | 'culture' | 'consistency' | 'untranslatable'

export type ProjectMemory = {
  project_id: string
  book_title: string
  author: string | null
  source_language: string
  target_language: string
  genre: string | null
  translator_style_guide: string | null
  characters: Array<{
    name: string
    variants: string[]
    role: CharacterRow['role']
    confirmed_target_name: string | null
    tone_tags: string[]
    translator_note: string | null
    confirmed: boolean
  }>
  glossary: Array<{
    source_term: string
    approved_translation: string | null
    ai_suggestion: string | null
    status: GlossaryTermRow['status']
  }>
  open_culture_flags: number
  resolved_culture_flags: number
}

export async function buildProjectMemory(
  supabase: SupabaseClient<Database>,
  projectId: string
): Promise<ProjectMemory> {
  const [{ data: project }, { data: characters }, { data: glossary }, { data: memory }] =
    await Promise.all([
      supabase
        .from('projects')
        .select('title, author_name, source_language, target_language, genre, style_guide')
        .eq('id', projectId)
        .single(),
      supabase
        .from('characters')
        .select('name, name_variants, role, confirmed_target_name, tone_tags, translator_note, confirmed')
        .eq('project_id', projectId),
      supabase
        .from('glossary_terms')
        .select('source_term, approved_translation, ai_suggestion, status')
        .eq('project_id', projectId),
      supabase
        .from('project_memory')
        .select('open_culture_flags, resolved_culture_flags')
        .eq('project_id', projectId)
        .maybeSingle(),
    ])

  return {
    project_id: projectId,
    book_title: project?.title ?? '',
    author: project?.author_name ?? null,
    source_language: project?.source_language ?? '',
    target_language: project?.target_language ?? '',
    genre: project?.genre ?? null,
    translator_style_guide: project?.style_guide ?? null,
    characters: (characters ?? []).map((c) => ({
      name: c.name,
      variants: c.name_variants,
      role: c.role,
      confirmed_target_name: c.confirmed_target_name,
      tone_tags: c.tone_tags,
      translator_note: c.translator_note,
      confirmed: c.confirmed,
    })),
    glossary: (glossary ?? []).map((g) => ({
      source_term: g.source_term,
      approved_translation: g.approved_translation,
      ai_suggestion: g.ai_suggestion,
      status: g.status,
    })),
    open_culture_flags:
      typeof memory?.open_culture_flags === 'number' ? memory.open_culture_flags : 0,
    resolved_culture_flags:
      typeof memory?.resolved_culture_flags === 'number' ? memory.resolved_culture_flags : 0,
  }
}

// Returns a trimmed version of project memory relevant to each job type.
// Keeps only the fields each job actually needs to minimize prompt token cost.
export function trimMemoryForJob(memory: ProjectMemory, job: JobType): Partial<ProjectMemory> {
  switch (job) {
    case 'consistency':
      return {
        characters: memory.characters
          .filter((c) => c.confirmed)
          .map(({ name, variants, confirmed_target_name }) => ({
            name,
            variants,
            confirmed_target_name,
            role: 'secondary' as const,
            tone_tags: [],
            translator_note: null,
            confirmed: true,
          })),
        glossary: memory.glossary
          .filter((g) => g.status === 'approved')
          .map(({ source_term, approved_translation }) => ({
            source_term,
            approved_translation,
            ai_suggestion: null,
            status: 'approved' as const,
          })),
      }
    case 'culture':
      return {
        source_language: memory.source_language,
        target_language: memory.target_language,
        genre: memory.genre,
      }
    case 'untranslatable':
      return { source_language: memory.source_language }
    default:
      return memory
  }
}
