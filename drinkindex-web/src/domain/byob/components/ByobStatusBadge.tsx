import { useTranslation } from 'react-i18next'
import type { ByobStatus } from '../types/byob.types'

const STATUS_STYLE: Record<ByobStatus, string> = {
  OPEN:      'bg-green-100 text-green-800',
  CLOSED:    'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-neutral-100 text-neutral-500',
}

const STATUS_KEY: Record<ByobStatus, string> = {
  OPEN:      'byob.statusOpen',
  CLOSED:    'byob.statusClosed',
  CANCELLED: 'byob.statusCancelled',
}

interface Props {
  status: ByobStatus
  size?: 'sm' | 'md'
}

export default function ByobStatusBadge({ status, size = 'md' }: Props) {
  const { t } = useTranslation()
  const cls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${cls} ${STATUS_STYLE[status]}`}>
      {t(STATUS_KEY[status])}
    </span>
  )
}
