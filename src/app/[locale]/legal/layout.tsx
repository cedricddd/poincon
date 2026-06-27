import { Header } from '@/components/Header'
import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--pp-bg)] text-[var(--pp-ink)]">
      <Header />
      <main className="pt-16">
        {children}
      </main>
      <footer className="py-10 border-t border-[var(--pp-line)] mt-16">
        <div className="mx-auto max-w-3xl px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[var(--pp-muted)]">
          <Link href="/" className="hover:text-[var(--pp-ink)] transition-colors font-medium">
            ← Retour à l'accueil
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/legal/privacy" className="hover:text-[var(--pp-ink)] transition-colors">Confidentialité</Link>
            <Link href="/legal/terms" className="hover:text-[var(--pp-ink)] transition-colors">Conditions</Link>
            <Link href="/legal/compliance" className="hover:text-[var(--pp-ink)] transition-colors">Conformité</Link>
            <Link href="/legal/security" className="hover:text-[var(--pp-ink)] transition-colors">Sécurité</Link>
          </div>
          <span className="text-xs">© 2026 Pointon · Ced-IT</span>
        </div>
      </footer>
    </div>
  )
}
