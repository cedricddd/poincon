'use client'

import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useEffect, useState } from 'react'

export function OfflineIndicator() {
  const { pendingCount, isSyncing } = useOfflineSync()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || pendingCount === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 px-4 py-2.5 rounded-lg text-sm font-medium transition-all z-50 bg-amber-50 text-amber-900 border border-amber-200 shadow-lg">
      <div className="flex items-center gap-2.5">
        <div
          className={`w-2 h-2 rounded-full ${
            isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-amber-600'
          }`}
        />
        <span>
          {isSyncing ? (
            <>Synchronisation en cours... {pendingCount} action</>
          ) : (
            <>{pendingCount} pointage{pendingCount > 1 ? 's' : ''} en attente de synchronisation</>
          )}
        </span>
      </div>
    </div>
  )
}
