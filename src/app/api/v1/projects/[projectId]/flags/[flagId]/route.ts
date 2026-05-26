import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import type { FlagRow } from '@/types/database'

const UpdateFlagSchema = z.object({
  status: z.enum(['open', 'resolved', 'dismissed']),
  translator_decision: z.string().optional(),
})

type Params = { params: { projectId: string; flagId: string } }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json()
  const parsed = UpdateFlagSchema.safeParse(body)
  if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten())

  const updates: Partial<Omit<FlagRow, 'id' | 'created_at'>> = {
    status: parsed.data.status,
  }
  if (parsed.data.translator_decision) updates.translator_decision = parsed.data.translator_decision
  if (parsed.data.status !== 'open') updates.resolved_at = new Date().toISOString()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('flags')
    .update(updates)
    .eq('id', params.flagId)
    .eq('project_id', params.projectId)
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  if (!data) return apiError('Flag not found', 404)
  return apiSuccess(data)
}
