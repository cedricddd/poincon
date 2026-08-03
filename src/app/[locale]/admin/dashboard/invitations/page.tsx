'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { showToast } from '@/hooks/useToast'

const BCP47: Record<string, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-DE' }

interface Invitation {
  id: string
  email: string
  name: string | null
  role: string
  token: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
}

function getStatus(inv: Invitation): 'used' | 'expired' | 'pending' {
  if (inv.usedAt) return 'used'
  if (new Date(inv.expiresAt) < new Date()) return 'expired'
  return 'pending'
}

const STATUS_CONFIG = {
  used: { labelKey: 'statusUsed', cls: 'bg-green-100 text-green-700' },
  expired: { labelKey: 'statusExpired', cls: 'bg-gray-100 text-gray-500' },
  pending: { labelKey: 'statusPending', cls: 'bg-yellow-100 text-yellow-700' },
}

const ROLE_KEYS: Record<string, string> = {
  EMPLOYEE: 'roleEmployee',
  MANAGER: 'roleManager',
  ADMIN: 'roleAdmin',
}

export default function InvitationsPage() {
  const t = useTranslations('invitations')
  const tc = useTranslations('common')
  const locale = useLocale()
  const bcp = BCP47[locale] ?? 'fr-BE'
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    const res = await fetch('/api/admin/invitations')
    if (res.ok) setInvitations(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchInvitations() }, [fetchInvitations])

  const cancel = async (id: string) => {
    if (!confirm(t('confirmCancel'))) return
    setActing(id)
    const res = await fetch(`/api/admin/invitations?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast(t('toastCancelled'), 'success')
      setInvitations(prev => prev.filter(i => i.id !== id))
    } else {
      showToast(t('toastError'), 'error')
    }
    setActing(null)
  }

  const remove = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return
    setActing(id)
    const res = await fetch(`/api/admin/invitations?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast(t('toastDeleted'), 'success')
      setInvitations(prev => prev.filter(i => i.id !== id))
    } else {
      showToast(t('toastError'), 'error')
    }
    setActing(null)
  }

  const resend = async (id: string) => {
    setActing(id)
    const res = await fetch(`/api/admin/invitations?id=${id}`, { method: 'PATCH' })
    if (res.ok) {
      showToast(t('toastResent'), 'success')
      fetchInvitations()
    } else {
      const data = await res.json()
      showToast(data.error ?? t('toastError'), 'error')
    }
    setActing(null)
  }

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/set-password?token=${token}`
    navigator.clipboard.writeText(url)
    showToast(t('toastCopied'), 'success')
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(bcp, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) return <div className="p-8 text-center text-[var(--pp-muted)]">{t('loading')}</div>

  return (
    <div className="p-6 md:p-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
          <p className="text-sm text-[var(--pp-muted)] mt-1">
            {t('subtitle', { pending: invitations.filter(i => getStatus(i) === 'pending').length, total: invitations.length })}
          </p>
        </div>
        <Link
          href="/admin/dashboard/users/invite"
          className="px-4 py-2 bg-[var(--pp-info)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          {t('invite')}
        </Link>
      </div>

      {invitations.length === 0 ? (
        <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl p-8 text-center text-[var(--pp-muted)] text-sm">
          {t('empty')}
        </div>
      ) : (
        <div className="bg-[var(--pp-bg2)] border border-[var(--pp-line)] rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[var(--pp-line)] bg-[var(--pp-bg)] text-xs font-medium text-[var(--pp-muted)] uppercase tracking-wide">
            <span>{t('recipient')}</span>
            <span>{t('role')}</span>
            <span>{t('status')}</span>
            <span>{t('expiration')}</span>
            <span>{t('actions')}</span>
          </div>
          <div className="divide-y divide-[var(--pp-line)]">
            {invitations.map(inv => {
              const status = getStatus(inv)
              const { labelKey, cls } = STATUS_CONFIG[status]
              const isActing = acting === inv.id
              return (
                <div key={inv.id} className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center gap-2 md:gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--pp-ink)] truncate">{inv.email}</p>
                    {inv.name && <p className="text-xs text-[var(--pp-muted)]">{inv.name}</p>}
                  </div>
                  <span className="text-xs text-[var(--pp-muted)] shrink-0">{ROLE_KEYS[inv.role] ? tc(ROLE_KEYS[inv.role]) : inv.role}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cls}`}>{t(labelKey)}</span>
                  <span className="text-xs text-[var(--pp-muted)] shrink-0 whitespace-nowrap">
                    {status === 'used'
                      ? t('usedOn', { date: fmtDate(inv.usedAt!) })
                      : t('expiresOn', { date: fmtDate(inv.expiresAt) })}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    {status !== 'used' && (
                      <>
                        <button
                          onClick={() => copyLink(inv.token)}
                          title={t('titleCopy')}
                          className="px-3 py-1.5 text-xs bg-[var(--pp-bg)] border border-[var(--pp-line)] text-[var(--pp-muted)] rounded-lg hover:text-[var(--pp-ink)] transition-colors"
                        >
                          {t('copyLink')}
                        </button>
                        <button
                          onClick={() => resend(inv.id)}
                          disabled={isActing}
                          title={t('titleResend')}
                          className="px-3 py-1.5 text-xs bg-[var(--pp-info)]/10 text-[var(--pp-info)] rounded-lg hover:bg-[var(--pp-info)]/20 disabled:opacity-50 transition-colors"
                        >
                          {t('resend')}
                        </button>
                        <button
                          onClick={() => cancel(inv.id)}
                          disabled={isActing}
                          title={t('titleCancel')}
                          className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          {t('cancel')}
                        </button>
                      </>
                    )}
                    {status === 'used' && (
                      <button
                        onClick={() => remove(inv.id)}
                        disabled={isActing}
                        title={t('titleDelete')}
                        className="px-3 py-1.5 text-xs bg-[var(--pp-bg)] border border-[var(--pp-line)] text-[var(--pp-muted)] rounded-lg hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors"
                      >
                        {t('delete')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
