import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function DemoBanner() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      company: { select: { isDemo: true } },
      companyMember: { select: { isDemo: true } },
    },
  })

  const isDemo = user?.company?.isDemo || user?.companyMember?.isDemo
  if (!isDemo) return null

  return (
    <div className="w-full bg-amber-400 text-amber-900 text-center text-sm font-semibold py-2 px-4 flex items-center justify-center gap-2 select-none">
      <span>🎭</span>
      <span>Mode Démonstration — Données fictives uniquement</span>
      <span className="hidden sm:inline text-amber-700 font-normal">· Aucune donnée réelle n'est affectée</span>
    </div>
  )
}
