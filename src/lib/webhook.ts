import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { companyHasAddon } from '@/lib/plan'

export type WebhookEventType =
  | 'shift.created'
  | 'shift.updated'
  | 'shift.deleted'
  | 'timeoff.approved'
  | 'timeoff.rejected'
  | 'timeoff.created'
  | 'employee.created'
  | 'employee.updated'
  | 'clockrecord.created'
  | 'clockrecord.departed'
  | 'rtt.approved'

export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
  'shift.created':       'Shift créé',
  'shift.updated':       'Shift modifié',
  'shift.deleted':       'Shift supprimé',
  'timeoff.approved':    'Congé approuvé',
  'timeoff.rejected':    'Congé refusé',
  'timeoff.created':     'Congé soumis',
  'employee.created':    'Employé créé',
  'employee.updated':    'Employé modifié',
  'clockrecord.created': 'Pointage enregistré',
  'clockrecord.departed': 'Départ enregistré',
  'rtt.approved':        'RTT approuvé',
}

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`
}

function signPayload(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export async function dispatchWebhook(
  companyId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  if (!(await companyHasAddon(companyId, 'addon_webhooks'))) return

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { companyId, enabled: true },
  })

  const payload = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data,
  })

  await Promise.allSettled(
    endpoints
      .filter(ep => {
        const events: string[] = JSON.parse(ep.events || '[]')
        return events.length === 0 || events.includes(event)
      })
      .map(async ep => {
        const signature = signPayload(ep.secret, payload)
        let statusCode: number | null = null
        let responseBody: string | null = null
        let success = false

        try {
          const res = await fetch(ep.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Pointon-Signature': signature,
              'X-Pointon-Event': event,
            },
            body: payload,
            signal: AbortSignal.timeout(10000),
          })
          statusCode = res.status
          responseBody = await res.text().catch(() => null)
          success = res.ok
        } catch {
          statusCode = null
        }

        await prisma.webhookDelivery.create({
          data: { endpointId: ep.id, event, payload, statusCode, responseBody, success },
        })
      })
  )
}

export function dispatchWebhookSafe(
  companyId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): void {
  dispatchWebhook(companyId, event, data).catch(err =>
    console.error('[webhook] dispatch failed', companyId, event, err instanceof Error ? err.message : err)
  )
}
