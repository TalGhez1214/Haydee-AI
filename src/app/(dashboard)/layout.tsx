import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/main-layout'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return <MainLayout>{children}</MainLayout>
}
