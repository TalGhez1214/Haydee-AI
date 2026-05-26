import { createClient } from '@/lib/supabase/server'
import { apiError } from './response'
import type { User } from '@supabase/supabase-js'

interface AuthSuccess {
  user: User
  error: null
}

interface AuthFailure {
  user: null
  error: ReturnType<typeof apiError>
}

export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, error: apiError('Unauthorized', 401) }
  }

  return { user, error: null }
}
