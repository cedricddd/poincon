'use client'

import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useEffect, useState } from 'react'

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing } = useOfflineSync()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Don't show anything if online and no pending actions
  if (isOnline && pendingCount === 0) {
    return null
  }

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-medium transition-all z-50 ${
        isOnline
          ? 'bg-amber-100 text-amber-900 border border-amber-300'
          : 'bg-red-100 text-red-900 border border-red-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-amber-600' : 'bg-red-600'
          } ${isSyncing ? 'animate-pulse' : ''}`}
        />
        <span>
          {isOnline ? (
            pendingCount > 0 ? (
              isSyncing ? (
                <>Synchronisation {pendingCount} action(s)...</>
              ) : (
                <>{pendingCount} action(s) en attente</>
              )
            ) : (
              'Reconnecté'
            )
          ) : (
            'Vous êtes hors ligne'
          )}
        </span>
      </div>
    </div>
  )
}
