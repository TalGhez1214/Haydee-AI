import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

const UpdateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  name_variants: z.array(z.string()).optional(),
  role: z.enum(['protagonist', 'secondary', 'minor', 'narrator']).optional(),
  tone_tags: z.array(z.string()).optional(),
  translator_note: z.string().nullable().optional(),
  confirmed_target_name: z.string().nullable().optional(),
  confirmed: z.boolean().optional(),
})

type Params = { params: { projectId: string; characterId: string } }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', params.characterId)
    .eq('project_id', params.projectId)
    .single()

  if (error || !data) return apiError('Character not found', 404)
  return apiSuccess(data)
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json()
  const parsed = UpdateCharacterSchema.safeParse(body)
  if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('characters')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.characterId)
    .eq('project_id', params.projectId)
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  if (!data) return apiError('Character not found', 404)
  return apiSuccess(data)
}
