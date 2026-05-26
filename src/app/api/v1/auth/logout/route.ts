import { createClient } from '@/lib/supabase/server'
import { apiSuccess, apiError } from '@/lib/api/response'

export async function POST() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()

  if (error) return apiError(error.message, 500)
  return apiSuccess({ message: 'Logged out' })
}
