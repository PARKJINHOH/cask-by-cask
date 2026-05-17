interface Props {
  logoUrl?: string
  size?: number
}

export default function DistilleryIcon({ logoUrl, size = 20 }: Props) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="증류소 로고"
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  // 기본 증류기 실루엣 SVG
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 증류기 몸통 (둥근 구 형태) */}
      <ellipse cx="10" cy="12" rx="5.5" ry="5" fill="#D1FAE5" stroke="#065F46" strokeWidth="1.3" />
      {/* 증류기 목 */}
      <rect x="8.5" y="6.5" width="3" height="4" rx="1" fill="#D1FAE5" stroke="#065F46" strokeWidth="1.2" />
      {/* 증류기 헬멧 (둥근 상단) */}
      <ellipse cx="10" cy="6" rx="3.5" ry="2.5" fill="#D1FAE5" stroke="#065F46" strokeWidth="1.2" />
      {/* 증류기 꼭지 */}
      <line x1="10" y1="3.5" x2="10" y2="2" stroke="#065F46" strokeWidth="1.2" strokeLinecap="round" />
      {/* 구불구불한 냉각관 (스완 넥) */}
      <path
        d="M 13.5 7 C 16 7 17 9 15 11 C 13 13 16 14 16 16"
        stroke="#065F46"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* 받침 다리 */}
      <line x1="6" y1="17" x2="5" y2="19" stroke="#065F46" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="17" x2="15" y2="19" stroke="#065F46" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
