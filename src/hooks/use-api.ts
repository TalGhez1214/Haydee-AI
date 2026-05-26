'use client'

import { createClient } from '@/lib/supabase/client'

export function useApi() {
  const fetchWithAuth = async (url: string, options?: RequestInit): Promise<Response> => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
        ...options?.headers,
      },
    })
  }

  return { fetch: fetchWithAuth }
}
