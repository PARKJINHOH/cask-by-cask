import { useTranslation } from 'react-i18next'
import EmptyState from './EmptyState'

interface Props {
  /** 다시 불러오기. react-query 의 `refetch` 를 그대로 넘기면 된다. */
  onRetry: () => void
  className?: string
}

function AlertIcon() {
  return (
    <svg
      className="h-10 w-10 text-neutral-300"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/**
 * 목록을 불러오지 못했을 때의 화면.
 *
 * 이것이 없으면 요청이 실패해도 데이터가 빈 배열이라 "글이 없습니다"가 그려진다.
 * 모바일은 연결이 끊기는 일이 흔한데, 사용자는 게시판이 비었거나 필터가 잘못됐다고
 * 오해하고 되돌릴 방법도 찾지 못한다. 실패는 실패로 말하고 다시 시도할 길을 준다.
 */
export default function ListErrorState({ onRetry, className }: Props) {
  const { t } = useTranslation()

  return (
    <EmptyState
      icon={<AlertIcon />}
      title={t('common.errorTitle')}
      description={t('common.errorDescription')}
      action={{ label: t('common.retry'), onClick: onRetry }}
      className={className}
    />
  )
}
