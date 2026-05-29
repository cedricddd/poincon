import Link from 'next/link'

interface Props {
  currentPlan: string
  upgradeTo: string
  feature: string
  description?: string
}

export function UpgradeBanner({ currentPlan, upgradeTo, feature, description }: Props) {
  return (
    <div className="rounded-xl border border-[var(--pp-info)]/30 bg-gradient-to-r from-[var(--pp-info)]/5 to-[var(--pp-info)]/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🔒</span>
          <span className="font-semibold text-[var(--pp-ink)]">{feature}</span>
          <span className="text-xs px-2 py-0.5 bg-[var(--pp-info)]/15 text-[var(--pp-info)] rounded-full font-medium">
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
          href={`/pricing`}
          className="shrink-0 px-4 py-2 bg-[var(--pp-info)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          Upgrader vers {upgradeTo}
        </Link>
      )}
    </div>
  )
}
