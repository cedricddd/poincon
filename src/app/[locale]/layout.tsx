import type { Metadata, Viewport } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import { headers, cookies } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { Providers } from '../providers'
import { auth } from '@/auth'
import { CookieBanner } from '@/components/CookieBanner'
import { GoogleAdsTag } from '@/components/GoogleAdsTag'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import '../globals.css'

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })

const OG_LOCALES: Record<string, string> = {
  fr: 'fr_BE',
  nl: 'nl_BE',
  en: 'en_GB',
  de: 'de_DE',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    metadataBase: new URL('https://pointon.be'),
    title: {
      default: 'Pointon — Pointeuse Belge, Prête pour 2027',
      template: '%s | Pointon',
    },
    description:
      'Pointeuse pour PME belges. Enregistrez le temps de travail selon l\'arrêt CJUE 2019, prêt pour l\'obligation légale prévue en 2027. Setup en 2 minutes, audit trail immuable, export certifié.',
    keywords: [
      'pointeuse belgique',
      'pointage temps travail',
      'obligation pointage 2027',
      'enregistrement temps travail PME',
      'CJUE conformité',
      'logiciel RH belge',
      'RGPD',
      'audit trail',
    ],
    authors: [{ name: 'Ced-IT', url: 'https://ced-it.be' }],
    creator: 'Ced-IT',
    openGraph: {
      type: 'website',
      locale: OG_LOCALES[locale] ?? 'fr_BE',
      url: `https://pointon.be/${locale}`,
      siteName: 'Pointon',
      title: 'Pointon — Pointeuse Belge, Prête pour 2027',
      description:
        'Enregistrez le temps de travail en Belgique. En 1 tap. Audit trail immuable. Prêt pour l\'obligation 2027.',
      images: [
        {
          url: '/images/hero-main.png',
          width: 1200,
          height: 630,
          alt: 'Pointon — Pointeuse légale belge',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Pointon — Pointeuse Belge, Prête pour 2027',
      description:
        'Enregistrez le temps de travail en Belgique. En 1 tap. Audit trail immuable.',
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
      canonical: `https://pointon.be/${locale}`,
      languages: {
        fr: 'https://pointon.be/fr',
        nl: 'https://pointon.be/nl',
        en: 'https://pointon.be/en',
        de: 'https://pointon.be/de',
      },
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
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#10b981',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  const [session, hdrs, messages, cookieStore] = await Promise.all([
    auth(), headers(), getMessages({ locale }), cookies(),
  ])
  const nonce = hdrs.get('x-nonce') ?? undefined
  // Theme is applied server-side from a cookie (default: dark) so the <html>
  // class survives locale navigation — it is no longer clobbered by re-renders.
  const themeClass = cookieStore.get('pp-theme')?.value === 'light' ? 'light' : 'dark'

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${syne.variable} ${dmSans.variable} ${themeClass}`}
    >
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <script
          nonce={nonce}
          suppressHydrationWarning
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Pointon',
              description:
                'Pointeuse pour PME belges. Enregistrement objectif du temps de travail selon l\'arrêt CJUE 2019, prêt pour l\'obligation légale prévue en 2027.',
              url: 'https://pointon.be',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web, iOS, Android, Windows',
              inLanguage: locale,
              offers: [
                { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'EUR' },
                { '@type': 'Offer', name: 'Starter', price: '19.90', priceCurrency: 'EUR' },
                { '@type': 'Offer', name: 'Team', price: '44.90', priceCurrency: 'EUR' },
              ],
              publisher: { '@type': 'Organization', name: 'Ced-IT', url: 'https://ced-it.be' },
            }),
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers session={session}>
            {children}
          </Providers>
          <CookieBanner />
          <GoogleAdsTag nonce={nonce} />
          <ServiceWorkerRegistration />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
