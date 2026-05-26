import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

const BulkApproveSchema = z.object({
  term_ids: z.array(z.string().uuid()).min(1, 'At least one term ID is required'),
})

type Params = { params: { projectId: string } }

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json()
  const parsed = BulkApproveSchema.safeParse(body)
  if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('glossary_terms')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .in('id', parsed.data.term_ids)
    .eq('project_id', params.projectId)
    .select('id, source_term, status')

  if (error) return apiError(error.message, 500)
  return apiSuccess({ approved: data, count: data?.length ?? 0 })
}
