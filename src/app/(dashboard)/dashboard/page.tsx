import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="p-8">
      <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">Dashboard</h1>
      <p className="text-[14px] text-[var(--text-secondary)] mt-1">Welcome, {user?.email}</p>
    </div>
  )
}
