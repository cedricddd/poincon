import { resolveQrAccess, QR_ACCESS_ERRORS } from '@/lib/qr-access'
import { findDynamicTerminal } from '@/lib/kiosk-qr-server'
import { verifyQrCode, safeInterval } from '@/lib/kiosk-qr'
import { QrClockClient } from '../../[token]/QrClockClient'
import { QrError } from '../../QrError'

// Landing page of the rotating QR shown on a kiosk terminal: /qr/t/<qrPublicId>?c=<code>.
interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ c?: string | string[] }>
}

export const dynamic = 'force-dynamic'

export default async function DynamicQrPage({ params, searchParams }: Props) {
  const { id } = await params
  const { c } = await searchParams
  const code = typeof c === 'string' ? c : undefined

  const terminal = await findDynamicTerminal(id)
  if (!terminal) {
    return <QrError title="QR code invalide" message="Ce QR code n'est pas reconnu." />
  }

  if (!verifyQrCode(terminal.qrSecret, terminal.qrPublicId, code, new Date(), safeInterval(terminal.qrIntervalSeconds))) {
    return (
      <QrError
        title="QR code expiré"
        message="Le code change régulièrement : scannez à nouveau le QR code affiché sur la tablette."
      />
    )
  }

  const access = await resolveQrAccess(terminal.company)
  if (access.kind === 'other_company') {
    return <QrError title="Autre société" message={QR_ACCESS_ERRORS.other_company.error} />
  }
  if (access.kind === 'login_required') {
    // The code will have expired after the login: send the employee to the in-app scanner instead.
    return (
      <QrError
        title="Connexion requise"
        message={`${QR_ACCESS_ERRORS.login_required.error} Scannez ensuite à nouveau le QR code de la tablette.`}
        loginHref={`/login?callbackUrl=${encodeURIComponent('/qr')}`}
      />
    )
  }

  return (
    <QrClockClient
      token={terminal.qrPublicId}
      endpoint={`/api/qr/t/${encodeURIComponent(terminal.qrPublicId)}/clock`}
      code={code}
      siteName={terminal.site?.name ?? terminal.company.name}
      companyName={terminal.company.name}
      logoUrl={terminal.company.logoUrl}
      mode={access.kind}
      firstName={access.kind === 'account' ? access.user.name.split(' ')[0] : undefined}
    />
  )
}
