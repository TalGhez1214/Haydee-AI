import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Json } from '@/types/database'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // stripe + supabase service role client are both lazy-imported so the webhook
  // compiles fine even before Stripe keys are set in .env.local
  const stripe = (await import('stripe')).default
  const client = new stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder')

  let event: { id: string; type: string; data: { object: Record<string, unknown> } }
  try {
    event = client.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? ''
    ) as unknown as typeof event
  } catch (err) {
    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 400 }
    )
  }

  // Use service role for webhooks — they have no user session
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Idempotency: skip already-processed events
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id, processed')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing && (existing as { processed: boolean }).processed) {
    return NextResponse.json({ received: true, skipped: true })
  }

  const obj = event.data.object
  const customerId = typeof obj.customer === 'string' ? obj.customer : null

  let userId: string | null = null
  if (customerId) {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()
    userId = (user as { id: string } | null)?.id ?? null
  }

  await supabase.from('stripe_events').upsert({
    stripe_event_id: event.id,
    event_type: event.type,
    user_id: userId,
    data: obj as unknown as Json,
    processed: false,
  })

  if (userId) {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      await supabase.from('users').update({ subscription_tier: 'pro' }).eq('id', userId)
    } else if (event.type === 'customer.subscription.deleted') {
      await supabase.from('users').update({ subscription_tier: 'free' }).eq('id', userId)
    }
  }

  await supabase
    .from('stripe_events')
    .update({ processed: true })
    .eq('stripe_event_id', event.id)

  return NextResponse.json({ received: true })
}
