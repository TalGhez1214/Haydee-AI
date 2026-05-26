import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

type Params = { params: { projectId: string; characterId: string } }

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { data: character } = await supabase
    .from('characters')
    .select('id, name')
    .eq('id', params.characterId)
    .eq('project_id', params.projectId)
    .single()

  if (!character) return apiError('Character not found', 404)

  try {
    await inngest.send({
      name: 'character/refresh-profile',
      data: {
        projectId: params.projectId,
        characterId: params.characterId,
        characterName: character.name,
        userId: auth.user.id,
      },
    })
  } catch {
    return apiError('Failed to queue character profile refresh', 500)
  }

  return apiSuccess({ message: 'Character profile refresh queued' })
}
