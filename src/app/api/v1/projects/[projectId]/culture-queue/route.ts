import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { projectId: string } }

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { data, error } = await supabase
    .from('flags')
    .select('*')
    .eq('project_id', params.projectId)
    .eq('flag_type', 'culture')
    .order('created_at', { ascending: false })

  if (error) return apiError(error.message, 500)

  const sorted = (data ?? []).sort((a, b) => {
    const aOrder = a.severity ? SEVERITY_ORDER[a.severity] ?? 3 : 3
    const bOrder = b.severity ? SEVERITY_ORDER[b.severity] ?? 3 : 3
    return aOrder - bOrder
  })

  const open = sorted.filter((f) => f.status === 'open')
  const resolved = sorted.filter((f) => f.status !== 'open')

  return apiSuccess({
    open,
    resolved,
    stats: {
      total: sorted.length,
      open: open.length,
      resolved: resolved.length,
      high: open.filter((f) => f.severity === 'high').length,
    },
  })
}
