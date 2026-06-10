import { z } from 'zod'
import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const UpdateUserSchema = z.object({
  full_name: z.string().min(1, 'Name cannot be empty').max(100),
})

export async function PATCH(req: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await req.json()
  const parsed = UpdateUserSchema.safeParse(body)
  if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten())

  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .update({ full_name: parsed.data.full_name })
    .eq('id', auth.user.id)
    .select()
    .single()

  if (error) return apiError(error.message, 500)
  if (!data) return apiError('User not found', 404)
  return apiSuccess(data)
}

export async function DELETE() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const serviceClient = createServiceClient()
  const { error } = await serviceClient.auth.admin.deleteUser(auth.user.id)
  if (error) return apiError(error.message, 500)

  return apiSuccess({ deleted: true })
}
