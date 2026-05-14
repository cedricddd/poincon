'use client'

export const dynamic = 'force-dynamic'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ textAlign: 'center', maxWidth: '32rem' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '1rem' }}>Une erreur est survenue</h1>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>Nous avons été informés du problème.</p>
            <button onClick={reset} style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 0, borderRadius: '0.375rem', cursor: 'pointer' }}>
              Réessayer
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
