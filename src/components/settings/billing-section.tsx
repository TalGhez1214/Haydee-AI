'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/use-api'
import { useToast } from '@/components/ui/toast'
import type { UserRow } from '@/types/database'

interface BillingSectionProps {
  userRow: Pick<UserRow, 'subscription_tier' | 'stripe_customer_id'>
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  free: 'Limited to 3 active projects. AI jobs are capped at 50 per month.',
  pro: 'Unlimited projects and AI jobs. Full access to all features.',
  team: 'Everything in Pro, plus team collaboration features.',
}

export function BillingSection({ userRow }: BillingSectionProps) {
  const { fetch: apiFetch } = useApi()
  const { toast } = useToast()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  async function handleManageBilling() {
    setRedirecting(true)
    try {
      const res = await apiFetch('/api/v1/stripe/portal', { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to open billing portal')
      window.location.href = json.data.url
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Error opening billing portal', 'error')
      setRedirecting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Badge variant={userRow.subscription_tier as 'free' | 'pro' | 'team'} />
        <p className="text-[13px] text-[var(--text-secondary)]">
          {PLAN_DESCRIPTIONS[userRow.subscription_tier] ?? ''}
        </p>
      </div>
      {userRow.subscription_tier === 'free' ? (
        <div>
          <Button variant="primary" onClick={() => router.push('/pricing')}>
            Upgrade to Pro
          </Button>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-2">
            Unlock unlimited projects and AI jobs.
          </p>
        </div>
      ) : (
        <div>
          <Button variant="ghost" onClick={handleManageBilling} loading={redirecting}>
            Manage Billing
          </Button>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-2">
            View invoices, update your payment method, or cancel your subscription via the Stripe
            billing portal.
          </p>
        </div>
      )}
    </div>
  )
}
