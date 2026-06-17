import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Logo } from '@/components/Logo'

interface Props {
  params: Promise<{ token: string }>
}

export default async function QrPage({ params }: Props) {
  const { token } = await params
  const site = await prisma.site.findUnique({
    where: { qrToken: token },
    select: {
      id: true,
      name: true,
      active: true,
      qrTokenExpiresAt: true,
      company: { select: { name: true } },
    },
  })

  if (!site || !site.active) {
    return <QrError reason="not_found" />
  }

  if (site.qrTokenExpiresAt && site.qrTokenExpiresAt < new Date()) {
    return <QrError reason="expired" siteName={site.name} />
  }

  redirect(`/app/clock?siteId=${site.id}`)
}

function QrError({ reason, siteName }: { reason: 'not_found' | 'expired'; siteName?: string }) {
  return (
    <div className="min-h-screen bg-[var(--pp-bg)] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="mb-8">
          <Logo size="md" useThemeVar />
        </div>

        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        {reason === 'expired' ? (
          <>
            <h1 className="text-xl font-bold text-[var(--pp-ink)] mb-2">QR code expiré</h1>
            <p className="text-[var(--pp-muted)] text-sm mb-6">
              {siteName && <span className="font-medium">{siteName} — </span>}
              Ce QR code a expiré. Demandez à votre administrateur de le renouveler.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-[var(--pp-ink)] mb-2">QR code invalide</h1>
            <p className="text-[var(--pp-muted)] text-sm mb-6">
              Ce QR code n'est pas reconnu. Vérifiez que vous utilisez le bon code.
            </p>
          </>
        )}

        <Link
          href="/app/clock"
          className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--pp-pos)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Pointer manuellement
        </Link>
      </div>
    </div>
  )
}
