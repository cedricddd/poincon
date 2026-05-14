import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { Sidebar } from '@/components/Sidebar'
import { ToastContainer } from '@/components/Toast'
import { NotificationBell } from '@/components/NotificationBell'

export const dynamic = 'force-dynamic'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role
  if (role !== 'MANAGER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') redirect('/app/clock')

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 transition-all duration-200" style={{ marginLeft: 'var(--sidebar-w, 256px)' }}>
        {children}
      </main>
      <div className="fixed top-3 left-52 z-[9999] hidden md:block">
        <NotificationBell />
      </div>
      <ToastContainer />
    </div>
  )
}
