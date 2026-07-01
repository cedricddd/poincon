import { prisma } from '@/lib/prisma'
import { QrClockClient } from './QrClockClient'

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
      company: { select: { name: true, logoUrl: true } },
    },
  })

  if (!site || !site.active) {
    return <QrError />
  }

  return (
    <QrClockClient
      token={token}
      siteName={site.name}
      companyName={site.company.name}
      logoUrl={site.company.logoUrl}
    />
  )
}

function QrError() {
  return (
    <div className="min-h-screen bg-[#090c14] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">QR code invalide</h1>
        <p className="text-white/50 text-sm">Ce QR code n'est pas reconnu.</p>
      </div>
    </div>
  )
}
