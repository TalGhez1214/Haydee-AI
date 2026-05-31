import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GlossaryManager } from '@/components/glossary/glossary-manager'
import { AssistantContextSetter } from '@/components/assistant/assistant-context-setter'

export default async function GlossaryPage({
  params,
}: {
  params: { projectId: string }
}) {
  const supabase = createClient()

  const [projectRes, termsRes] = await Promise.all([
    supabase.from('projects').select('id, title').eq('id', params.projectId).single(),
    supabase
      .from('glossary_terms')
      .select('*')
      .eq('project_id', params.projectId)
      .order('frequency', { ascending: false }),
  ])

  if (!projectRes.data) notFound()

  const terms = termsRes.data ?? []

  return (
    <div className="max-w-6xl mx-auto p-6">
      <GlossaryManager projectId={params.projectId} initialTerms={terms} />
      <AssistantContextSetter
        projectId={params.projectId}
        currentPage="glossary"
        pendingGlossaryCount={terms.filter((t) => t.status === 'pending').length}
      />
    </div>
  )
}
