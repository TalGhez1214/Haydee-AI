import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IconArrowLeft } from '@tabler/icons-react'

export default async function CharactersPage({
  params,
}: {
  params: { projectId: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', params.projectId)
    .single()

  if (!project) notFound()

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href={`/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-quick mb-5"
      >
        <IconArrowLeft size={14} />
        {project.title}
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">
          Character Registry
        </h1>
      </div>
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-[var(--bg)] rounded-card border border-[var(--border)]">
        <p className="text-[14px] text-[var(--text-secondary)]">
          Character registry coming in Phase 6.
        </p>
        <p className="text-[12px] text-[var(--text-tertiary)]">
          Upload a manuscript to automatically extract characters.
        </p>
      </div>
    </div>
  )
}
