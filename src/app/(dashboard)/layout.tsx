import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/main-layout'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession()
  if (!session) redirect('/login')

  return <MainLayout>{children}</MainLayout>
}
