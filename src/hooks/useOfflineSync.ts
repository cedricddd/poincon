import { useEffect, useState, useCallback } from 'react'

interface PendingAction {
  id: string
  type: 'punch_in' | 'punch_out' | 'rtt' | 'time_off'
  data: Record<string, unknown>
  timestamp: number
  synced: boolean
}

const DB_NAME = 'PoinconDB'
const STORE_NAME = 'pendingActions'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    window.addEventListener('online', () => setIsOnline(true))
    window.addEventListener('offline', () => setIsOnline(false))

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        countPendingActions()
      })
    }

    return () => {
      window.removeEventListener('online', () => setIsOnline(true))
      window.removeEventListener('offline', () => setIsOnline(false))
    }
  }, [])

  const openDB = useCallback(async (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }, [])

  const savePendingAction = useCallback(
    async (type: PendingAction['type'], data: Record<string, unknown>) => {
      try {
        const db = await openDB()
        const action: PendingAction = {
          id: `${type}-${Date.now()}`,
          type,
          data,
          timestamp: Date.now(),
          synced: false,
        }

        await new Promise((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readwrite')
          const store = transaction.objectStore(STORE_NAME)
          const request = store.add(action)
          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve(request.result)
        })

        countPendingActions()

        if (isOnline && 'serviceWorker' in navigator) {
          navigator.serviceWorker.controller?.postMessage({
            type: 'SYNC_PENDING',
          })
        }

        return action
      } catch (error) {
        console.error('Failed to save pending action:', error)
        throw error
      }
    },
    [openDB, isOnline]
  )

  const countPendingActions = useCallback(async () => {
    try {
      const db = await openDB()
      const count = await new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.count()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      })
      setPendingCount(count as number)
    } catch (error) {
      console.error('Failed to count pending actions:', error)
    }
  }, [openDB])

  const getPendingActions = useCallback(async (): Promise<PendingAction[]> => {
    try {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAll()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result as PendingAction[])
      })
    } catch (error) {
      console.error('Failed to get pending actions:', error)
      return []
    }
  }, [openDB])

  const removePendingAction = useCallback(async (id: string) => {
    try {
      const db = await openDB()
      await new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(id)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      })
      countPendingActions()
    } catch (error) {
      console.error('Failed to remove pending action:', error)
      throw error
    }
  }, [openDB, countPendingActions])

  const syncPendingActions = useCallback(async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    try {
      const actions = await getPendingActions()
      let synced = 0

      for (const action of actions) {
        try {
          const endpoint = `/api/${
            action.type === 'punch_in' || action.type === 'punch_out'
              ? 'clock/punch'
              : action.type === 'rtt'
              ? 'rtt'
              : 'time-off'
          }`

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.data),
          })

          if (response.ok) {
            await removePendingAction(action.id)
            synced++
          }
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error)
        }
      }

      if (synced > 0) {
        console.log(`Synced ${synced} pending actions`)
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, isSyncing, getPendingActions, removePendingAction])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      const timeout = setTimeout(syncPendingActions, 1000)
      return () => clearTimeout(timeout)
    }
  }, [isOnline, pendingCount, syncPendingActions])

  return {
    isOnline,
    pendingCount,
    isSyncing,
    savePendingAction,
    getPendingActions,
    removePendingAction,
    syncPendingActions,
  }
}
