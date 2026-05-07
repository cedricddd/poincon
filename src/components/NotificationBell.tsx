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

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.read).length)
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

  useEffect(() => {
    if (unreadCount > 0 && !shown) {
      setOpen(true)
      setShown(true)
      const timer = setTimeout(() => setOpen(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [unreadCount, shown])

  const handleOpen = async () => {
    const isOpen = !open
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
        <div className="fixed top-16 left-1/2 -translate-x-1/2 w-96 max-w-[calc(100vw-32px)] bg-[var(--pp-bg)] rounded-lg shadow-2xl border border-[var(--pp-line)] z-50">
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
                    className={`p-4 border-l-4 transition-colors ${
                      notif.type === 'success'
                        ? 'bg-[var(--pp-pos)]/5 border-l-[var(--pp-pos)] text-[var(--pp-pos)]'
                        : notif.type === 'error'
                          ? 'bg-[var(--pp-neg)]/5 border-l-[var(--pp-neg)] text-[var(--pp-neg)]'
                          : 'bg-[var(--pp-info)]/5 border-l-[var(--pp-info)] text-[var(--pp-info)]'
                    } hover:bg-opacity-10 cursor-pointer`}
                  >
                    <div className={`text-sm font-medium ${!notif.read ? 'font-bold' : ''}`}>
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
