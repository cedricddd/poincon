import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Comparaison pointeuses belges — Pointon vs concurrents',
  description: 'Comparez Pointon avec les autres solutions de pointage en Belgique. Seul Pointon est prêt pour l\'obligation 2027, mobile-first et gratuit pour démarrer.',
  alternates: { canonical: 'https://pointon.be/comparaison' },
}

export default function ComparaisonLayout({ children }: { children: React.ReactNode }) {
  return children
}
