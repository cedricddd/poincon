import { prisma } from '@/lib/prisma'

// Extract client IP and user-agent from a request, for audit trails on
// unauthenticated or sensitive flows (signup, invitations, password set).
export function requestMeta(req: { headers: { get(name: string): string | null } }): {
  ipAddress?: string
  userAgent?: string
} {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    undefined
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) || undefined
  return { ipAddress, userAgent }
}

type LogAuditParams = {
  userId: string | null
  action: string
  resource: string
  resourceId?: string
  changes?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  status?: 'success' | 'failure'
}

export async function logAudit(params: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        changes: params.changes ? JSON.stringify(params.changes) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        status: params.status ?? 'success',
      },
    })
  } catch {
    // Never block the main action if audit logging fails
  }
}
