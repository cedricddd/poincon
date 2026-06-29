import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { auth } from '@/auth'
import { Sidebar } from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'
import { ToastContainer } from '@/components/Toast'
import { NotificationBell } from '@/components/NotificationBell'
import { DemoBanner } from '@/components/DemoBanner'
import { HelpChatbot } from '@/components/HelpChatbot'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, locale] = await Promise.all([auth(), getLocale()])
  if (!session?.user) redirect(`/${locale}/login`)

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 transition-all duration-200 pb-16 md:pb-0 pt-14 md:pt-0 ml-0 md:ml-[var(--sidebar-w,256px)] min-w-0">
        <DemoBanner />
        {children}
      </main>
      <div className="fixed top-3 left-52 z-[9999] hidden md:block">
        <NotificationBell />
      </div>
      <MobileNav />
      <ToastContainer />
      <HelpChatbot />
    </div>
  )
}
