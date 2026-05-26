import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { projectId: string } }

export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const termType = searchParams.get('type')

  const supabase = createClient()
  let query = supabase
    .from('glossary_terms')
    .select('*')
    .eq('project_id', params.projectId)
    .order('frequency', { ascending: false })

  if (status && ['pending', 'approved', 'flagged'].includes(status)) {
    query = query.eq('status', status as 'pending' | 'approved' | 'flagged')
  }
  if (termType) {
    query = query.eq('term_type', termType)
  }

  const { data, error } = await query
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
