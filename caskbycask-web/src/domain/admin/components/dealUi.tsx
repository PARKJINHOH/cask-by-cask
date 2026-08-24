// 가격 동향(핫딜 수집·관리자 직접 등록) 공용 UI/포맷 (목록·상세 공유). 관리자 전용이라 한국어 고정.
import type { DealStatus } from '../types/deal.types'
import { formatMoney } from '@/shared/utils/currencyFormat'

export const SITE_LABEL: Record<string, string> = {
  DCINSIDE: '디시인사이드',
  NAVER_CAFE: '네이버 카페',
  ADMIN: '관리자 직접 등록',
}
export const siteLabel = (s: string | null | undefined) => (s ? SITE_LABEL[s] ?? s : '-')

/** 관리자 직접 등록은 원문 URL 이 없을 수 있다(내부 멱등키 `admin://`). 링크로 열 수 있는지 판별. */
export const isOpenableSourceUrl = (url: string | null | undefined): boolean =>
  Boolean(url && /^https?:\/\//i.test(url))

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  PENDING: '검토 대기',
  APPROVED: '승인',
  REJECTED: '반려',
}

const STATUS_STYLE: Record<DealStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
}

/** 관리자 화면 가격 표기. 통화 기호는 사용자 화면과 같은 규칙(US$/NT$)을 쓴다. */
export function formatPrice(v: number | null | undefined, currency?: string | null): string {
  const value = Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0
  return formatMoney(value, currency)
}

export function formatDiscount(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return '0%'
  const percent = rate * 100
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`
}

/** 신뢰도 뱃지: 8~10 초록 / 5~7 노랑 / 그 외 회색. */
export function ConfidenceBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-neutral-400">-</span>
  const cls = score >= 8
    ? 'bg-green-100 text-green-700'
    : score >= 5
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-neutral-100 text-neutral-500'
  return (
    <span className={`inline-block shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${cls}`}>
      {score}
    </span>
  )
}

export function DealStatusBadge({ status }: { status: DealStatus }) {
  return (
    <span className={`inline-block shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {DEAL_STATUS_LABEL[status]}
    </span>
  )
}

/** 원문 URL 새 탭 열기 버튼 (교차검증용). 행 클릭 네비게이션과 분리되도록 stopPropagation. */
export function SourceLinkButton({ url }: { url: string }) {
  return (
    <button
      type="button"
      title="원문 새 탭으로 열기"
      onClick={(e) => {
        e.stopPropagation()
        window.open(url, '_blank', 'noopener,noreferrer')
      }}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-500
        hover:bg-neutral-100 hover:text-primary-700 transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </button>
  )
}
