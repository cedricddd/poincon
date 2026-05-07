'use client'

interface RequestRowProps {
  id: string
  type: string
  employee: string
  email: string
  status: string
  details: string
  disabled?: boolean
  onApprove: () => void
  onReject: () => void
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

export function AdminRequestRow({
  id,
  type,
  employee,
  email,
  status,
  details,
  disabled = false,
  onApprove,
  onReject,
}: RequestRowProps) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3">{type}</td>
      <td className="px-4 py-3">
        <div>
          <div className="font-medium">{employee}</div>
          <div className="text-sm text-gray-500">{email}</div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm">{details}</td>
      <td className="px-4 py-3">
        <span className={`px-3 py-1 rounded-full text-sm ${statusColors[status] || 'bg-gray-100'}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            disabled={disabled || status !== 'PENDING'}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
          >
            ✓
          </button>
          <button
            onClick={onReject}
            disabled={disabled || status !== 'PENDING'}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
          >
            ✗
          </button>
        </div>
      </td>
    </tr>
  )
}
