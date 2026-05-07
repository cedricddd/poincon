'use client'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-20">
      {/* Header */}
      <header className="sticky top-0 border-b border-[var(--pp-line)] bg-[var(--pp-bg)]/95 backdrop-blur py-4">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Rapports & Historique</h1>
          <p className="text-sm text-[var(--pp-muted)] mt-1">Consultez vos pointages et statistiques</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <Card>
          <div className="text-center py-12">
            <p className="text-2xl mb-2">📊</p>
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-2">À venir</h2>
            <p className="text-[var(--pp-muted)]">Les rapports sont en développement</p>
            <p className="text-xs text-[var(--pp-muted)] mt-4">Cette page permettra de:</p>
            <ul className="text-xs text-[var(--pp-muted)] mt-2 space-y-1">
              <li>✓ Filtrer les pointages par date/localisation</li>
              <li>✓ Voir les statistiques mensuelles/annuelles</li>
              <li>✓ Exporter en CSV/PDF</li>
              <li>✓ Graphiques de tendances</li>
              <li>✓ Résumé congés/heures sup/solde</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}
