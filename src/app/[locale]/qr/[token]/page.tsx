import { prisma } from '@/lib/prisma'
import { resolveQrAccess, QR_ACCESS_ERRORS } from '@/lib/qr-access'
import { QrClockClient } from './QrClockClient'
import { QrError } from '../QrError'
import { siteHasDynamicQr, STATIC_QR_DISABLED } from '@/lib/kiosk-qr-server'

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
      company: { select: { id: true, name: true, logoUrl: true, qrAccountOnly: true } },
    },
  })

  if (!site || !site.active) {
    return <QrError title="QR code invalide" message="Ce QR code n'est pas reconnu." />
  }

  if (await siteHasDynamicQr(site.company.id, site.id)) {
    return <QrError title="QR code remplacé" message={STATIC_QR_DISABLED.error} />
  }

  const access = await resolveQrAccess(site.company)
  if (access.kind === 'other_company') {
    return <QrError title="Autre société" message={QR_ACCESS_ERRORS.other_company.error} />
  }
  if (access.kind === 'login_required') {
    return (
      <QrError
        title="Connexion requise"
        message={QR_ACCESS_ERRORS.login_required.error}
        loginHref={`/login?callbackUrl=${encodeURIComponent(`/qr/${token}`)}`}
      />
    )
  }

  return (
    <QrClockClient
      token={token}
      siteName={site.name}
      companyName={site.company.name}
      logoUrl={site.company.logoUrl}
      mode={access.kind}
      firstName={access.kind === 'account' ? access.user.name.split(' ')[0] : undefined}
    />
  )
}
