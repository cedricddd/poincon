'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { showToast } from '@/hooks/useToast'

interface RTTRequest {
  id: string
  date: string
  hoursToRecover: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt?: string
  rejectionReason?: string
}

function StatusBadge({ status }: { status: RTTRequest['status'] }) {
  const cfg = {
    APPROVED: { label: 'Approuvé',   bg: 'bg-[var(--pp-pos)]/12',  text: 'text-[var(--pp-pos)]',  dot: 'bg-[var(--pp-pos)]' },
    REJECTED: { label: 'Rejeté',     bg: 'bg-[var(--pp-neg)]/12',  text: 'text-[var(--pp-neg)]',  dot: 'bg-[var(--pp-neg)]' },
    PENDING:  { label: 'En attente', bg: 'bg-[var(--pp-info)]/12', text: 'text-[var(--pp-info)]', dot: 'bg-[var(--pp-info)]' },
  }[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export default function RTTPage() {
  const [requests, setRequests] = useState<RTTRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ date: '', hoursToRecover: '', reason: '' })

  useEffect(() => { loadRequests() }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/rtt')
      if (res.ok) setRequests(await res.json())
    } catch {
      showToast('Erreur lors du chargement', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.date || !formData.hoursToRecover) {
      showToast('Veuillez remplir les champs obligatoires', 'warning')
      return
    }
    const hours = parseFloat(formData.hoursToRecover)
    if (hours <= 0 || hours > 8) { showToast('Les heures doivent être entre 0.5 et 8', 'warning'); return }
    if (new Date(formData.date) < new Date(new Date().toDateString())) {
      showToast('La date doit être dans le futur', 'warning'); return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/rtt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: formData.date, hoursToRecover: hours, reason: formData.reason }),
      })
      if (!res.ok) throw new Error()
      showToast('Demande RTT créée ✓', 'success')
      setFormData({ date: '', hoursToRecover: '', reason: '' })
      await loadRequests()
    } catch {
      showToast('Erreur lors de la création', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-BE', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })

  const totalApproved = requests.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.hoursToRecover, 0)

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-8">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Demandes RTT</h1>
            <p className="text-sm text-[var(--pp-muted)] mt-0.5">Récupération du temps de travail</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--pp-muted)]">RTT approuvés</p>
            <p className="text-2xl font-bold text-[var(--pp-pos)]">{totalApproved.toFixed(1)}h</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Form */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-base font-semibold text-[var(--pp-ink)] mb-4">Nouvelle demande</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Date de RTT</label>
                  <input type="date" value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3.5 border border-[var(--pp-line)] rounded-xl bg-[var(--pp-bg)] text-[var(--pp-ink)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)] touch-manipulation"
                    required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Heures à récupérer</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.5" min="0.5" max="8"
                      value={formData.hoursToRecover}
                      onChange={e => setFormData({ ...formData, hoursToRecover: e.target.value })}
                      placeholder="Ex: 2"
                      className="flex-1 px-4 py-3.5 border border-[var(--pp-line)] rounded-xl bg-[var(--pp-bg)] text-[var(--pp-ink)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)] touch-manipulation"
                      required />
                    <span className="text-sm text-[var(--pp-muted)] font-medium">h</span>
                  </div>
                  <p className="text-xs text-[var(--pp-muted)] mt-1">Entre 0.5h et 8h</p>
                </div>

                {formData.hoursToRecover && formData.date && (
                  <div className="p-3 rounded-xl bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)]/20">
                    <p className="text-xs text-[var(--pp-muted)] mb-0.5">Aperçu</p>
                    <p className="text-base font-bold text-[var(--pp-pos)]">
                      {fmt(formData.date)} · {parseFloat(formData.hoursToRecover).toFixed(1)}h
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide mb-1.5">Raison (optionnel)</label>
                  <textarea value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Rendez-vous médical, course importante…"
                    className="w-full px-3 py-2.5 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)] resize-none"
                    rows={3} />
                </div>

                <Button type="submit" disabled={submitting} className="w-full"
                  style={{ backgroundColor: 'var(--pp-pos)', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Envoi…' : 'Demander RTT'}
                </Button>
              </form>

              <div className="mt-5 p-3 rounded-xl bg-[var(--pp-bg2)] text-xs text-[var(--pp-muted)]">
                <p className="font-semibold text-[var(--pp-ink)] mb-1">Comment ça marche ?</p>
                <p>Utilisez vos heures supplémentaires approuvées pour partir plus tôt. L'admin valide la demande.</p>
              </div>
            </Card>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-base font-semibold text-[var(--pp-ink)] mb-4">Mes demandes</h2>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="pp-skel h-16" />)}
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-[var(--pp-line)] flex items-center justify-center mx-auto mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--pp-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </div>
                  <p className="text-[var(--pp-muted)] font-medium">Aucune demande RTT</p>
                  <p className="text-xs text-[var(--pp-muted)] mt-1">Créez votre première demande avec le formulaire</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map(req => (
                    <div key={req.id} className="p-4 rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] hover:border-[var(--pp-info)]/30 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--pp-ink)]">{fmt(req.date)}</p>
                          <p className="text-xs text-[var(--pp-muted)] mt-0.5">
                            -{req.hoursToRecover.toFixed(1)}h récupérée{req.hoursToRecover > 1 ? 's' : ''}
                          </p>
                          {req.reason && <p className="text-xs text-[var(--pp-muted)] mt-1 italic">« {req.reason} »</p>}
                        </div>
                        <StatusBadge status={req.status} />
                      </div>
                      {req.status === 'REJECTED' && req.rejectionReason && (
                        <div className="mt-3 p-2.5 rounded-lg bg-[var(--pp-neg)]/8 text-xs text-[var(--pp-neg)]">
                          <span className="font-medium">Motif : </span>{req.rejectionReason}
                        </div>
                      )}
                      {req.status === 'APPROVED' && req.approvedAt && (
                        <p className="mt-2 text-xs text-[var(--pp-muted)]">Approuvé le {fmt(req.approvedAt)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
