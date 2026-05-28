import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IconArrowLeft } from '@tabler/icons-react'
import { GlossaryManager } from '@/components/glossary/glossary-manager'

export default async function GlossaryPage({
  params,
}: {
  params: { projectId: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [projectRes, termsRes] = await Promise.all([
    supabase.from('projects').select('id, title').eq('id', params.projectId).single(),
    supabase
      .from('glossary_terms')
      .select('*')
      .eq('project_id', params.projectId)
      .order('frequency', { ascending: false }),
  ])

  if (!projectRes.data) notFound()

  const project = projectRes.data
  const terms = termsRes.data ?? []

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        href={`/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-quick mb-5"
      >
        <IconArrowLeft size={14} />
        {project.title}
      </Link>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">Glossary Manager</h1>
        <span className="text-[13px] text-[var(--text-tertiary)]">
          {terms.filter((t) => t.status === 'pending').length} pending ·{' '}
          {terms.filter((t) => t.status === 'approved').length} approved
        </span>
      </div>

      <GlossaryManager projectId={params.projectId} initialTerms={terms} />
    </div>
  )
}
