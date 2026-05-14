import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { Sidebar } from '@/components/Sidebar'

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
      <main className="flex-1 transition-all duration-200" style={{ marginLeft: 'var(--sidebar-w, 256px)' }}>
        {children}
      </main>
    </div>
  )
}
