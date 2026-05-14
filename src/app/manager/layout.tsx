'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ToastContainer } from '@/components/Toast'
import { NotificationBell } from '@/components/NotificationBell'

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    const role = (session?.user as any)?.role
    if (!role || (role !== 'MANAGER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      router.replace('/app/clock')
    }
  }, [session, status, router])

  if (status === 'loading') return null

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
