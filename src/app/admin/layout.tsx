import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { Sidebar } from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') redirect('/app')

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 transition-all duration-200 pb-16 md:pb-0 ml-0 md:ml-[var(--sidebar-w,256px)] min-w-0">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
