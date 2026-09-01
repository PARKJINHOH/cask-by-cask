interface Props {
  className?: string
}

/**
 * "내 리뷰" 진입점 아이콘 (헤더 · 모바일 하단탭 공용).
 * 두 곳이 같은 글리프를 써야 사용자가 같은 목적지임을 알아본다.
 */
export default function MyReviewsIcon({ className = 'w-5 h-5' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}
