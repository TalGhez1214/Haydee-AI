import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResearchNotebook } from '@/components/projects/research-notebook'
import { AssistantContextSetter } from '@/components/assistant/assistant-context-setter'

export default async function ResearchPage({ params }: { params: { projectId: string } }) {
  const supabase = createClient()

  const [projectRes, notesRes] = await Promise.all([
    supabase.from('projects').select('id, title').eq('id', params.projectId).single(),
    supabase
      .from('research_notes')
      .select('*')
      .eq('project_id', params.projectId)
      .order('created_at', { ascending: false }),
  ])

  if (!projectRes.data) notFound()

  const notes = notesRes.data ?? []

  return (
    <div className="max-w-5xl mx-auto p-6">
      <ResearchNotebook projectId={params.projectId} initialNotes={notes} />
      <AssistantContextSetter projectId={params.projectId} currentPage="research" />
    </div>
  )
}
