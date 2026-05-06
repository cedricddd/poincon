import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PoinçOn - Pointeuse Légale Belgique 2027',
  description: 'Simple, conforme, prêt pour 2027',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
