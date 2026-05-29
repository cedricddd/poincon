import { useEffect, useState, useCallback, useRef } from 'react'

interface PendingAction {
  id: string
  type: 'punch_in' | 'punch_out' | 'rtt' | 'time_off'
  data: Record<string, unknown>
  timestamp: number
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  retries: number
}

const DB_NAME = 'PointonDB'
const STORE_NAME = 'pendingActions'
const MAX_RETRIES = 5
const RETRY_DELAY = 2000 // 2 secondes

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    countPendingActions()

    // Sync au démarrage et tous les 3 secondes
    const syncInterval = setInterval(syncPendingActions, 3000)
    syncPendingActions() // sync immédiat

    return () => {
      clearInterval(syncInterval)
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
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
          id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type,
          data,
          timestamp: Date.now(),
          status: 'pending',
          retries: 0,
        }

        await new Promise((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readwrite')
          const store = transaction.objectStore(STORE_NAME)
          const request = store.add(action)
          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve(request.result)
        })

        countPendingActions()

        // Synchro immédiate après sauvegarde
        syncPendingActions()

        return action
      } catch (error) {
        console.error('Erreur sauvegarde pointage:', error)
        throw error
      }
    },
    [openDB]
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
      console.error('Erreur comptage:', error)
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
      console.error('Erreur récupération:', error)
      return []
    }
  }, [openDB])

  const updateActionStatus = useCallback(
    async (id: string, status: PendingAction['status'], retries?: number) => {
      try {
        const db = await openDB()
        const action = await new Promise<PendingAction>((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readonly')
          const store = transaction.objectStore(STORE_NAME)
          const request = store.get(id)
          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve(request.result)
        })

        if (action) {
          const updated = { ...action, status, ...(retries !== undefined && { retries }) }
          await new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.put(updated)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result)
          })
          countPendingActions()
        }
      } catch (error) {
        console.error('Erreur mise à jour:', error)
      }
    },
    [openDB, countPendingActions]
  )

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
      console.error('Erreur suppression:', error)
    }
  }, [openDB, countPendingActions])

  const clearFailedActions = useCallback(async () => {
    try {
      const actions = await getPendingActions()
      const failed = actions.filter(a => a.status === 'failed' || a.retries >= MAX_RETRIES)
      for (const action of failed) {
        await removePendingAction(action.id)
      }
    } catch (error) {
      console.error('Erreur nettoyage:', error)
    }
  }, [getPendingActions, removePendingAction])

  const syncPendingActions = useCallback(async () => {
    if (isSyncing) return

    setIsSyncing(true)
    try {
      const actions = await getPendingActions()
      const pending = actions.filter(a => a.status === 'pending' || a.status === 'failed')

      for (const action of pending) {
        if (action.retries >= MAX_RETRIES) {
          await removePendingAction(action.id)
          console.warn(`Dropped after ${MAX_RETRIES} retries: ${action.id}`)
          continue
        }

        try {
          await updateActionStatus(action.id, 'syncing')

          const endpoint = `/api/${
            action.type === 'punch_in' || action.type === 'punch_out'
              ? 'clock/record'
              : action.type === 'rtt'
              ? 'rtt'
              : 'time-off'
          }`

          const response = await Promise.race([
            fetch(endpoint, {
              method: action.type === 'punch_in' ? 'POST' : 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data),
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 5000)
            ),
          ])

          if ((response as Response).ok) {
            await removePendingAction(action.id)
            console.log(`✓ Synced: ${action.id}`)
          } else {
            throw new Error(`HTTP ${(response as Response).status}`)
          }
        } catch (error) {
          // Retry avec délai exponentiel
          const nextRetry = action.retries + 1
          await updateActionStatus(action.id, 'pending', nextRetry)
          console.warn(`Retry ${nextRetry}/${MAX_RETRIES}: ${action.id}`)

          if (nextRetry >= MAX_RETRIES) {
            await updateActionStatus(action.id, 'failed')
          }
        }
      }
    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, getPendingActions, updateActionStatus, removePendingAction])

  return {
    pendingCount,
    isSyncing,
    savePendingAction,
    getPendingActions,
    syncPendingActions,
    clearFailedActions,
  }
}
