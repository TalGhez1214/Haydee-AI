import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import type { AuthorQuestionRow } from '@/types/database'

const UpdateQuestionSchema = z.object({
  status: z.enum(['sent', 'pending', 'answered', 'resolved']).optional(),
  author_response: z.string().optional(),
  translator_note: z.string().optional(),
})

type Params = { params: { projectId: string; questionId: string } }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json()
  const parsed = UpdateQuestionSchema.safeParse(body)
  if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten())

  const updates: Partial<Omit<AuthorQuestionRow, 'id' | 'created_at'>> = {
    ...parsed.data,
  }

  if (parsed.data.author_response && !parsed.data.status) {
    updates.status = 'answered'
    updates.answered_at = new Date().toISOString()
  }
  if (parsed.data.status === 'resolved') {
    updates.resolved_at = new Date().toISOString()
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('author_questions')
    .update(updates)
    .eq('id', params.questionId)
    .eq('project_id', params.projectId)
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  if (!data) return apiError('Question not found', 404)
  return apiSuccess(data)
}
