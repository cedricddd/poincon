import { prisma } from '@/lib/prisma'

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
