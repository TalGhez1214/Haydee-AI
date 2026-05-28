import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IconArrowLeft } from '@tabler/icons-react'
import { CultureQueue } from '@/components/culture-queue/culture-queue'

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

  const project = projectRes.data
  const flags = flagsRes.data ?? []
  const openCount = flags.filter((f) => f.status === 'open').length

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href={`/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-quick mb-5"
      >
        <IconArrowLeft size={14} />
        {project.title}
      </Link>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">Culture Queue</h1>
        <span className="text-[13px] text-[var(--text-tertiary)]">
          {openCount} open · {flags.length} total
        </span>
      </div>

      <CultureQueue projectId={params.projectId} initialFlags={flags} />
    </div>
  )
}
