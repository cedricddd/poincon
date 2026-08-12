import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { PLAN_LIMITS, PlanName } from '@/lib/plan'
import { brusselsDateParts, brusselsMonthRange, brusselsDayOffset } from '@/lib/clock'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
})

function formatDuration(minutes: number | null): string {
  if (minutes == null) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h${String(m).padStart(2, '0')}`
}

function buildCsv(records: any[]): string {
  const header = 'Employé,Email,Date,Arrivée,Départ,Durée,Site,Localisation'
  const rows = records.map(r => {
    const arrival = new Date(r.arrivalTime).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' })
    const departure = r.departureTime ? new Date(r.departureTime).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' }) : ''
    const date = new Date(r.date).toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' })
    return [
      r.user.name ?? '',
      r.user.email,
      date,
      arrival,
      departure,
      formatDuration(r.duration),
      r.site?.name ?? '',
      r.location,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  return [header, ...rows].join('\n')
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.BREVO_SMTP_KEY) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
  }

  const now = new Date()
  const { year, month, day } = brusselsDateParts(now)
  const brusselsWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Brussels', weekday: 'short' }).format(now)
  const isMonday = brusselsWeekday === 'Mon'
  const isFirstOfMonth = day === 1

  // Récupérer toutes les companies avec un plan actif
  const companies = await prisma.company.findMany({
    include: {
      plan: true,
      admin: { select: { email: true, name: true } },
      members: { select: { id: true } },
    },
  })

  let sent = 0
  let skipped = 0

  for (const company of companies) {
    const planName = (company.plan?.name?.toUpperCase() ?? 'FREE') as PlanName
    const limits = PLAN_LIMITS[planName]
    const schedule = limits.scheduledExport

    // Vérifier si on doit envoyer aujourd'hui
    const shouldSend =
      (schedule === 'weekly' && isMonday) ||
      (schedule === 'monthly' && isFirstOfMonth)

    if (!shouldSend) { skipped++; continue }

    // Calculer la période (bornes calendaires de Bruxelles, pas celles du serveur)
    let periodStart: Date
    let periodEnd: Date
    if (schedule === 'weekly') {
      periodStart = brusselsDayOffset(now, -7)
      periodEnd = brusselsDayOffset(now, 1) // exclusive : fin de la journée d'aujourd'hui
    } else {
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      ;({ start: periodStart, end: periodEnd } = brusselsMonthRange(prevYear, prevMonth))
    }

    const memberIds = company.members.map(m => m.id)

    const records = await prisma.clockRecord.findMany({
      where: {
        userId: { in: memberIds },
        date: { gte: periodStart, lt: periodEnd },
      },
      include: {
        user: { select: { name: true, email: true } },
        site: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { arrivalTime: 'asc' }],
    })

    if (records.length === 0) { skipped++; continue }

    const csv = buildCsv(records)
    const periodLabel = schedule === 'weekly'
      ? `semaine du ${periodStart.toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' })}`
      : `mois de ${periodStart.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric', timeZone: 'Europe/Brussels' })}`
    const filename = `pointages-${periodLabel.replace(/\s/g, '-')}.csv`

    await transporter.sendMail({
      from: `Pointon <${process.env.BREVO_FROM_EMAIL ?? 'noreply@ced-it.be'}>`,
      to: company.admin.email,
      subject: `📊 Pointon — Export pointages ${periodLabel}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
          <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
            <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">Pointon</h1>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
            <p style="color:#334155;">Bonjour ${company.admin.name ?? ''},</p>
            <p style="color:#334155;">Veuillez trouver en pièce jointe l'export des pointages pour la <strong>${periodLabel}</strong>.</p>
            <p style="color:#334155;">${records.length} pointage(s) exporté(s).</p>
            <p style="color:#94a3b8;font-size:12px;margin-top:32px;">Pointon · ${now.getFullYear()}</p>
          </div>
        </div>
      `,
      attachments: [{
        filename,
        content: Buffer.from('﻿' + csv, 'utf-8'), // BOM pour Excel
        contentType: 'text/csv; charset=utf-8',
      }],
    })

    sent++
  }

  return NextResponse.json({ sent, skipped, total: companies.length })
}
