import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

type Params = { params: { projectId: string } }

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const CreateSessionSchema = z.object({
  title:    z.string().min(1).max(80),
  messages: z.array(MessageSchema).default([]),
})

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const supabase = createClient()
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at')
    .eq('project_id', params.projectId)
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })

  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = CreateSessionSchema.safeParse(body)
  if (!parsed.success) return apiError('Invalid request body', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      project_id: params.projectId,
      user_id:    auth.user.id,
      title:      parsed.data.title,
      messages:   parsed.data.messages,
    })
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data, 201)
}
