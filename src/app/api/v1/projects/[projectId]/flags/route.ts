import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { projectId: string } }

export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const severity = searchParams.get('severity')

  const supabase = createClient()
  let query = supabase
    .from('flags')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })

  if (type && ['consistency', 'culture', 'untranslatable', 'glossary'].includes(type)) {
    query = query.eq('flag_type', type as 'consistency' | 'culture' | 'untranslatable' | 'glossary')
  }
  if (status && ['open', 'resolved', 'dismissed'].includes(status)) {
    query = query.eq('status', status as 'open' | 'resolved' | 'dismissed')
  }
  if (severity && ['high', 'medium', 'low'].includes(severity)) {
    query = query.eq('severity', severity as 'high' | 'medium' | 'low')
  }

  const { data, error } = await query
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
