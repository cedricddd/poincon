'use client'

import { useState, useEffect } from 'react'

interface Notification {
  id: string
  userId: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shown, setShown] = useState(false)
  // True while the panel is open because of new notifications (not opened by the user)
  const [autoOpened, setAutoOpened] = useState(false)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        const newUnread = data.filter((n: Notification) => !n.read).length
        setNotifications(data)
        setUnreadCount(prev => {
          if (newUnread > prev) window.dispatchEvent(new Event('balance:refresh'))
          return newUnread
        })
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Show new notifications once. The close timer lives in its own effect: kept here, it was
  // cleared by the re-run that setShown triggers, and the panel (with its full-page overlay)
  // never closed by itself.
  useEffect(() => {
    if (unreadCount > 0 && !shown) {
      setShown(true)
      setOpen(true)
      setAutoOpened(true)
    }
  }, [unreadCount, shown])

  useEffect(() => {
    if (!autoOpened) return
    const timer = setTimeout(() => {
      setOpen(false)
      setAutoOpened(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [autoOpened])

  const handleOpen = async () => {
    const isOpen = !open
    setAutoOpened(false) // the user took over: no automatic close
    setOpen(isOpen)

    if (isOpen && unreadCount > 0) {
      try {
        await fetch('/api/notifications', { method: 'PATCH' })
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      } catch (error) {
        console.error('Failed to mark notifications as read:', error)
      }
    }
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className={`relative p-2 transition-all ${
          unreadCount > 0
            ? 'text-[var(--pp-neg)] hover:text-[var(--pp-neg)] scale-110'
            : 'text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'
        }`}
        aria-label="Notifications"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-[var(--pp-neg)] rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-2xl border border-[var(--pp-line)] z-[9999]">
          {/* Header */}
          <div className="p-4 border-b border-[var(--pp-line)] bg-[var(--pp-info)]/5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--pp-ink)]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs font-medium text-[var(--pp-neg)]">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-[var(--pp-muted)]">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-[var(--pp-muted)]">
                Aucune notification
              </div>
            ) : (
              <div className="divide-y divide-[var(--pp-line)]">
                {notifications.slice(0, 5).map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 border-l-4 transition-colors bg-white ${
                      notif.type === 'success'
                        ? 'border-l-[var(--pp-pos)] text-[var(--pp-pos)]'
                        : notif.type === 'error'
                          ? 'border-l-[var(--pp-neg)] text-[var(--pp-neg)]'
                          : 'border-l-[var(--pp-info)] text-[var(--pp-info)]'
                    } hover:bg-gray-50 cursor-pointer`}
                  >
                    <div className={`text-sm font-medium break-words ${!notif.read ? 'font-bold' : ''}`}>
                      {notif.message}
                    </div>
                    <div className="text-xs opacity-60 mt-2 flex items-center justify-between">
                      <span>
                        {new Date(notif.createdAt).toLocaleTimeString('fr-BE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {!notif.read && <span className="inline-block w-2 h-2 bg-[var(--pp-neg)] rounded-full" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 5 && (
            <div className="p-3 text-center border-t border-[var(--pp-line)] bg-[var(--pp-info)]/5">
              <button className="text-xs font-medium text-[var(--pp-info)] hover:underline transition-colors">
                Voir toutes ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}
