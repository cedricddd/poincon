'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

/* ── Step indicator ──────────────────────────────────────────────────────── */

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const t = useTranslations('onboarding')
  const labels = [t('stepCompany'), t('stepTeam'), t('stepGo')]
  return (
    <div className="flex items-center gap-2 mb-8">
      {labels.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3
        const done = current > step
        const active = current === step
        return (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-[var(--pp-line)]" />}
            <div className="flex items-center gap-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                style={{
                  background: done ? 'var(--pp-pos)' : active ? 'var(--pp-pos)' : 'var(--pp-line)',
                  color: done || active ? '#fff' : 'var(--pp-muted)',
                }}
              >
                {done ? '✓' : step}
              </div>
              <span
                className="text-xs font-medium hidden sm:block"
                style={{ color: active ? 'var(--pp-ink)' : 'var(--pp-muted)' }}
              >
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Step 1 — Company info + logo ────────────────────────────────────────── */

function Step1({
  onNext,
}: {
  onNext: () => void
}) {
  const t = useTranslations('onboarding')
  const [name, setName] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError(t('logoTooLarge')); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setError('')
  }, [t])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (name.trim()) {
        const res = await fetch('/api/admin/company/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() }),
        })
        if (!res.ok) throw new Error(t('nameUpdateError'))
      }
      if (logoFile) {
        const formData = new FormData()
        formData.append('logo', logoFile)
        const res = await fetch('/api/admin/company/logo', { method: 'POST', body: formData })
        if (!res.ok) throw new Error(t('logoUploadError'))
      }
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unexpectedError'))
    } finally {
      setSaving(false)
    }
  }, [name, logoFile, onNext, t])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--pp-ink)] mb-1">{t('step1Title')}</h2>
        <p className="text-sm text-[var(--pp-muted)]">
          {t('step1Subtitle')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1.5">
          {t('companyName')}
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('companyNamePlaceholder')}
          className="w-full rounded-lg border border-[var(--pp-line)] bg-[var(--pp-bg)] px-3 py-2 text-sm text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
        />
        <p className="text-xs text-[var(--pp-muted)] mt-1">{t('companyNameHint')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1.5">
          {t('logo')} <span className="text-[var(--pp-muted)] font-normal">{t('optional')}</span>
        </label>
        <div
          className="flex items-center gap-4 p-4 rounded-lg border-2 border-dashed border-[var(--pp-line)] cursor-pointer hover:border-[var(--pp-pos)] transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {logoPreview ? (
            <Image src={logoPreview} alt="Logo preview" width={48} height={48} className="w-12 h-12 object-contain rounded" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[var(--pp-pos-btn)]/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--pp-pos)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-[var(--pp-ink)]">
              {logoPreview ? t('changeLogo') : t('chooseLogo')}
            </p>
            <p className="text-xs text-[var(--pp-muted)]">{t('logoHint')}</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoChange}
        />
      </div>

      {error && (
        <p className="text-sm text-[var(--pp-neg)] bg-[var(--pp-neg)]/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: 'var(--pp-pos)' }}
        >
          {saving ? t('saving') : t('next')}
        </button>
      </div>
    </form>
  )
}

/* ── Step 2 — Invite first employee ─────────────────────────────────────── */

function Step2({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const t = useTranslations('onboarding')
  const [email, setEmail] = useState('')
  const [empName, setEmpName] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [, setSkipped] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError(t('emailRequired')); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: empName.trim() || null, role: 'EMPLOYEE' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('inviteError'))
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unexpectedError'))
    } finally {
      setSending(false)
    }
  }, [email, empName, onNext, t])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--pp-ink)] mb-1">{t('step2Title')}</h2>
        <p className="text-sm text-[var(--pp-muted)]">
          {t('step2Subtitle')}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1.5">
            {t('fullName')} <span className="text-[var(--pp-muted)] font-normal">{t('optional')}</span>
          </label>
          <input
            type="text"
            value={empName}
            onChange={e => setEmpName(e.target.value)}
            placeholder={t('fullNamePlaceholder')}
            className="w-full rounded-lg border border-[var(--pp-line)] bg-[var(--pp-bg)] px-3 py-2 text-sm text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--pp-ink)] mb-1.5">
            {t('emailLabel')}
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            required
            className="w-full rounded-lg border border-[var(--pp-line)] bg-[var(--pp-bg)] px-3 py-2 text-sm text-[var(--pp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--pp-pos)]"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--pp-neg)] bg-[var(--pp-neg)]/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm text-[var(--pp-muted)] hover:text-[var(--pp-ink)] transition-colors"
        >
          {t('back')}
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setSkipped(true); onNext() }}
            className="px-4 py-2 text-sm text-[var(--pp-muted)] hover:text-[var(--pp-ink)] transition-colors"
          >
            {t('skipStep')}
          </button>
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: 'var(--pp-pos)' }}
          >
            {sending ? t('sending') : t('sendInvite')}
          </button>
        </div>
      </div>
    </form>
  )
}

/* ── Step 3 — Success ────────────────────────────────────────────────────── */

function Step3({ onFinish, finishing }: { onFinish: () => void; finishing: boolean }) {
  const t = useTranslations('onboarding')
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl" style={{ background: 'var(--pp-pos)/10' }}>
        🎉
      </div>
      <div>
        <h2 className="text-2xl font-bold text-[var(--pp-ink)] mb-2">{t('step3Title')}</h2>
        <p className="text-sm text-[var(--pp-muted)] max-w-sm mx-auto">
          {t('step3Subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        {[
          { icon: '👥', title: t('card1Title'), desc: t('card1Desc') },
          { icon: '📍', title: t('card2Title'), desc: t('card2Desc') },
          { icon: '📊', title: t('card3Title'), desc: t('card3Desc') },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-4">
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-sm font-semibold text-[var(--pp-ink)] mb-0.5">{title}</p>
            <p className="text-xs text-[var(--pp-muted)]">{desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onFinish}
        disabled={finishing}
        className="px-8 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-opacity disabled:opacity-60"
        style={{ background: 'var(--pp-pos)' }}
      >
        {finishing ? t('loading') : t('goToDashboard')}
      </button>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [finishing, setFinishing] = useState(false)

  const handleFinish = useCallback(async () => {
    setFinishing(true)
    try {
      await fetch('/api/admin/onboarding/complete', { method: 'POST' })
    } finally {
      router.push('/admin/dashboard')
      router.refresh()
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--pp-pos-btn)]/10 text-[var(--pp-pos)]">
            {t('welcome')}
          </div>
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('setupTitle')}</h1>
        </div>

        <Steps current={step} />

        {/* Card */}
        <div className="rounded-2xl border border-[var(--pp-line)] bg-[var(--pp-bg)] p-6 shadow-sm">
          {step === 1 && (
            <Step1 onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <Step2 onNext={() => setStep(3)} onBack={() => setStep(1)} />
          )}
          {step === 3 && (
            <Step3 onFinish={handleFinish} finishing={finishing} />
          )}
        </div>

        <p className="text-center text-xs text-[var(--pp-muted)] mt-4">
          {t('editLater')}
        </p>
      </div>
    </div>
  )
}
