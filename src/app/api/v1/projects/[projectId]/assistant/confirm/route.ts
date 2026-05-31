import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import { z } from 'zod'

type Params = { params: { projectId: string } }

const ConfirmJobSchema = z.object({
  eventName: z.string().min(1),
  eventData: z.record(z.string(), z.unknown()),
})

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null)
  const parsed = ConfirmJobSchema.safeParse(body)
  if (!parsed.success) return apiError('Invalid request body', 400, parsed.error.flatten())

  // Verify project ownership
  const supabase = createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', params.projectId)
    .single()

  if (!project) return apiError('Project not found', 404)

  await inngest.send({
    name: parsed.data.eventName,
    data: { ...parsed.data.eventData, projectId: params.projectId, userId: auth.user.id },
  })

  return apiSuccess({ dispatched: true, eventName: parsed.data.eventName })
}
