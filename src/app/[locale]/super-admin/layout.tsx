import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { auth } from '@/auth'
import { Sidebar } from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'

export const dynamic = 'force-dynamic'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, locale] = await Promise.all([auth(), getLocale()])
  if (!session?.user) redirect(`/${locale}/login`)
  if (session.user.role !== 'SUPER_ADMIN') redirect(`/${locale}/app`)

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 transition-all duration-200 pb-16 md:pb-0 pt-14 md:pt-0 ml-0 md:ml-[var(--sidebar-w,256px)] min-w-0">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
