interface Props {
  size?: number
}

export default function AdminIcon({ size = 20 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 방패 */}
      <path
        d="M10 2 L17 5 L17 10 C17 13.5 13.5 16.5 10 18 C6.5 16.5 3 13.5 3 10 L3 5 Z"
        fill="#DBEAFE"
        stroke="#1D4ED8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 열쇠 원형 */}
      <circle cx="10" cy="9" r="2.5" stroke="#1D4ED8" strokeWidth="1.3" />
      {/* 열쇠 손잡이 세로 */}
      <line x1="10" y1="11.5" x2="10" y2="15" stroke="#1D4ED8" strokeWidth="1.3" strokeLinecap="round" />
      {/* 열쇠 이빨 */}
      <line x1="10" y1="13" x2="12" y2="13" stroke="#1D4ED8" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="10" y1="14.5" x2="11.5" y2="14.5" stroke="#1D4ED8" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
