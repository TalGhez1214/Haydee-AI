import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'

// Phase 7 will register AI job functions here
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [],
})
