'use client'

interface Shift {
  id: string
  userId: string
  date: string
  startTime: string
  endTime: string
  note?: string | null
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
