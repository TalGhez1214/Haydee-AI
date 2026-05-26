import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { projectId: string } }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()

  const [projectRes, questionsRes] = await Promise.all([
    supabase.from('projects').select('title, author_name').eq('id', params.projectId).single(),
    supabase
      .from('author_questions')
      .select('*')
      .eq('project_id', params.projectId)
      .in('status', ['pending', 'sent'])
      .order('created_at', { ascending: true }),
  ])

  if (projectRes.error || !projectRes.data) return apiError('Project not found', 404)
  if (questionsRes.error) return apiError(questionsRes.error.message, 500)

  const project = projectRes.data
  const questions = questionsRes.data ?? []

  const lines: string[] = [
    `AUTHOR BRIEF — ${project.title}`,
    project.author_name ? `Author: ${project.author_name}` : '',
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    `Questions: ${questions.length}`,
    '',
    '---',
    '',
  ]

  questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.question_text}`)
    if (q.translator_note) lines.push(`   Note: ${q.translator_note}`)
    lines.push('')
  })

  const text = lines.filter((l) => l !== null).join('\n')

  return apiSuccess({
    project: { title: project.title, author_name: project.author_name },
    questions,
    formatted_text: text,
    question_count: questions.length,
  })
}
