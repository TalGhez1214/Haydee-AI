import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthorQALog } from '@/components/author-qa/author-qa-log'
import { AssistantContextSetter } from '@/components/assistant/assistant-context-setter'

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

  const questions = questionsRes.data ?? []
  const pendingCount = questions.filter(
    (q) => q.status === 'pending' || q.status === 'sent'
  ).length

  return (
    <div className="max-w-4xl mx-auto p-6">
      <AuthorQALog projectId={params.projectId} initialQuestions={questions} />
      <AssistantContextSetter
        projectId={params.projectId}
        currentPage="author-qa"
        pendingQuestionsCount={pendingCount}
      />
    </div>
  )
}
