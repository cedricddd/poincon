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
  isTimeOff?: boolean
  onClick: () => void
}

export function ShiftCell({ shift, isTimeOff, onClick }: ShiftCellProps) {
  if (isTimeOff && !shift) {
    return (
      <div className="h-full min-h-[56px] rounded-md bg-[var(--pp-line)]/40 flex items-center justify-center cursor-not-allowed select-none">
        <span className="text-sm text-[var(--pp-muted)]" title="Congé approuvé">🚫</span>
      </div>
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
        <div className="text-[10px] text-violet-400 mt-0.5 leading-tight">Horaire</div>
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
      {shift.note && (
        <div className="text-[10px] text-[var(--pp-muted)] mt-0.5 truncate leading-tight">{shift.note}</div>
      )}
    </button>
  )
}
