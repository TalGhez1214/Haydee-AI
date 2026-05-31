import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CultureQueue } from '@/components/culture-queue/culture-queue'
import { AssistantContextSetter } from '@/components/assistant/assistant-context-setter'

export default async function CultureQueuePage({
  params,
}: {
  params: { projectId: string }
}) {
  const supabase = createClient()

  const [projectRes, flagsRes] = await Promise.all([
    supabase.from('projects').select('id, title').eq('id', params.projectId).single(),
    supabase
      .from('flags')
      .select('*')
      .eq('project_id', params.projectId)
      .eq('flag_type', 'culture')
      .order('created_at', { ascending: false }),
  ])

  if (!projectRes.data) notFound()

  const flags = flagsRes.data ?? []
  const openCount = flags.filter((f) => f.status === 'open').length

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CultureQueue projectId={params.projectId} initialFlags={flags} />
      <AssistantContextSetter
        projectId={params.projectId}
        currentPage="culture-queue"
        openFlagsCount={openCount}
      />
    </div>
  )
}
