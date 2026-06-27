'use client'

export const dynamic = 'force-dynamic'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">Une erreur est survenue</h1>
        <p className="text-sm text-[var(--pp-muted)] mb-6">{error.message}</p>
        <button onClick={reset} className="px-4 py-2 bg-emerald-600 text-white rounded">
          Réessayer
        </button>
      </div>
    </main>
  )
}
