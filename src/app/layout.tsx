import type { Metadata, Viewport } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { auth } from '@/auth'
import { CookieBanner } from '@/components/CookieBanner'

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://pointon.be'),
  title: {
    default: 'Pointon — Pointeuse Légale Belgique 2027',
    template: '%s | Pointon',
  },
  description: 'Pointeuse légale pour PME belges. Enregistrez le temps de travail conformément à la loi belge et CJUE 2027. Setup en 2 minutes, audit trail immuable, export certifié.',
  keywords: ['pointeuse belgique', 'pointage temps travail', 'loi 2027 belgique', 'enregistrement temps travail PME', 'CJUE conformité', 'logiciel RH belge', 'RGPD', 'audit trail'],
  authors: [{ name: 'Ced-IT', url: 'https://ced-it.be' }],
  creator: 'Ced-IT',
  openGraph: {
    type: 'website',
    locale: 'fr_BE',
    url: 'https://pointon.be',
    siteName: 'Pointon',
    title: 'Pointon — Pointeuse Légale Belgique 2027',
    description: 'Enregistrez le temps de travail légalement en Belgique. En 1 tap. Audit trail immuable. Conforme CJUE 2027.',
    images: [{ url: '/images/hero-main.png', width: 1200, height: 630, alt: 'Pointon — Pointeuse légale belge' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pointon — Pointeuse Légale Belgique 2027',
    description: 'Enregistrez le temps de travail légalement en Belgique. En 1 tap. Audit trail immuable.',
    images: ['/images/hero-main.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://pointon.be/',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pointon',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#10b981',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  return (
    <html lang="fr" suppressHydrationWarning className={`${syne.variable} ${dmSans.variable}`}>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('pp-theme');if(t==='dark')document.documentElement.classList.add('dark');else if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Pointon',
              description: 'Pointeuse légale pour PME belges. Enregistrement objectif du temps de travail conforme à la loi belge et CJUE 2027.',
              url: 'https://pointon.be',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web, iOS, Android, Windows',
              inLanguage: 'fr-BE',
              offers: [
                { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'EUR' },
                { '@type': 'Offer', name: 'Solo', price: '49', priceCurrency: 'EUR' },
                { '@type': 'Offer', name: 'Team', price: '99', priceCurrency: 'EUR' },
              ],
              publisher: { '@type': 'Organization', name: 'Ced-IT', url: 'https://ced-it.be' },
            }),
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Providers session={session}>{children}</Providers>
        <CookieBanner />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js');});}` }} />
      </body>
    </html>
  )
}
