'use client'

import { useTranslations } from 'next-intl'

interface RequestRowProps {
  id: string
  type: string
  typeColor?: string
  typeIcon?: React.ReactNode
  employee: string
  email: string
  status: string
  details: string
  disabled?: boolean
  onApprove: () => void
  onReject: () => void
  onEdit?: () => void
  onDelete?: () => void
  selected?: boolean
  onToggleSelect?: () => void
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export function AdminRequestRow({
  id,
  type,
  typeColor,
  typeIcon,
  employee,
  email,
  status,
  details,
  disabled = false,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  selected,
  onToggleSelect,
}: RequestRowProps) {
  const t = useTranslations('adminRequests')
  const statusLabels: Record<string, string> = {
    PENDING: t('statusPending'),
    APPROVED: t('statusApproved'),
    REJECTED: t('statusRejected'),
  }
  return (
    <tr className="border-b border-[var(--pp-line)] hover:bg-[var(--pp-bg2)]">
      {onToggleSelect && (
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={!!selected}
            onChange={onToggleSelect}
            aria-label={t('selectRow')}
            className="h-4 w-4 cursor-pointer"
          />
        </td>
      )}
      <td className="px-4 py-3">
        {typeColor ? (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${typeColor}`}>
            {typeIcon}{type}
          </span>
        ) : type}
      </td>
      <td className="px-4 py-3">
        <div>
          <div className="font-medium">{employee}</div>
          <div className="text-sm text-[var(--pp-muted)]">{email}</div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm">{details}</td>
      <td className="px-4 py-3">
        <span className={`px-3 py-1 rounded-full text-sm ${statusColors[status] || 'bg-[var(--pp-bg2)] text-[var(--pp-muted)]'}`}>
          {statusLabels[status] ?? status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            disabled={disabled || status !== 'PENDING'}
            title={t('approve')}
            aria-label={t('approve')}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
          >
            ✓
          </button>
          <button
            onClick={onReject}
            disabled={disabled || status !== 'PENDING'}
            title={t('reject')}
            aria-label={t('reject')}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
          >
            ✗
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              disabled={disabled}
              title={t('edit')}
              aria-label={t('edit')}
              className="px-3 py-1 bg-[var(--pp-bg2)] text-[var(--pp-ink)] border border-[var(--pp-line)] rounded text-sm hover:bg-[var(--pp-line)] disabled:opacity-50"
            >
              ✎
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={disabled}
              title={t('delete')}
              aria-label={t('delete')}
              className="px-3 py-1 bg-[var(--pp-bg2)] text-red-500 border border-[var(--pp-line)] rounded text-sm hover:bg-red-500 hover:text-white disabled:opacity-50"
            >
              🗑
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
