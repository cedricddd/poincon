import { prisma } from '@/lib/prisma'
import { companyHasAddon } from '@/lib/plan'
import { runReportAnalysis, type ReportGroupBy } from '@/lib/reportAnalysis'
import { sendEmail } from '@/lib/mail'
import { brusselsDateKey, brusselsDayOffset } from '@/lib/clock'
import { NextRequest, NextResponse } from 'next/server'

interface TemplateConfig {
  groupBy?: ReportGroupBy
  teamId?: string | null
}

function periodRange(frequency: 'weekly' | 'monthly'): { from: string; to: string } {
  const now = new Date()
  const from = frequency === 'weekly' ? brusselsDayOffset(now, -7) : brusselsDayOffset(now, -30)
  return { from: brusselsDateKey(from), to: brusselsDateKey(now) }
}

function toCsv(rows: Awaited<ReturnType<typeof runReportAnalysis>>): string {
  const lines = ['Groupe;Pointages;Heures;Jours de congé']
  for (const r of rows) lines.push([r.label, r.recordCount, r.totalHours.toFixed(2), r.timeOffDays].join(';'))
  return lines.join('\n')
}

/**
 * Runs report templates that have a scheduledFrequency set. A template is due
 * when it hasn't run in the current period (weekly: 7 days, monthly: 30 days)
 * — this cron is meant to be triggered daily and is idempotent per period.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const templates = await prisma.reportTemplate.findMany({
    where: { scheduledFrequency: { not: null } },
  })

  const sent: string[] = []

  for (const template of templates) {
    if (!await companyHasAddon(template.companyId, 'addon_custom_reports')) continue

    const frequency = template.scheduledFrequency as 'weekly' | 'monthly'
    const dueEveryMs = (frequency === 'weekly' ? 7 : 30) * 24 * 3600_000
    if (new Date().getTime() - new Date(template.updatedAt).getTime() < dueEveryMs) continue

    const recipients: string[] = template.recipientEmails ? JSON.parse(template.recipientEmails) : []
    if (recipients.length === 0) continue

    let config: TemplateConfig = {}
    try { config = JSON.parse(template.config) } catch { /* invalid config, skip */ }

    const { from, to } = periodRange(frequency)
    const rows = await runReportAnalysis({ companyId: template.companyId, from, to, teamId: config.teamId, groupBy: config.groupBy })
    const csv = toCsv(rows)

    for (const to_ of recipients) {
      await sendEmail({
        to: to_,
        subject: `Pointon — Rapport "${template.name}" (${from} → ${to})`,
        html: `<p>Rapport programmé « ${template.name} » pour la période du ${from} au ${to}.</p><pre>${csv}</pre>`,
      }).catch(err => console.error('[cron] scheduled report email failed', template.id, err))
    }

    await prisma.reportTemplate.update({ where: { id: template.id }, data: { updatedAt: new Date() } })
    sent.push(template.id)
  }

  return NextResponse.json({ sent: sent.length })
}
