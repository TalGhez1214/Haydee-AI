import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

const UpdateTermSchema = z.object({
  status: z.enum(['pending', 'approved', 'flagged']).optional(),
  approved_translation: z.string().optional(),
  notes: z.string().optional(),
  term_type: z.string().optional(),
})

type Params = { params: { projectId: string; termId: string } }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json()
  const parsed = UpdateTermSchema.safeParse(body)
  if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('glossary_terms')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.termId)
    .eq('project_id', params.projectId)
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  if (!data) return apiError('Term not found', 404)
  return apiSuccess(data)
}
