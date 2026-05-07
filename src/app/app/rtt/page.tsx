'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

interface RTTRequest {
  id: string
  date: string
  hoursToRecover: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt?: string
  rejectionReason?: string
}

export default function RTTPage() {
  const [requests, setRequests] = useState<RTTRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState('')

  const [formData, setFormData] = useState({
    date: '',
    hoursToRecover: '',
    reason: '',
  })

  // Load requests on mount
  useEffect(() => {
    loadRequests()
  }, [])

  // Hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/rtt')
      if (res.ok) {
        const data = await res.json()
        setRequests(data)
      }
    } catch (error) {
      console.error('Failed to load requests:', error)
      setNotification('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.hoursToRecover) {
      setNotification('Veuillez remplir les champs obligatoires')
      return
    }

    const hours = parseFloat(formData.hoursToRecover)
    if (hours <= 0 || hours > 8) {
      setNotification('Les heures doivent être entre 0.5 et 8')
      return
    }

    const selectedDate = new Date(formData.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      setNotification('La date doit être dans le futur')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/rtt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          hoursToRecover: hours,
          reason: formData.reason,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to create request')
      }

      setNotification('Demande RTT créée ✓')
      setFormData({ date: '', hoursToRecover: '', reason: '' })
      await loadRequests()
    } catch (error) {
      console.error('Error:', error)
      setNotification('Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
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

  const totalApprovedHours = requests
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => sum + r.hoursToRecover, 0)

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-20">
      {/* Header */}
      <header className="sticky top-0 border-b border-[var(--pp-line)] bg-[var(--pp-bg)]/95 backdrop-blur py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--pp-ink)]">Demandes RTT</h1>
            <p className="text-sm text-[var(--pp-muted)] mt-1">
              Récupération Temps Travail - Partir plus tôt avec vos heures sup
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--pp-muted)]">Heures RTT approuvées</p>
            <p className="text-2xl font-bold text-[var(--pp-pos)]">{totalApprovedHours.toFixed(1)}h</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        {/* Notification */}
        {notification && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)] text-[var(--pp-pos)] text-center font-medium animate-in fade-in">
            {notification}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">
                Nouvelle Demande RTT
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Date de RTT
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                    required
                  />
                </div>

                {/* Hours */}
                <div>
                  <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Heures à récupérer *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="8"
                      value={formData.hoursToRecover}
                      onChange={e => setFormData({ ...formData, hoursToRecover: e.target.value })}
                      placeholder="Ex: 2 (pour partir 2h plus tôt)"
                      className="flex-1 px-4 py-2 border border-[var(--pp-line)] rounded-lg bg-[var(--pp-bg)] text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
                      required
                    />
                    <span className="text-sm font-medium text-[var(--pp-muted)]">h</span>
                  </div>
                  <p className="text-xs text-[var(--pp-muted)] mt-1">Minimum 0.5h, maximum 8h</p>
                </div>

                {/* Preview */}
                {formData.hoursToRecover && formData.date && (
                  <div className="p-3 rounded-lg bg-[var(--pp-info)]/10 border border-[var(--pp-info)]/20">
                    <p className="text-sm text-[var(--pp-muted)] mb-1">RTT Prévu</p>
                    <p className="text-lg font-bold text-[var(--pp-info)]">
                      {formatDate(formData.date)} - {parseFloat(formData.hoursToRecover).toFixed(1)}h
                    </p>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-[var(--pp-ink)] mb-2">
                    Raison (optionnel)
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Ex: Rendez-vous médical, course importante, etc."
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
                  {submitting ? 'Création...' : 'Demander RTT'}
                </Button>
              </form>

              {/* Info Box */}
              <div className="mt-6 p-3 rounded-lg bg-[var(--pp-muted)]/10 text-xs text-[var(--pp-muted)]">
                <p className="font-medium mb-2">💡 RTT - Comment ça marche?</p>
                <p>Utilisez vos heures supplémentaires approuvées pour partir plus tôt.</p>
                <p className="mt-1">Exemple: 10 heures sup approuvées = vous pouvez partir 10h plus tôt</p>
                <p className="mt-1">Admin doit approuver votre demande RTT avant qu'elle soit valide.</p>
              </div>
            </Card>
          </div>

          {/* Requests List Column */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">
                Mes Demandes RTT
              </h2>

              {loading ? (
                <div className="text-sm text-[var(--pp-muted)]">Chargement...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[var(--pp-muted)] mb-2">Aucune demande RTT</p>
                  <p className="text-xs text-[var(--pp-muted)]">
                    Créez votre première demande RTT avec le formulaire
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
                            {formatDate(request.date)}
                          </p>
                          <p className="text-lg font-bold">
                            -{request.hoursToRecover.toFixed(1)}h
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
