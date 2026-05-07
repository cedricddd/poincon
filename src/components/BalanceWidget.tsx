'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'

interface Balance {
  overtimeHours: number
  daysOff: number
  balance: number
  pendingRequests: {
    timeOff: number
    overtime: number
  }
  approvedOvertimes: number
  approvedTimeOffs: number
}

export function BalanceWidget() {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const res = await fetch('/api/user/balance')
        if (res.ok) {
          const data = await res.json()
          setBalance(data)
        }
      } catch (error) {
        console.error('Failed to load balance:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBalance()
  }, [])

  if (loading || !balance) {
    return (
      <Card>
        <div className="text-sm text-[var(--pp-muted)]">Chargement...</div>
      </Card>
    )
  }

  const balanceColor =
    balance.balance > 0
      ? 'text-[var(--pp-pos)]'
      : balance.balance < 0
        ? 'text-[var(--pp-neg)]'
        : 'text-[var(--pp-muted)]'

  return (
    <Card>
      <h3 className="text-sm font-bold text-[var(--pp-ink)] mb-4">Solde Heures</h3>

      <div className="space-y-3">
        {/* Main balance */}
        <div className="p-3 rounded-lg bg-[var(--pp-info)]/10">
          <p className="text-xs text-[var(--pp-muted)] mb-1">Solde net</p>
          <p className={`text-2xl font-bold ${balanceColor}`}>
            {balance.balance > 0 ? '+' : ''}{balance.balance.toFixed(1)}h
          </p>
          <p className="text-xs text-[var(--pp-muted)] mt-1">
            {balance.balance > 0
              ? 'Heures en crédit'
              : balance.balance < 0
                ? 'Heures à rattraper'
                : 'Zéro'}
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-[var(--pp-pos)]/10">
            <p className="text-xs text-[var(--pp-muted)]">Heures sup</p>
            <p className="text-lg font-bold text-[var(--pp-pos)]">
              {balance.overtimeHours.toFixed(1)}h
            </p>
            <p className="text-xs text-[var(--pp-muted)]">Approuvées</p>
          </div>

          <div className="p-2 rounded-lg bg-[var(--pp-neg)]/10">
            <p className="text-xs text-[var(--pp-muted)]">Congés</p>
            <p className="text-lg font-bold text-[var(--pp-neg)]">{balance.daysOff}j</p>
            <p className="text-xs text-[var(--pp-muted)]">Approuvés</p>
          </div>
        </div>

        {/* Pending requests */}
        {(balance.pendingRequests.overtime > 0 || balance.pendingRequests.timeOff > 0) && (
          <div className="pt-3 border-t border-[var(--pp-line)] text-xs text-[var(--pp-muted)]">
            <p className="font-medium mb-1">En attente:</p>
            <ul className="space-y-1">
              {balance.pendingRequests.overtime > 0 && (
                <li>• {balance.pendingRequests.overtime} demande(s) heures sup</li>
              )}
              {balance.pendingRequests.timeOff > 0 && (
                <li>• {balance.pendingRequests.timeOff} demande(s) congé</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
