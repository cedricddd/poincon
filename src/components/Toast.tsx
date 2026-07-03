'use client'

import { useToast, dismissToast, type ToastType } from '@/hooks/useToast'

const styles: Record<ToastType, string> = {
  success: 'bg-[var(--pp-pos-btn)]/10 border-[var(--pp-pos)] text-[var(--pp-pos)]',
  error: 'bg-[var(--pp-neg)]/10 border-[var(--pp-neg)] text-[var(--pp-neg)]',
  warning: 'bg-orange-500/10 border-orange-500 text-orange-500',
  info: 'bg-blue-500/10 border-blue-500 text-blue-500',
}

export function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg border font-medium animate-in fade-in slide-in-from-bottom-2
                      flex items-center gap-3 min-w-[260px] pointer-events-auto
                      ${styles[toast.type]}`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
