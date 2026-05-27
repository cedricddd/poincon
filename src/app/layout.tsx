import type { Metadata, Viewport } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import { auth } from '@/auth'

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })

export const metadata: Metadata = {
  title: 'PoinçOn - Pointeuse Légale Belgique 2027',
  description: 'Simple, conforme, prêt pour 2027',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PoinçOn',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function() {
            try {
              var t = localStorage.getItem('pp-theme');
              if (t === 'dark') document.documentElement.classList.add('dark');
              else if (t === 'light') document.documentElement.classList.add('light');
            } catch(e) {}
          })();
        `}</Script>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}</Script>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
