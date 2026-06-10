import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

const TranslateSchema = z.object({
  selected_text: z.string().min(1).max(4000),
  chunk_id: z.string().uuid().optional(),
})

type Params = { params: { projectId: string } }

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json()
  const parsed = TranslateSchema.safeParse(body)
  if (!parsed.success) return apiError('Validation failed', 400)

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthorized', 401)

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', params.projectId)
    .single()
  if (!project) return apiError('Project not found', 404)

  // Insert the pending request so the Inngest job can write the result back
  const { data: request, error } = await supabase
    .from('translation_requests')
    .insert({
      project_id: params.projectId,
      user_id: user.id,
      selected_text: parsed.data.selected_text,
      chunk_id: parsed.data.chunk_id ?? null,
    })
    .select('id')
    .single()

  if (error || !request) return apiError('Failed to create translation request', 500)

  await inngest.send({
    name: 'translation/suggest',
    data: {
      requestId: request.id,
      projectId: params.projectId,
      userId: user.id,
      chunkId: parsed.data.chunk_id ?? null,
    },
  })

  return apiSuccess({ requestId: request.id })
}
