import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { projectId: string; requestId: string } }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()

  // RLS ensures only the owning user can read this row
  const { data: request, error } = await supabase
    .from('translation_requests')
    .select('id, status, result')
    .eq('id', params.requestId)
    .eq('project_id', params.projectId)
    .single()

  if (error || !request) return apiError('Not found', 404)

  return apiSuccess(request)
}
