// 프로필 사진이 없는 사용자용 기본 아바타.
// 사용자별로 "랜덤(고정)" 배경색 + 심플 아이콘 조합을 보여준다.
// (같은 seed → 항상 같은 색/아이콘. 외부 의존성 없이 인라인 SVG)

interface Props {
  /** 색/아이콘 결정용 시드 (보통 userId 또는 닉네임) */
  seed: string
  /** 아이콘 픽셀 크기 */
  px: number
}

// 심플한 단색 배경 팔레트
const COLORS = [
  '#64748b', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
]

// 흰색 라인 아이콘 패스 (술 테마, 24x24 viewBox) — 20종
const ICON_PATHS = [
  // 1. 와인잔
  'M8 3 H16 C15.5 9 14 11 12 11 C10 11 8.5 9 8 3 Z M12 11 V20 M8.5 20 H15.5',
  // 2. 마티니 / 칵테일잔
  'M5 4 H19 L12 12 Z M12 12 V20 M8 20 H16',
  // 3. 위스키 온더락 잔
  'M7 7 H17 V16 A2 2 0 0 1 15 18 H9 A2 2 0 0 1 7 16 Z M7 12 H17',
  // 4. 맥주잔
  'M6 7 H15 V19 A1 1 0 0 1 14 20 H7 A1 1 0 0 1 6 19 Z M15 9 H18 V15 H15 M9 10 V17 M12 10 V17',
  // 5. 샴페인 플루트
  'M9 3 H15 L14 11 H10 Z M12 11 V20 M9 20 H15',
  // 6. 하이볼 / 롱드링크 잔
  'M8 3 H16 L15 20 A1 1 0 0 1 14 21 H10 A1 1 0 0 1 9 20 Z M8.5 8 H15.5',
  // 7. 와인 병
  'M10 2 H14 V6 C14 7.5 16 8.5 16 11 V20 A1 1 0 0 1 15 21 H9 A1 1 0 0 1 8 20 V11 C8 8.5 10 7.5 10 6 Z M8 14 H16',
  // 8. 스피릿 병 (목/어깨)
  'M11 2 H13 V3 H11 Z M10.5 3 H13.5 V6 C13.5 8 16 9 16 12 V20 A1 1 0 0 1 15 21 H9 A1 1 0 0 1 8 20 V12 C8 9 10.5 8 10.5 6 Z',
  // 9. 힙플라스크
  'M7 6 H17 V19 A2 2 0 0 1 15 21 H9 A2 2 0 0 1 7 19 Z M10 3 H14 V6 H10 Z',
  // 10. 디캔터
  'M9 3 H15 M11 3 V7 C11 8 8 10 8 14 V19 A2 2 0 0 1 10 21 H14 A2 2 0 0 1 16 19 V14 C16 10 13 8 13 7 V3',
  // 11. 오크통 / 캐스크
  'M8 3 C6 3 5 7 5 12 C5 17 6 21 8 21 H16 C18 21 19 17 19 12 C19 7 18 3 16 3 Z M5 9 H19 M5 15 H19 M12 3 V21',
  // 12. 포도송이
  'M12 5 C9 5 7 7 7 10 C7 14 10 19 12 20 C14 19 17 14 17 10 C17 7 15 5 12 5 Z M12 5 V3 M14 3 C15 3.5 15.5 4.5 15 5.5',
  // 13. 얼음 큐브
  'M5 8 L12 4 L19 8 L12 12 Z M5 8 V16 L12 20 V12 M19 8 V16 L12 20',
  // 14. 레몬 슬라이스
  'M12 4 A8 8 0 1 0 12.01 4 M12 4 V20 M4 12 H20 M6.3 6.3 L17.7 17.7 M17.7 6.3 L6.3 17.7',
  // 15. 체리 (가니시)
  'M9 18 a3 3 0 1 0 0.01 0 M15 18 a3 3 0 1 0 0.01 0 M10 15 C11 9 13 7 18 5 M16 15 C16 11 17 8 18 5',
  // 16. 코르크
  'M8 4 H16 V20 H8 Z M8 9 H16 M8 15 H16',
  // 17. 셰이커
  'M9 3 H15 V5 H9 Z M8 5 H16 L15 20 A1 1 0 0 1 14 21 H10 A1 1 0 0 1 9 20 Z M8.5 9 H15.5',
  // 18. 한 방울 (싱글몰트)
  'M12 3 C12 3 6 10 6 14 A6 6 0 0 0 18 14 C18 10 12 3 12 3 Z',
  // 19. 향 / 반짝임
  'M12 2 L13.5 9 L21 12 L13.5 15 L12 22 L10.5 15 L3 12 L10.5 9 Z',
  // 20. 오크 잎
  'M12 21 C12 12 8 4 17 4 C17 13 13 21 12 21 Z M12 21 C12 14 14 9 17 4',
]

// 닉네임/아이디 기반 결정적 해시 → 같은 사용자는 항상 같은 색/아이콘
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export default function DefaultAvatar({ seed, px }: Props) {
  const h = hashString(seed || '?')
  const color = COLORS[h % COLORS.length]
  // 색과 아이콘 인덱스를 분리(decorrelate)해 조합 다양성 확보
  const path = ICON_PATHS[Math.floor(h / COLORS.length) % ICON_PATHS.length]

  return (
    <span
      className="flex items-center justify-center w-full h-full"
      style={{ backgroundColor: color }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
    </span>
  )
}
