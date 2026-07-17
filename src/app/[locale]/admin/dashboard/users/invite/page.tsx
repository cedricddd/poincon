'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

interface SeatUsage {
  activeMembers: number
  includedSeats: number
  pricePerSeatCents: number
  cycle: string
}

export default function InviteUserPage() {
  const t = useTranslations('usersForm')
  const tc = useTranslations('common')
  const tSettings = useTranslations('settings')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const router = useRouter()
  const [form, setForm] = useState({ email: '', name: '', role: 'EMPLOYEE' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [seatUsage, setSeatUsage] = useState<SeatUsage | null>(null)

  useEffect(() => {
    fetch('/api/admin/company/settings')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data?.seatUsage) setSeatUsage(data.seatUsage) })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? t('inviteError')); return }
      setSuccess(true)
      setTimeout(() => router.push('/admin/dashboard/users'), 2500)
    } catch {
      setError(t('inviteErrorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('inviteTitle')}</h1>
        <p className="text-[var(--pp-muted)] text-sm mt-1">
          {t('inviteSubtitle')}
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {t('inviteSuccess')}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
              {t('emailLabel')} <span className="text-[var(--pp-neg)]">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder={t('placeholderEmail')}
              required
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">
              {t('nameOptional')}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={t('placeholderName')}
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)]"
            />
            <p className="text-xs text-[var(--pp-muted)] mt-1">{t('nameHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1">{t('role')}</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-4 py-2 border border-[var(--pp-line)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pp-info)] bg-[var(--pp-bg)]"
            >
              <option value="EMPLOYEE">{tc('roleEmployee')}</option>
              <option value="MANAGER">{tc('roleManager')}</option>
              <option value="ADMIN">{tc('roleAdmin')}</option>
            </select>
          </div>

          {seatUsage && (() => {
            const projectedMembers = seatUsage.activeMembers + 1
            const projectedExtra = Math.max(0, projectedMembers - seatUsage.includedSeats)
            const willCost = projectedExtra > 0
            const euros = (cents: number) => (cents / 100).toLocaleString(bcp, { minimumFractionDigits: 2 })
            const per = seatUsage.cycle === 'yearly' ? tSettings('perYear') : tSettings('perMonth')
            return (
              <div className={`p-3 rounded-lg border text-sm ${
                willCost
                  ? 'bg-[#7c3aed]/5 border-[#7c3aed]/20 text-[#7c3aed]'
                  : 'bg-[var(--pp-bg)] border-[var(--pp-line)] text-[var(--pp-muted)]'
              }`}>
                {willCost
                  ? t('seatEstimateExtraCost', {
                      count: projectedMembers,
                      max: seatUsage.includedSeats,
                      price: euros(seatUsage.pricePerSeatCents),
                      period: per,
                    })
                  : t('seatEstimateWithinPlan', { count: projectedMembers, max: seatUsage.includedSeats })}
              </div>
            )
          })()}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading || success} size="md">
              {loading ? t('sending') : t('sendInvite')}
            </Button>
            <Button type="button" variant="outline" size="md" onClick={() => router.push('/admin/dashboard/users')}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
