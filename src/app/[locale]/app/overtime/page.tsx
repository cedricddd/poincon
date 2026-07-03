'use client'

export const dynamic = 'force-dynamic'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Card } from '@/components/Card'

export default function OvertimePage() {
  const t = useTranslations('overtimeInfo')
  const scenario = t.raw('scenario') as string[]

  return (
    <div className="min-h-screen bg-[var(--pp-bg)] pb-20">
      {/* Header */}
      <header className="sticky top-0 border-b border-[var(--pp-line)] bg-[var(--pp-bg)]/95 backdrop-blur py-4">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-[var(--pp-ink)]">{t('title')}</h1>
          <p className="text-sm text-[var(--pp-muted)] mt-1">{t('subtitle')}</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* How it works */}
          <Card>
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">{t('howTitle')}</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-[var(--pp-ink)] mb-1">{t('step1Title')}</p>
                <p className="text-[var(--pp-muted)]">{t('step1Body')}</p>
              </div>
              <div>
                <p className="font-medium text-[var(--pp-ink)] mb-1">{t('step2Title')}</p>
                <p className="text-[var(--pp-muted)]">{t('step2Body')}</p>
              </div>
              <div>
                <p className="font-medium text-[var(--pp-ink)] mb-1">{t('step3Title')}</p>
                <p className="text-[var(--pp-muted)]">{t('step3Body')}</p>
              </div>
            </div>
          </Card>

          {/* Two ways to use */}
          <Card>
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">{t('waysTitle')}</h2>
            <div className="space-y-4 text-sm">
              <div className="p-3 rounded-lg bg-[var(--pp-info)]/10 border border-[var(--pp-info)]/20">
                <p className="font-medium text-[var(--pp-info)] mb-1">{t('way1Title')}</p>
                <p className="text-[var(--pp-muted)]">{t('way1Body')}</p>
                <p className="text-xs text-[var(--pp-muted)] mt-1">
                  {t('linkGoTo')}<Link href="/app/time-off" className="underline font-medium">{t('navTimeoff')}</Link>{t('way1LinkPost')}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--pp-pos-btn)]/10 border border-[var(--pp-pos)]/20">
                <p className="font-medium text-[var(--pp-pos)] mb-1">{t('way2Title')}</p>
                <p className="text-[var(--pp-muted)]">{t('way2Body')}</p>
                <p className="text-xs text-[var(--pp-muted)] mt-1">
                  {t('linkGoTo')}<Link href="/app/rtt" className="underline font-medium">{t('navRtt')}</Link>{t('way2LinkPost')}
                </p>
              </div>
            </div>
          </Card>

          {/* Example */}
          <Card className="md:col-span-2">
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">{t('exampleTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-[var(--pp-ink)] mb-2">{t('scenarioTitle')}</p>
                <ul className="space-y-1 text-[var(--pp-muted)]">
                  {scenario.map((line, i) => <li key={i}>• {line}</li>)}
                </ul>
              </div>

              <div>
                <p className="font-medium text-[var(--pp-ink)] mb-2">{t('ifApprovedTitle')}</p>
                <div className="space-y-2">
                  <div className="p-2 rounded bg-[var(--pp-info)]/10">
                    <p className="text-xs font-medium text-[var(--pp-info)]">{t('option1Label')}</p>
                    <p className="text-xs text-[var(--pp-muted)]">{t('option1Body')}</p>
                  </div>
                  <div className="p-2 rounded bg-[var(--pp-pos-btn)]/10">
                    <p className="text-xs font-medium text-[var(--pp-pos)]">{t('option2Label')}</p>
                    <p className="text-xs text-[var(--pp-muted)]">{t('option2Body')}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* FAQ */}
          <Card className="md:col-span-2">
            <h2 className="text-lg font-bold text-[var(--pp-ink)] mb-4">{t('faqTitle')}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-[var(--pp-ink)]">{t('q1')}</p>
                <p className="text-[var(--pp-muted)]">{t('a1')}</p>
              </div>
              <div>
                <p className="font-medium text-[var(--pp-ink)]">{t('q2')}</p>
                <p className="text-[var(--pp-muted)]">{t('a2')}</p>
              </div>
              <div>
                <p className="font-medium text-[var(--pp-ink)]">{t('q3')}</p>
                <p className="text-[var(--pp-muted)]">{t('a3')}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
