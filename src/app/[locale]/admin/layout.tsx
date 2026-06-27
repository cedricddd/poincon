import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'
import { DemoBanner } from '@/components/DemoBanner'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [session, locale] = await Promise.all([auth(), getLocale()])
  if (!session?.user) redirect(`/${locale}/login`)
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') redirect(`/${locale}/app`)

  if (session.user.role === 'ADMIN') {
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') ?? ''
    if (!pathname.startsWith(`/${locale}/admin/onboarding`)) {
      const admin = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true },
      })
      if (admin?.companyId) {
        const company = await prisma.company.findUnique({
          where: { id: admin.companyId },
          select: { onboardingCompleted: true },
        })
        if (company && !company.onboardingCompleted) {
          redirect(`/${locale}/admin/onboarding`)
        }
      }
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 transition-all duration-200 pb-16 md:pb-0 pt-14 md:pt-0 ml-0 md:ml-[var(--sidebar-w,256px)] min-w-0">
        <DemoBanner />
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
