import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ManuscriptView } from '@/components/manuscript/manuscript-view'
import { AssistantContextSetter } from '@/components/assistant/assistant-context-setter'

export default async function ManuscriptPage({
  params,
}: {
  params: { projectId: string }
}) {
  const supabase = createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, source_language, target_language')
    .eq('id', params.projectId)
    .single()

  if (!project) notFound()

  // Fetch chapters list with flag counts
  const { data: manuscript } = await supabase
    .from('manuscripts')
    .select('id')
    .eq('project_id', params.projectId)
    .single()

  let chapters: {
    id: string
    chapter_number: number
    chapter_title: string | null
    word_count: number | null
    translated_at: string | null
    flag_counts: { open: number; total: number }
  }[] = []

  if (manuscript) {
    const { data: chunks } = await supabase
      .from('chunks')
      .select('id, chapter_number, chapter_title, word_count, translated_at')
      .eq('manuscript_id', manuscript.id)
      .order('chapter_number', { ascending: true })

    const chunkIds = (chunks ?? []).map((c) => c.id)
    const { data: flagCounts } = await supabase
      .from('flags')
      .select('chunk_id, status')
      .in(
        'chunk_id',
        chunkIds.length > 0 ? chunkIds : ['00000000-0000-0000-0000-000000000000']
      )

    const flagsByChunk: Record<string, { open: number; total: number }> = {}
    for (const flag of flagCounts ?? []) {
      if (!flag.chunk_id) continue
      if (!flagsByChunk[flag.chunk_id]) flagsByChunk[flag.chunk_id] = { open: 0, total: 0 }
      flagsByChunk[flag.chunk_id].total++
      if (flag.status === 'open') flagsByChunk[flag.chunk_id].open++
    }

    chapters = (chunks ?? []).map((c) => ({
      ...c,
      translated_at: c.translated_at ?? null,
      flag_counts: flagsByChunk[c.id] ?? { open: 0, total: 0 },
    }))
  }

  const totalOpenFlags = chapters.reduce((sum, ch) => sum + ch.flag_counts.open, 0)

  return (
    <div className="flex flex-col h-full">
      <ManuscriptView
        projectId={params.projectId}
        chapters={chapters}
        sourceLanguage={project.source_language}
        targetLanguage={project.target_language}
      />
      <AssistantContextSetter
        projectId={params.projectId}
        currentPage="manuscript"
        openFlagsCount={totalOpenFlags}
      />
    </div>
  )
}
