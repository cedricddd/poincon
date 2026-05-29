import Link from 'next/link'

type BannerVariant = 'indigo' | 'mauve'

interface Props {
  currentPlan: string
  upgradeTo: string
  feature: string
  description?: string
  variant?: BannerVariant
}

const styles: Record<BannerVariant, { wrapper: string; badge: string; btn: string }> = {
  indigo: {
    wrapper: 'border-[var(--pp-info)]/30 from-[var(--pp-info)]/5 to-[var(--pp-info)]/10',
    badge:   'bg-[var(--pp-info)]/15 text-[var(--pp-info)]',
    btn:     'bg-[var(--pp-info)]',
  },
  mauve: {
    wrapper: 'border-rose-300/40 from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20',
    badge:   'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
    btn:     'bg-gradient-to-r from-rose-500 to-pink-500',
  },
}

export function UpgradeBanner({ currentPlan, upgradeTo, feature, description, variant = 'indigo' }: Props) {
  const s = styles[variant]
  return (
    <div className={`rounded-xl border bg-gradient-to-r ${s.wrapper} p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🔒</span>
          <span className="font-semibold text-[var(--pp-ink)]">{feature}</span>
          <span className={`text-xs px-2 py-0.5 ${s.badge} rounded-full font-medium`}>
            Plan {upgradeTo}+
          </span>
        </div>
        <p className="text-sm text-[var(--pp-muted)]">
          {description ?? `Cette fonctionnalité n'est pas disponible avec le plan ${currentPlan}.`}
          {upgradeTo && ` Passez au plan ${upgradeTo} pour y accéder.`}
        </p>
      </div>
      {upgradeTo && (
        <Link
          href="/pricing"
          className={`shrink-0 px-4 py-2 ${s.btn} text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap`}
        >
          Upgrader vers {upgradeTo}
        </Link>
      )}
    </div>
  )
}
