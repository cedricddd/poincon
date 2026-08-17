import { Link } from '@/i18n/navigation'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-lg mb-6">Page introuvable</p>
        <Link href="/" className="underline">Retour à l'accueil</Link>
      </div>
    </main>
  )
}
