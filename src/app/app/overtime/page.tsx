'use client'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Card } from '@/components/Card'

export default function OvertimePage() {
  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-20">
      {/* Header */}
      <header className="sticky top-0 border-b border-[var(--pp-line)] bg-[var(--pp-bg)]/95 backdrop-blur py-4">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Heures Supplémentaires</h1>
          <p className="text-sm text-[var(--pp-muted)] mt-1">
            Comprendre le système des heures sup
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* How it works */}
          <Card>
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">⚡ Comment ça marche?</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-[var(--pp-ink)] mb-1">1️⃣ Détection automatique</p>
                <p className="text-[var(--pp-muted)]">
                  Quand vous travaillez plus que vos heures configurées (ex: 8h), les heures supplémentaires sont détectées automatiquement par le système.
                </p>
              </div>
              <div>
                <p className="font-medium text-[var(--pp-ink)] mb-1">2️⃣ Validation admin</p>
                <p className="text-[var(--pp-muted)]">
                  L'administrateur voit ces heures sup dans son dashboard et les approuve ou les rejette.
                </p>
              </div>
              <div>
                <p className="font-medium text-[var(--pp-ink)] mb-1">3️⃣ Utilisation</p>
                <p className="text-[var(--pp-muted)]">
                  Une fois approuvées, vous pouvez utiliser ces heures de 2 façons (voir ci-contre).
                </p>
              </div>
            </div>
          </Card>

          {/* Two ways to use */}
          <Card>
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">🎯 2 Façons d'utiliser</h2>
            <div className="space-y-4 text-sm">
              <div className="p-3 rounded-lg bg-[var(--pp-info)]/10 border border-[var(--pp-info)]/20">
                <p className="font-medium text-[var(--pp-info)] mb-1">🏖️ Approche 1: Jours de Congé Bonus</p>
                <p className="text-[var(--pp-muted)]">
                  8h heures sup = 1 jour de congé supplémentaire
                </p>
                <p className="text-xs text-[var(--pp-muted)] mt-1">
                  → Allez à <Link href="/app/time-off" className="underline font-medium">Congés</Link> pour demander un jour bonus
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)]/20">
                <p className="font-medium text-[var(--pp-pos)] mb-1">🚀 Approche 2: Récupération</p>
                <p className="text-[var(--pp-muted)]">
                  Partir plus tôt grâce à vos heures sup (1h = partir 1h plus tôt)
                </p>
                <p className="text-xs text-[var(--pp-muted)] mt-1">
                  → Allez à <Link href="/app/rtt" className="underline font-medium">Récupération</Link> pour demander un départ anticipé
                </p>
              </div>
            </div>
          </Card>

          {/* Example */}
          <Card className="md:col-span-2">
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">📌 Exemple concret</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-[var(--pp-ink)] mb-2">Scénario</p>
                <ul className="space-y-1 text-[var(--pp-muted)]">
                  <li>• Vous travaillez 8h par jour (configuré)</li>
                  <li>• Lundi: vous travaillez 10h</li>
                  <li>• → 2 heures sup détectées</li>
                  <li>• • Mardi: vous travaillez 9.5h</li>
                  <li>• → 1.5 heures sup détectées</li>
                  <li>• Total semaine: 3.5h heures sup</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-[var(--pp-ink)] mb-2">Si approbation admin</p>
                <div className="space-y-2">
                  <div className="p-2 rounded bg-[var(--pp-info)]/10">
                    <p className="text-xs font-medium text-[var(--pp-info)]">Option 1:</p>
                    <p className="text-xs text-[var(--pp-muted)]">
                      3.5h = 0.44 jour (demander ~4h comme bonus)
                    </p>
                  </div>
                  <div className="p-2 rounded bg-[var(--pp-pos)]/10">
                    <p className="text-xs font-medium text-[var(--pp-pos)]">Option 2:</p>
                    <p className="text-xs text-[var(--pp-muted)]">
                      3.5h récupération : partir 3.5h plus tôt une journée
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* FAQ */}
          <Card className="md:col-span-2">
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">❓ FAQ</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-[var(--pp-ink)]">Q: Mes heures sup sont automatiques?</p>
                <p className="text-[var(--pp-muted)]">
                  Oui! Elles sont calculées automatiquement lors de votre pointage en fin de journée.
                </p>
              </div>
              <div>
                <p className="font-medium text-[var(--pp-ink)]">Q: Et si l'admin les refuse?</p>
                <p className="text-[var(--pp-muted)]">
                  Elles ne comptent pas dans votre solde. L'admin peut ajouter une raison du rejet.
                </p>
              </div>
              <div>
                <p className="font-medium text-[var(--pp-ink)]">Q: Puis-je combiner les deux approches?</p>
                <p className="text-[var(--pp-muted)]">
                  Oui! Par exemple: 16h sup = 1 jour congé (8h) + 8h récupération.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
