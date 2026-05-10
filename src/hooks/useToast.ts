import { useState, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastPayload {
  id: string
  message: string
  type: ToastType
}

let toasts: ToastPayload[] = []
const listeners = new Set<(toasts: ToastPayload[]) => void>()

function emit() {
  listeners.forEach(fn => fn([...toasts]))
}

export function showToast(message: string, type: ToastType = 'success') {
  const id = crypto.randomUUID()
  toasts = [...toasts, { id, message, type }]
  emit()

  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    emit()
  }, 3000)
}

export function dismissToast(id: string) {
  toasts = toasts.filter(t => t.id !== id)
  emit()
}

export function useToast() {
  const [list, setList] = useState<ToastPayload[]>([])

  useEffect(() => {
    listeners.add(setList)
    return () => {
      listeners.delete(setList)
    }
  }, [])

  return { toasts: list }
}
