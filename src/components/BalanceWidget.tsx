'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('balance')
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
    const interval = setInterval(loadBalance, 60000)
    window.addEventListener('balance:refresh', loadBalance)
    return () => {
      clearInterval(interval)
      window.removeEventListener('balance:refresh', loadBalance)
    }
  }, [])

  if (loading || !balance) {
    return (
      <Card>
        <div className="pp-skel h-4 w-24 mb-4" />
        <div className="pp-skel h-16 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          <div className="pp-skel h-14" />
          <div className="pp-skel h-14" />
        </div>
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
      <h3 className="text-sm font-bold text-[var(--pp-ink)] mb-4">{t('title')}</h3>

      <div className="space-y-3">
        {/* Main balance */}
        <div className="p-3 rounded-lg bg-[var(--pp-info)]/10">
          <p className="text-xs text-[var(--pp-muted)] mb-1">{t('netBalance')}</p>
          <p className={`text-2xl font-bold ${balanceColor}`}>
            {balance.balance > 0 ? '+' : ''}{balance.balance.toFixed(1)}h
          </p>
          <p className="text-xs text-[var(--pp-muted)] mt-1">
            {balance.balance > 0
              ? t('credit')
              : balance.balance < 0
                ? t('toMakeUp')
                : t('zero')}
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-[var(--pp-pos)]/10">
            <p className="text-xs text-[var(--pp-muted)]">{t('overtime')}</p>
            <p className="text-lg font-bold text-[var(--pp-pos)]">
              {balance.overtimeHours.toFixed(1)}h
            </p>
            <p className="text-xs text-[var(--pp-muted)]">{t('approvedF')}</p>
          </div>

          <div className="p-2 rounded-lg bg-[var(--pp-neg)]/10">
            <p className="text-xs text-[var(--pp-muted)]">{t('timeoff')}</p>
            <p className="text-lg font-bold text-[var(--pp-neg)]">{balance.daysOff}{t('daysSuffix')}</p>
            <p className="text-xs text-[var(--pp-muted)]">{t('approvedM')}</p>
          </div>
        </div>

        {/* Pending requests */}
        {(balance.pendingRequests.overtime > 0 || balance.pendingRequests.timeOff > 0) && (
          <div className="pt-3 border-t border-[var(--pp-line)] text-xs text-[var(--pp-muted)]">
            <p className="font-medium mb-1">{t('pendingTitle')}</p>
            <ul className="space-y-1">
              {balance.pendingRequests.overtime > 0 && (
                <li>• {t('pendingOvertime', { count: balance.pendingRequests.overtime })}</li>
              )}
              {balance.pendingRequests.timeOff > 0 && (
                <li>• {t('pendingTimeoff', { count: balance.pendingRequests.timeOff })}</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
