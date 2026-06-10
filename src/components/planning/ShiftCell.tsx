'use client'

interface Shift {
  id: string
  userId: string
  date: string
  startTime: string
  endTime: string
  note?: string | null
  isTemplate?: boolean
}

interface ShiftCellProps {
  shift?: Shift
  leaveType?: string
  rttHours?: number
  onClick: () => void
}

const LEAVE_CONFIG: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  ANNUAL: {
    bg: 'bg-[var(--pp-pos)]/10 border border-[var(--pp-pos)]/25',
    text: 'text-[var(--pp-pos)]',
    label: 'Congé annuel',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
        <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
      </svg>
    ),
  },
  SICK: {
    bg: 'bg-orange-500/10 border border-orange-500/25',
    text: 'text-orange-600 dark:text-orange-400',
    label: 'Congé maladie',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/>
      </svg>
    ),
  },
  MATERNITY: {
    bg: 'bg-pink-500/10 border border-pink-500/25',
    text: 'text-pink-600 dark:text-pink-400',
    label: 'Congé maternité',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
}

export function ShiftCell({ shift, leaveType, rttHours, onClick }: ShiftCellProps) {
  if (leaveType) {
    const cfg = LEAVE_CONFIG[leaveType]
    if (cfg) {
      return (
        <div className={`h-full min-h-[56px] rounded-md ${cfg.bg} flex flex-col items-center justify-center cursor-not-allowed select-none gap-0.5`}>
          <span className={cfg.text}>{cfg.icon}</span>
          <span className={`text-[10px] font-medium leading-tight ${cfg.text}`}>{cfg.label}</span>
        </div>
      )
    }
    return (
      <div className="h-full min-h-[56px] rounded-md bg-[var(--pp-line)]/40 flex items-center justify-center cursor-not-allowed select-none">
        <span className="text-sm text-[var(--pp-muted)]" title="Congé approuvé">🚫</span>
      </div>
    )
  }

  if (!shift && rttHours) {
    return (
      <button
        onClick={onClick}
        title={`Récupération ${rttHours}h approuvée — cliquer pour planifier un shift`}
        className="h-full min-h-[56px] w-full rounded-md bg-amber-500/10 border border-dashed border-amber-400/50 hover:bg-amber-500/20 transition-all text-left px-2 py-1.5"
      >
        <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 leading-tight">
          ↩ {rttHours}h
        </div>
        <div className="text-[10px] text-amber-400 mt-0.5 leading-tight">Récupération</div>
      </button>
    )
  }

  if (!shift) {
    return (
      <button
        onClick={onClick}
        className="h-full min-h-[56px] w-full rounded-md border border-dashed border-[var(--pp-line)] hover:border-[var(--pp-info)] hover:bg-[var(--pp-info)]/5 transition-all group flex items-center justify-center"
      >
        <span className="text-xl text-[var(--pp-line)] group-hover:text-[var(--pp-info)] transition-colors leading-none">+</span>
      </button>
    )
  }

  if (shift.isTemplate) {
    return (
      <button
        onClick={onClick}
        title="Shift basé sur l'horaire assigné — cliquer pour confirmer"
        className="h-full min-h-[56px] w-full rounded-md bg-violet-500/10 border border-dashed border-violet-400/50 hover:bg-violet-500/20 transition-all text-left px-2 py-1.5"
      >
        <div className="text-xs font-semibold text-violet-600 dark:text-violet-400 leading-tight">
          {shift.startTime}–{shift.endTime}
        </div>
        {rttHours ? (
          <div className="text-[9px] text-amber-500 mt-0.5 leading-tight">↩ {rttHours}h récup.</div>
        ) : (
          <div className="text-[10px] text-violet-400 mt-0.5 leading-tight">Horaire</div>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="h-full min-h-[56px] w-full rounded-md bg-[var(--pp-info)]/12 border border-[var(--pp-info)]/30 hover:bg-[var(--pp-info)]/20 transition-all text-left px-2 py-1.5 group"
    >
      <div className="text-xs font-semibold text-[var(--pp-info)] leading-tight">
        {shift.startTime}–{shift.endTime}
      </div>
      {rttHours ? (
        <div className="text-[9px] text-amber-500 mt-0.5 leading-tight">↩ {rttHours}h récup.</div>
      ) : shift.note ? (
        <div className="text-[10px] text-[var(--pp-muted)] mt-0.5 truncate leading-tight">{shift.note}</div>
      ) : null}
    </button>
  )
}
