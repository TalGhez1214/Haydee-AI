import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { job1Ingest } from '@/lib/inngest/functions/job1-ingest'
import { job2Character } from '@/lib/inngest/functions/job2-character'
import { job3Culture } from '@/lib/inngest/functions/job3-culture'
import { job4Consistency } from '@/lib/inngest/functions/job4-consistency'
import { job5Untranslatable } from '@/lib/inngest/functions/job5-untranslatable'
import { job6Translate } from '@/lib/inngest/functions/job6-translate'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [job1Ingest, job2Character, job3Culture, job4Consistency, job5Untranslatable, job6Translate],
})
