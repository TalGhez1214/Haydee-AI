import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IconArrowLeft } from '@tabler/icons-react'
import { AuthorQALog } from '@/components/author-qa/author-qa-log'

export default async function AuthorQAPage({
  params,
}: {
  params: { projectId: string }
}) {
  const supabase = createClient()

  const [projectRes, questionsRes] = await Promise.all([
    supabase.from('projects').select('id, title').eq('id', params.projectId).single(),
    supabase
      .from('author_questions')
      .select('*')
      .eq('project_id', params.projectId)
      .order('created_at', { ascending: false }),
  ])

  if (!projectRes.data) notFound()

  const project = projectRes.data
  const questions = questionsRes.data ?? []
  const pendingCount = questions.filter(
    (q) => q.status === 'pending' || q.status === 'sent'
  ).length

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
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">Author Q&amp;A</h1>
        <span className="text-[13px] text-[var(--text-tertiary)]">
          {pendingCount} pending · {questions.length} total
        </span>
      </div>

      <AuthorQALog projectId={params.projectId} initialQuestions={questions} />
    </div>
  )
}
