import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

type Params = { params: { projectId: string; sessionId: string } }

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const UpdateSessionSchema = z.object({
  messages: z.array(MessageSchema),
})

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', params.sessionId)
    .eq('project_id', params.projectId)
    .single()

  if (error) return apiError('Session not found', 404)
  return apiSuccess(data)
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = UpdateSessionSchema.safeParse(body)
  if (!parsed.success) return apiError('Invalid request body', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('chat_sessions')
    .update({ messages: parsed.data.messages, updated_at: new Date().toISOString() })
    .eq('id', params.sessionId)
    .eq('project_id', params.projectId)
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
