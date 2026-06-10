import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()
  const { data: userRow, error } = await supabase
    .from('users')
    .select('stripe_customer_id, subscription_tier')
    .eq('id', auth.user.id)
    .single()

  if (error || !userRow) return apiError('User not found', 404)
  if (userRow.subscription_tier === 'free') return apiError('No billing account found', 400)
  if (!userRow.stripe_customer_id)
    return apiError('No Stripe customer linked to this account', 400)

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

  const session = await stripe.billingPortal.sessions.create({
    customer: userRow.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings`,
  })

  return apiSuccess({ url: session.url })
}
