import { prisma } from '@/lib/prisma'

type AccountState = {
  active: boolean
  deletedAt: Date | null
  companyMember: { deletedAt: Date | null } | null
} | null

// Deactivated or soft-deleted accounts, and members of a soft-deleted company,
// keep their history but lose access to the app.
export function isAccountUsable(user: AccountState): boolean {
  if (!user || !user.active || user.deletedAt) return false
  if (user.companyMember?.deletedAt) return false
  return true
}

export const accountStateSelect = {
  active: true,
  deletedAt: true,
  companyMember: { select: { deletedAt: true } },
} as const

export async function isAccountUsableById(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: accountStateSelect })
  return isAccountUsable(user)
}
