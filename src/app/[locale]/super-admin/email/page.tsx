'use client'

export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

export default function SuperAdminEmail() {
  const [recipientType, setRecipientType] = useState('all')
  const [recipients, setRecipients] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('CUSTOM')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSend = async () => {
    if (!subject || !body) {
      alert('Remplissez le sujet et le corps')
      return
    }

    let recipientList: string[] = []

    if (recipientType === 'custom') {
      recipientList = recipients
        .split('\n')
        .map((e) => e.trim())
        .filter((e) => e.length > 0)
    }

    if (recipientList.length === 0 && recipientType === 'custom') {
      alert('Ajoutez des emails')
      return
    }

    setLoading(true)
    const res = await fetch('/api/super-admin/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipients: recipientList,
        subject,
        body,
        type,
      }),
    })

    const data = await res.json()
    setLoading(false)
    setResult(data)

    if (res.ok) {
      setRecipients('')
      setSubject('')
      setBody('')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--pp-ink)]">Emails en masse</h1>
        <p className="text-[var(--pp-muted)] mt-1">Envoyer des emails aux clients</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--pp-muted)] block mb-2">
                Type d&apos;email
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg"
              >
                <option value="CUSTOM">Custom</option>
                <option value="PAYMENT_REMINDER">Rappel paiement</option>
                <option value="FEATURE_ANNOUNCEMENT">Annonce fonctionnalité</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--pp-muted)] block mb-2">
                Destinataires
              </label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg"
              >
                <option value="custom">Custom (liste d&apos;emails)</option>
                <option value="all">Tous (nécessite consentement marketing)</option>
                <option value="payment_needed">Sans plan payant</option>
              </select>
            </div>

            {recipientType === 'custom' && (
              <div>
                <label className="text-xs font-semibold text-[var(--pp-muted)] block mb-2">
                  Emails (un par ligne)
                </label>
                <textarea
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="contact1@example.com&#10;contact2@example.com"
                  className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg font-mono text-sm h-24"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-[var(--pp-muted)] block mb-2">
                Sujet
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg"
                placeholder="Titre de l'email"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Aperçu & Actions</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--pp-muted)] block mb-2">
                Contenu (HTML)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--pp-line)] rounded-lg font-mono text-sm h-40"
                placeholder="<p>Contenu HTML du message...</p>"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={loading}
              className={`w-full px-4 py-2 rounded-lg font-medium text-white ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#10b981] hover:opacity-90'
              }`}
            >
              {loading ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </Card>
      </div>

      {result && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--pp-ink)] mb-4">Résultat</h2>
          <div className={`p-4 rounded-lg ${result.success ? 'bg-[#10b981]/10' : 'bg-[#ef4444]/10'}`}>
            {result.success ? (
              <>
                <p className="text-[#10b981] font-semibold">
                  ✓ {result.sentCount} email(s) envoyé(s) sur {result.totalRequested}
                </p>
              </>
            ) : (
              <p className="text-[#ef4444]">✗ Erreur: {result.error}</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
