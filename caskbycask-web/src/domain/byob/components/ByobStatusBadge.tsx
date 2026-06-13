import { useTranslation } from 'react-i18next'
import type { ByobStatus } from '../types/byob.types'

// 자유게시판 말머리 뱃지와 동일한 아웃라인 스타일 (옅은 배경 + 색상 테두리 + 색상 텍스트)
const STATUS_STYLE: Record<ByobStatus, string> = {
  OPEN:      'border-green-400 text-green-700',
  CLOSED:    'border-yellow-400 text-yellow-700',
  CANCELLED: 'border-neutral-50 text-neutral-400',
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
    <span className={`inline-flex items-center font-medium rounded-full border bg-neutral-50 ${cls} ${STATUS_STYLE[status]}`}>
      {t(STATUS_KEY[status])}
    </span>
  )
}
