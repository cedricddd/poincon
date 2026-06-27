import { Cormorant_Garamond, Jost, JetBrains_Mono } from 'next/font/google'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['300', '400'],
  variable: '--font-cormorant',
  display: 'swap',
})
const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-jost',
  display: 'swap',
})
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata = { title: 'Kiosque — Pointon', robots: { index: false } }

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`min-h-screen ${cormorant.variable} ${jost.variable} ${jetbrains.variable}`}>
      {children}
    </div>
  )
}
