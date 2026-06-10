import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — cookies can't be set, middleware handles this
          }
        },
      },
    }
  )
}

// Full server-side auth verification — makes a network call to Supabase.
// Use in API routes and middleware only.
export const getAuthUser = cache(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

// Reads session from cookies locally — no network call.
// Safe to use in layouts/pages because middleware already verified the token.
export const getAuthSession = cache(async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
})
