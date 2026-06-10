import { redirect } from 'next/navigation'
import { createClient, getAuthUser } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/settings/profile-form'
import { SecurityForm } from '@/components/settings/security-form'
import { BillingSection } from '@/components/settings/billing-section'
import { UsageStats } from '@/components/settings/usage-stats'
import { DangerZone } from '@/components/settings/danger-zone'
import type { UserRow } from '@/types/database'

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="py-8 border-b border-[var(--border)]">
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="w-full sm:w-[200px] shrink-0">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">{description}</p>
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}

export default async function SettingsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createClient()

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const [userResult, logsResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase
      .from('ai_call_log')
      .select('tokens_input, tokens_output, cost_usd')
      .eq('user_id', user.id)
      .gte('created_at', monthStart.toISOString()),
  ])

  if (!userResult.data) redirect('/login')
  const userRow = userResult.data as UserRow

  const logs = logsResult.data ?? []
  const usage = {
    totalJobs: logs.length,
    inputTokens: logs.reduce((s, r) => s + (r.tokens_input ?? 0), 0),
    outputTokens: logs.reduce((s, r) => s + (r.tokens_output ?? 0), 0),
    costUsd: logs.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0),
  }

  return (
    <div className="max-w-3xl mx-auto p-6 pb-16">
      <SettingsSection title="Profile" description="Your name and account details.">
        <ProfileForm userRow={userRow} />
      </SettingsSection>

      <SettingsSection title="Security" description="Update your password.">
        <SecurityForm />
      </SettingsSection>

      <SettingsSection
        title="Plan & Billing"
        description="Your current plan and payment settings."
      >
        <BillingSection userRow={userRow} />
      </SettingsSection>

      <SettingsSection
        title="AI Usage"
        description="Token and cost usage for the current month."
      >
        <UsageStats usage={usage} />
      </SettingsSection>

      <DangerZone />
    </div>
  )
}
