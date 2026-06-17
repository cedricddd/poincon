import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Pointon QR',
  description: 'Pointage via QR code sans application',
  manifest: '/qr-manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Pointon QR',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/icon-192.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#090c14',
}

export default function QrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
