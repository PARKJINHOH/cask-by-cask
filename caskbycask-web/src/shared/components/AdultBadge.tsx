/**
 * 성인 전용(만 19세 이상) 표시 배지. 주류 나눔 등 adultOnly 글의 제목 앞에 표시.
 */
export default function AdultBadge({ className = '' }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="성인 전용 (만 19세 이상)"
      title="성인 전용 (만 19세 이상)"
      className={[
        'inline-flex items-center justify-center flex-shrink-0',
        'w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none',
        'ring-1 ring-red-700/30 select-none',
        className,
      ].join(' ')}
    >
      19
    </span>
  )
}
