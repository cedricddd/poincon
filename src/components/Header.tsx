import Link from 'next/link'
import { Button } from './Button'

export function Header() {
  return (
    <header className="border-b border-[var(--pp-line)] bg-[var(--pp-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-[var(--pp-ink)]">
          PoinçOn
        </Link>
        <nav className="hidden md:flex gap-8">
          <a href="#features" className="text-[var(--pp-muted)] hover:text-[var(--pp-ink)]">
            Fonctionnalités
          </a>
          <a href="#pricing" className="text-[var(--pp-muted)] hover:text-[var(--pp-ink)]">
            Tarifs
          </a>
          <a href="#faq" className="text-[var(--pp-muted)] hover:text-[var(--pp-ink)]">
            FAQ
          </a>
        </nav>
        <div className="flex gap-3">
          <Button variant="outline" size="md">
            <Link href="/login">Connexion</Link>
          </Button>
          <Button size="md">
            <Link href="/signup">Inscription</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
