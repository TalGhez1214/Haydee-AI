import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

type Params = { params: { projectId: string; todoId: string } }

const UpdateTodoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['open', 'done']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  linked_type: z
    .enum(['flag', 'character', 'glossary_term', 'author_question', 'none'])
    .optional(),
  linked_id: z.string().uuid().nullable().optional(),
})

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = UpdateTodoSchema.safeParse(body)
  if (!parsed.success) return apiError('Invalid request body', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_todos')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.todoId)
    .eq('project_id', params.projectId)
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  if (!data) return apiError('Todo not found', 404)
  return apiSuccess(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { error } = await supabase
    .from('project_todos')
    .delete()
    .eq('id', params.todoId)
    .eq('project_id', params.projectId)

  if (error) return apiError(error.message, 500)
  return apiSuccess({ deleted: true })
}
