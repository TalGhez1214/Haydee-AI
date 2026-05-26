import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { projectId: string } }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('project_id', params.projectId)
    .order('name', { ascending: true })

  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
