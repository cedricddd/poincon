'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="text-center max-w-sm">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.332a9 9 0 11-4.08-15.917m9.055 12.846a4 4 0 11-5.667-5.654m2.33 2.33a2 2 0 11-2.83-2.83m3.536 3.536L9.172 9.172" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Mode Hors Ligne</h1>
        <p className="text-slate-300 mb-6">
          Vous êtes actuellement hors ligne. Certaines fonctionnalités pourraient ne pas être disponibles.
        </p>
        <div className="space-y-3 mb-6">
          <p className="text-sm text-slate-400">✓ Pointages sauvegardés localement</p>
          <p className="text-sm text-slate-400">✓ Les données seront synchronisées automatiquement</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          Réessayer la connexion
        </button>
      </div>
    </div>
  )
}
