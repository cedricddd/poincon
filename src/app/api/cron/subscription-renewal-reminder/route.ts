import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in31Days = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)

  // Solo/Team companies renewing in ~30 days (via Stripe stripeCurrentPeriodEnd)
  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      plan: { name: { in: ['SOLO', 'TEAM'] } },
      stripeCurrentPeriodEnd: { gte: in30Days, lt: in31Days },
    },
    include: {
      admin: { select: { email: true, name: true } },
      plan: { select: { name: true } },
    },
  })

  const results: { company: string; sentTo: string }[] = []

  for (const company of companies) {
    const recipientEmail = company.contactEmail || company.admin.email
    const renewDate = company.stripeCurrentPeriodEnd!.toLocaleDateString('fr-BE')
    const companyName = company.name
    const planName = company.plan?.name ?? 'Solo/Team'
    const cycle = company.stripeSubscriptionBillingCycle === 'yearly' ? 'annuel' : 'mensuel'

    await sendEmail({
      to: recipientEmail,
      subject: `Renouvellement abonnement ${planName} — ${companyName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Rappel de renouvellement automatique</h2>
          <p>Bonjour,</p>
          <p>L'abonnement <strong>Pointon ${planName}</strong> de <strong>${companyName}</strong> se renouvelle automatiquement le <strong>${renewDate}</strong> (dans 30 jours).</p>
          <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
            <tr>
              <td style="padding:8px; background:#f4f4f8; font-weight:bold;">Société</td>
              <td style="padding:8px;">${companyName}</td>
            </tr>
            <tr>
              <td style="padding:8px; background:#f4f4f8; font-weight:bold;">Plan</td>
              <td style="padding:8px;">Pointon ${planName}</td>
            </tr>
            <tr>
              <td style="padding:8px; background:#f4f4f8; font-weight:bold;">Cycle</td>
              <td style="padding:8px;">${cycle}</td>
            </tr>
            <tr>
              <td style="padding:8px; background:#f4f4f8; font-weight:bold;">Date de renouvellement</td>
              <td style="padding:8px;">${renewDate}</td>
            </tr>
          </table>
          <p>Le paiement sera prélevé automatiquement via Stripe. Aucune action n'est requise de votre part.</p>
          <p>Pour annuler ou modifier votre abonnement, contactez notre équipe.</p>
          <p style="color:#888; font-size:12px;">— Pointon</p>
        </div>
      `,
    })

    results.push({ company: companyName, sentTo: recipientEmail })
  }

  return NextResponse.json({
    checked: companies.length,
    reminded: results.length,
    results,
  })
}
