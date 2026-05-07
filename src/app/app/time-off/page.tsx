'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { showToast } from '@/hooks/useToast'

interface TimeOffRequest {
  id: string
  startDate: string
  endDate: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt?: string
  rejectionReason?: string
}

export default function TimeOffPage() {
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  })

  // Load requests on mount
  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/time-off')
      if (res.ok) {
        const data = await res.json()
        setRequests(data)
      }
    } catch (error) {
      console.error('Failed to load requests:', error)
      showToast('Erreur lors du chargement', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.startDate || !formData.endDate) {
      showToast('Veuillez sélectionner les dates', 'warning')
      return
    }

    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)

    if (end < start) {
      showToast('La date de fin doit être après la date de début', 'warning')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error('Failed to create request')
      }

      showToast('Demande de congé créée ✓', 'success')
      setFormData({ startDate: '', endDate: '', reason: '' })
      await loadRequests()
    } catch (error) {
      console.error('Error:', error)
      showToast('Erreur lors de la création', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const getDaysBetween = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return days
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-[var(--pp-pos)]/10 text-[var(--pp-pos)] border-[var(--pp-pos)]/20'
      case 'REJECTED':
        return 'bg-[var(--pp-neg)]/10 text-[var(--pp-neg)] border-[var(--pp-neg)]/20'
      default:
        return 'bg-[var(--pp-info)]/10 text-[var(--pp-info)] border-[var(--pp-info)]/20'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '✓ Approuvé'
      case 'REJECTED':
        return '✗ Rejeté'
      default:
        return '⏳ En attente'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-BE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-20">
      {/* Header */}
      <header className="sticky top-0 border-b border-[var(--pp-line)] bg-[var(--pp-bg)]/95 backdrop-blur py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Demandes de Congé</h1>
            <p className="text-sm text-[var(--pp-muted)] mt-1">Gérez vos demandes de congé</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">
                Nouvelle Demande
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                    required
                  />
                </div>

                {/* Days Preview */}
                {formData.startDate && formData.endDate && (
                  <div className="p-3 rounded-lg bg-[var(--pp-info)]/10 border border-[var(--pp-info)]/20">
                    <p className="text-sm text-[var(--pp-muted)] mb-1">Durée</p>
                    <p className="text-lg font-bold text-[var(--pp-info)]">
                      {getDaysBetween(formData.startDate, formData.endDate)} jour(s)
                    </p>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Motif (optionnel)
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Ex: Vacances, Rendez-vous médical, etc."
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] resize-none"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                  style={{
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Création...' : 'Demander un Congé'}
                </Button>
              </form>

              {/* Info Box */}
              <div className="mt-6 p-3 rounded-lg bg-[var(--pp-muted)]/10 text-xs text-[var(--pp-muted)]">
                <p className="font-medium mb-2">💡 Info</p>
                <p>Votre demande sera soumise à validation par l'administration.</p>
                <p className="mt-1">Les demandes approuvées apparaîtront dans votre solde de congés.</p>
              </div>
            </Card>
          </div>

          {/* Requests List Column */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">
                Mes Demandes
              </h2>

              {loading ? (
                <div className="text-sm text-[var(--pp-muted)]">Chargement...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[var(--pp-muted)] mb-2">Aucune demande</p>
                  <p className="text-xs text-[var(--pp-muted)]">
                    Créez votre première demande de congé avec le formulaire
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map(request => (
                    <div
                      key={request.id}
                      className={`p-4 rounded-lg border ${getStatusColor(request.status)}`}
                    >
                      {/* Status Badge */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium mb-1">
                            {formatDate(request.startDate)} → {formatDate(request.endDate)}
                          </p>
                          <p className="text-xs text-current opacity-75">
                            {getDaysBetween(request.startDate, request.endDate)} jour(s)
                          </p>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-current/20">
                          {getStatusLabel(request.status)}
                        </span>
                      </div>

                      {/* Reason */}
                      {request.reason && (
                        <p className="text-sm mb-2 opacity-75">{request.reason}</p>
                      )}

                      {/* Rejection Reason */}
                      {request.status === 'REJECTED' && request.rejectionReason && (
                        <div className="mt-2 p-2 rounded bg-current/10 text-xs">
                          <p className="font-medium mb-1">Motif du rejet:</p>
                          <p>{request.rejectionReason}</p>
                        </div>
                      )}

                      {/* Approval Date */}
                      {request.status === 'APPROVED' && request.approvedAt && (
                        <p className="text-xs opacity-75 mt-2">
                          Approuvé le {formatDate(request.approvedAt)}
                        </p>
                      )}

                      {/* Actions */}
                      {request.status === 'PENDING' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            className="flex-1 px-3 py-1 text-xs rounded-lg bg-current/20 hover:bg-current/30 transition font-medium"
                          >
                            Détails
                          </button>
                          <button
                            className="flex-1 px-3 py-1 text-xs rounded-lg bg-[var(--pp-neg)]/20 text-[var(--pp-neg)] hover:bg-[var(--pp-neg)]/30 transition font-medium"
                          >
                            Annuler
                          </button>
                        </div>
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
