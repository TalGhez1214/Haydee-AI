import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

const UpdateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  author_name: z.string().optional(),
  source_language: z.string().optional(),
  target_language: z.string().optional(),
  genre: z.string().optional(),
  status: z.enum(['in_progress', 'review', 'delivered', 'archived']).optional(),
  deadline: z.string().optional(),
  style_guide: z.string().optional(),
})

type Params = { params: { projectId: string } }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .eq('user_id', auth.user.id)
    .single()

  if (error || !data) return apiError('Project not found', 404)
  return apiSuccess(data)
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json()
  const parsed = UpdateProjectSchema.safeParse(body)
  if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.projectId)
    .eq('user_id', auth.user.id)
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  if (!data) return apiError('Project not found', 404)
  return apiSuccess(data)
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', params.projectId)
    .eq('user_id', auth.user.id)

  if (error) return apiError(error.message, 500)
  return apiSuccess({ message: 'Project deleted' })
}
