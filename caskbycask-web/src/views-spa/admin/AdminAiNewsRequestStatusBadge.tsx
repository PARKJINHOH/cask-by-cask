import type { AiNewsDraftRequestStatus } from '@/domain/admin/types/aiNews.types'

const statusLabels: Record<AiNewsDraftRequestStatus, string> = {
  PENDING: '다음 배치 대기',
  COMPLETED: '임시저장 완료',
  FAILED: '작성 실패',
  CANCELLED: '요청 취소',
}

const statusClasses: Record<AiNewsDraftRequestStatus, string> = {
  PENDING: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-neutral-100 text-neutral-500',
}

export function summarizeAiNewsPrompt(prompt: string, maxLength = 70) {
  const firstLine = prompt.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? '제목 없음'
  const characters = [...firstLine]
  return characters.length > maxLength
    ? `${characters.slice(0, maxLength).join('').trimEnd()}…`
    : firstLine
}

export default function AdminAiNewsRequestStatusBadge({ status }: { status: AiNewsDraftRequestStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  )
}
