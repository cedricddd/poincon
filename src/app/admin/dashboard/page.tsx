'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminDashboard() {
  const [counts, setCounts] = useState({
    overtimes: 0,
    timeoffs: 0,
    rtts: 0,
    schedules: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/requests').then(r => r.json()),
      fetch('/api/admin/schedule').then(r => r.json()),
    ])
      .then(([req, sched]) => {
        setCounts({
          overtimes: req.overtimes?.filter((o: any) => o.status === 'PENDING').length ?? 0,
          timeoffs: req.timeOffs?.filter((t: any) => t.status === 'PENDING').length ?? 0,
          rtts: req.rtts?.filter((r: any) => r.status === 'PENDING').length ?? 0,
          schedules: sched.schedules?.length ?? 0,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>
  }

  const cards = [
    {
      href: '/admin/dashboard/overtimes',
      label: 'Heures Supplémentaires',
      count: counts.overtimes,
      unit: 'en attente',
      emoji: '⏱️',
    },
    {
      href: '/admin/dashboard/timeoffs',
      label: 'Demandes de Congé',
      count: counts.timeoffs,
      unit: 'en attente',
      emoji: '🏖️',
    },
    {
      href: '/admin/dashboard/rtts',
      label: 'Demandes RTT',
      count: counts.rtts,
      unit: 'en attente',
      emoji: '🚀',
    },
    {
      href: '/admin/dashboard/schedules',
      label: 'Configuration Horaires',
      count: counts.schedules,
      unit: 'employés',
      emoji: '📅',
    },
  ]

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">Gérez les demandes des employés et configurez leurs horaires</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="block bg-white rounded-lg shadow p-6 hover:shadow-lg hover:scale-105 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{card.emoji}</div>
              <div className="text-right">
                <div className="text-3xl font-bold">{card.count}</div>
                <div className="text-xs text-gray-500">{card.unit}</div>
              </div>
            </div>
            <div className="text-base font-semibold text-gray-800">{card.label}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
