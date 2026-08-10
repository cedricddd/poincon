import { useEffect, useSyncExternalStore } from 'react'

export interface PendingAction {
  id: string
  type: 'punch_in' | 'punch_out' | 'rtt' | 'time_off'
  data: Record<string, unknown>
  /** 'syncing' | 'synced' are legacy values still present in older clients' databases. */
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  timestamp: number
  retries: number
}

const DB_NAME = 'PointonDB'
const STORE_NAME = 'pendingActions'
const DB_VERSION = 1
const MAX_RETRIES = 5
const RETRY_DELAY = 5000
const REQUEST_TIMEOUT = 5000

/* ------------------------------------------------------------------ database */

// A single connection per page, reopened on demand. iOS Safari closes IndexedDB
// handles when it suspends a tab, and a request issued on a dead handle fails
// with "UnknownError: Attempt to get records from database without an
// in-progress transaction".
let dbPromise: Promise<IDBDatabase> | null = null

function forget(target: Promise<IDBDatabase>) {
  if (dbPromise === target) dbPromise = null
}

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'))
  }

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDB open blocked'))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => {
      const db = request.result
      db.onclose = () => forget(opening)
      db.onversionchange = () => {
        db.close()
        forget(opening)
      }
      resolve(db)
    }
  })

  opening.catch(() => forget(opening))
  dbPromise = opening
  return opening
}

function closeDatabase() {
  const current = dbPromise
  dbPromise = null
  current?.then(db => db.close()).catch(() => {})
}

const TRANSIENT_ERRORS = new Set([
  'UnknownError',
  'InvalidStateError',
  'TransactionInactiveError',
  'AbortError',
])

function isTransient(error: unknown): boolean {
  const name =
    typeof error === 'object' && error !== null ? (error as { name?: string }).name : undefined
  return name !== undefined && TRANSIENT_ERRORS.has(name)
}

/**
 * Runs one request inside its own transaction, resolving only once the
 * transaction commits. Retries once on a dropped connection.
 */
async function withStore<T>(
  mode: IDBTransactionMode,
  exec: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const db = await openDatabase()
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], mode)
        let result: T | undefined

        transaction.oncomplete = () => resolve(result as T)
        transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted'))
        transaction.onerror = () => reject(transaction.error)

        const request = exec(transaction.objectStore(STORE_NAME))
        request.onsuccess = () => {
          result = request.result as T
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      lastError = error
      if (attempt === 0 && isTransient(error)) {
        closeDatabase()
        continue
      }
      throw error
    }
  }

  throw lastError
}

const readActions = () => withStore<PendingAction[]>('readonly', store => store.getAll())
const countActions = () => withStore<number>('readonly', store => store.count())
const putAction = (action: PendingAction) =>
  withStore<IDBValidKey>('readwrite', store => store.put(action))
const deleteAction = (id: string) => withStore<undefined>('readwrite', store => store.delete(id))

/* --------------------------------------------------------------------- store */

interface SyncState {
  pendingCount: number
  isSyncing: boolean
}

const INITIAL_STATE: SyncState = { pendingCount: 0, isSyncing: false }

let state: SyncState = INITIAL_STATE
const listeners = new Set<() => void>()

function setState(patch: Partial<SyncState>) {
  const next = { ...state, ...patch }
  if (next.pendingCount === state.pendingCount && next.isSyncing === state.isSyncing) return
  state = next
  listeners.forEach(listener => listener())
}

/* ---------------------------------------------------------------- sync engine */

let syncInFlight = false
let retryTimer: ReturnType<typeof setTimeout> | null = null

const isHidden = () => typeof document !== 'undefined' && document.hidden
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false
const isRetryable = (action: PendingAction) =>
  action.status !== 'failed' && action.retries < MAX_RETRIES

function scheduleRetry() {
  if (retryTimer !== null || isHidden()) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    void syncPendingActions()
  }, RETRY_DELAY)
}

function endpointFor(type: PendingAction['type']): string {
  if (type === 'punch_in' || type === 'punch_out') return '/api/clock/record'
  return type === 'rtt' ? '/api/rtt' : '/api/time-off'
}

async function postAction(action: PendingAction): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    return await fetch(endpointFor(action.type), {
      method: action.type === 'punch_in' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.data),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/** Never throws: returns 'done' when the action can be dropped, or its next state. */
async function attemptSync(action: PendingAction): Promise<'done' | PendingAction> {
  try {
    const response = await postAction(action)
    if (response.ok) return 'done'

    // 4xx = the server refused it for good; retrying can only duplicate noise.
    if (response.status < 500) return { ...action, status: 'failed' }

    throw new Error(`HTTP ${response.status}`)
  } catch {
    const retries = action.retries + 1
    return { ...action, retries, status: retries >= MAX_RETRIES ? 'failed' : 'pending' }
  }
}

export async function syncPendingActions(): Promise<void> {
  if (syncInFlight || isHidden()) return

  syncInFlight = true
  setState({ isSyncing: true })

  try {
    let remaining = await readActions()

    if (!isOffline()) {
      for (const action of remaining) {
        if (!isRetryable(action)) continue

        const outcome = await attemptSync(action)
        try {
          if (outcome === 'done') {
            await deleteAction(action.id)
            remaining = remaining.filter(a => a.id !== action.id)
          } else {
            await putAction(outcome)
            remaining = remaining.map(a => (a.id === action.id ? outcome : a))
          }
        } catch (error) {
          // The queue is unwritable: stop here rather than re-posting the rest.
          console.error('Offline queue write failed:', error)
          break
        }
      }
    }

    setState({ pendingCount: remaining.length })
    if (remaining.some(isRetryable)) scheduleRetry()
  } catch (error) {
    // Do not reschedule: the next punch, tab focus or 'online' event retries.
    console.error('Offline sync failed:', error)
  } finally {
    syncInFlight = false
    setState({ isSyncing: false })
  }
}

async function refreshCount(): Promise<number> {
  try {
    const count = await countActions()
    setState({ pendingCount: count })
    return count
  } catch (error) {
    console.error('Offline queue count failed:', error)
    return state.pendingCount
  }
}

let started = false

function ensureStarted() {
  if (started || typeof window === 'undefined') return
  started = true

  window.addEventListener('online', () => void syncPendingActions())
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Release the handle before iOS suspends the tab.
      if (retryTimer !== null) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
      closeDatabase()
      return
    }
    void syncPendingActions()
  })

  void refreshCount().then(count => {
    if (count > 0) void syncPendingActions()
  })
}

/* ---------------------------------------------------------------- public API */

export async function savePendingAction(
  type: PendingAction['type'],
  data: Record<string, unknown>
): Promise<PendingAction> {
  const action: PendingAction = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    data,
    status: 'pending',
    timestamp: Date.now(),
    retries: 0,
  }

  await withStore('readwrite', store => store.add(action))
  setState({ pendingCount: state.pendingCount + 1 })
  void syncPendingActions()

  return action
}

export async function getPendingActions(): Promise<PendingAction[]> {
  try {
    return await readActions()
  } catch (error) {
    console.error('Offline queue read failed:', error)
    return []
  }
}

export async function clearFailedActions(): Promise<void> {
  try {
    const actions = await readActions()
    for (const action of actions) {
      if (!isRetryable(action)) await deleteAction(action.id)
    }
    await refreshCount()
  } catch (error) {
    console.error('Offline queue cleanup failed:', error)
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useOfflineSync() {
  const { pendingCount, isSyncing } = useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL_STATE
  )

  useEffect(ensureStarted, [])

  return {
    pendingCount,
    isSyncing,
    savePendingAction,
    getPendingActions,
    syncPendingActions,
    clearFailedActions,
  }
}
