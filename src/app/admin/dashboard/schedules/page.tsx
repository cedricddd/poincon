'use client'

import { useEffect, useState } from 'react'

interface UserSchedule {
  userId: string
  hoursPerDay: number
  user: {
    id: string
    name: string
    email: string
  }
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<UserSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<{ [key: string]: number | null }>({})

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/schedule')
      if (res.ok) {
        const data = await res.json()
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleUpdate = async (userId: string) => {
    const hours = editingSchedule[userId]
    if (hours === null || hours === undefined) return

    try {
      setActionInProgress(userId)
      const res = await fetch('/api/admin/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, hoursPerDay: hours }),
      })

      if (res.ok) {
        await fetchSchedules()
        setEditingSchedule({ ...editingSchedule, [userId]: null })
      } else {
        const error = await res.json()
        alert(`Erreur: ${error.error}`)
      }
    } catch (error) {
      console.error('Update failed:', error)
      alert('Mise à jour échouée')
    } finally {
      setActionInProgress(null)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Configuration des horaires</h1>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3">Employé</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Heures/jour</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                  Aucun horaire configuré
                </td>
              </tr>
            ) : (
              schedules.map(schedule => (
                <tr key={schedule.userId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{schedule.user.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{schedule.user.email}</td>
                  <td className="px-4 py-3">
                    {editingSchedule[schedule.userId] !== null && editingSchedule[schedule.userId] !== undefined ? (
                      <input
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        value={editingSchedule[schedule.userId] ?? schedule.hoursPerDay}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            [schedule.userId]: parseFloat(e.target.value),
                          })
                        }
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="font-medium">{schedule.hoursPerDay}h</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {editingSchedule[schedule.userId] !== null && editingSchedule[schedule.userId] !== undefined ? (
                        <>
                          <button
                            onClick={() => handleScheduleUpdate(schedule.userId)}
                            disabled={actionInProgress === schedule.userId}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() =>
                              setEditingSchedule({ ...editingSchedule, [schedule.userId]: null })
                            }
                            disabled={actionInProgress === schedule.userId}
                            className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500 disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() =>
                            setEditingSchedule({
                              ...editingSchedule,
                              [schedule.userId]: schedule.hoursPerDay,
                            })
                          }
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          Éditer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
