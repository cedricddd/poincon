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

  // Find Enterprise companies whose contract expires in exactly ~30 days
  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      plan: { name: 'ENTERPRISE' },
      planExpiresAt: { gte: in30Days, lt: in31Days },
    },
    include: {
      admin: { select: { email: true, name: true } },
    },
  })

  const results: { company: string; sentTo: string }[] = []

  for (const company of companies) {
    const recipientEmail = company.contactEmail || company.admin.email
    const expiresAt = company.planExpiresAt!.toLocaleDateString('fr-BE')
    const companyName = company.name
    const paidStatus = company.enterprisePaidStatus ?? 'UNPAID'

    await sendEmail({
      to: recipientEmail,
      subject: `Renouvellement contrat Enterprise — ${companyName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Rappel de renouvellement</h2>
          <p>Bonjour,</p>
          <p>Le contrat Enterprise de <strong>${companyName}</strong> arrive à expiration le <strong>${expiresAt}</strong> (dans 30 jours).</p>
          <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
            <tr>
              <td style="padding:8px; background:#f4f4f8; font-weight:bold;">Société</td>
              <td style="padding:8px;">${companyName}</td>
            </tr>
            <tr>
              <td style="padding:8px; background:#f4f4f8; font-weight:bold;">Date d'expiration</td>
              <td style="padding:8px;">${expiresAt}</td>
            </tr>
            <tr>
              <td style="padding:8px; background:#f4f4f8; font-weight:bold;">Statut paiement</td>
              <td style="padding:8px; color:${paidStatus === 'PAID' ? '#22c55e' : '#ef4444'};">${paidStatus}</td>
            </tr>
          </table>
          <p>Veuillez envoyer la nouvelle facture au client afin de renouveler son accès.</p>
          <p style="color:#888; font-size:12px;">— Pointon Super Admin</p>
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
