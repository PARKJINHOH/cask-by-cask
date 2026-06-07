export type ScoreHistoryFilterType = 'ALL' | 'EARN' | 'DEDUCT'

export interface ScoreHistoryItem {
  id: number
  actionType: string
  score: number
  balanceAfter: number
  description: string | null
  createdAt: string
}

// 레벨 구간 — member_level_config 테이블 기본값과 동기화
export interface LevelInfo {
  id?: number
  level: number
  name: string
  minScore: number
  isActive?: boolean
}

// 레벨 명칭 = "원액 → 오크통 숙성 → 컬렉터 → 레전드" 로 이어지는 숙성 여정 테마.
// (DB member_level_config 가 단일 소스이며, 아래는 미로딩 시 fallback. 관리자 화면에서 자유 편집)
export const LEVELS: LevelInfo[] = [
  { level: 1,  name: '뉴메이크',   minScore: 0 },
  { level: 2,  name: '캐스크',     minScore: 50 },
  { level: 3,  name: '싱글몰트',   minScore: 150 },
  { level: 4,  name: '셰리',       minScore: 350 },
  { level: 5,  name: '스몰배치',   minScore: 700 },
  { level: 6,  name: '싱글캐스크', minScore: 1200 },
  { level: 7,  name: '배럴프루프', minScore: 2000 },
  { level: 8,  name: '빈티지',     minScore: 3500 },
  { level: 9,  name: '리저브',     minScore: 6000 },
  { level: 10, name: '올드리저브', minScore: 10000 },
  { level: 11, name: '레어',       minScore: 20000 },
  { level: 12, name: '리미티드',   minScore: 35000 },
  { level: 13, name: '시그니처',   minScore: 55000 },
  { level: 14, name: '컬렉터스',   minScore: 85000 },
  { level: 15, name: '마스터',     minScore: 130000 },
  { level: 16, name: '마스터피스', minScore: 190000 },
  { level: 17, name: '헤리티지',   minScore: 280000 },
  { level: 18, name: '레전드',     minScore: 400000 },
  { level: 19, name: '아이코닉',   minScore: 600000 },
  { level: 20, name: '임모탈',     minScore: 900000 },
]

export const MAX_LEVEL = LEVELS[LEVELS.length - 1].level

export function getLevelInfo(level: number): LevelInfo {
  return LEVELS.find((l) => l.level === level) ?? LEVELS[LEVELS.length - 1]
}

export function getNextLevelInfo(level: number): LevelInfo | null {
  return LEVELS.find((l) => l.level === level + 1) ?? null
}

export function calcProgress(maturingPower: number, currentLevel: number): number {
  const cur = getLevelInfo(currentLevel)
  const next = getNextLevelInfo(currentLevel)
  if (!next) return 100
  const range = next.minScore - cur.minScore
  const earned = maturingPower - cur.minScore
  return Math.min(100, Math.max(0, Math.round((earned / range) * 100)))
}

// 액션 타입별 이모지 아이콘
export const ACTION_ICONS: Record<string, string> = {
  POST_WRITE_GENERAL:       '📝',
  POST_WRITE_QUESTION:      '❓',
  POST_WRITE_REVIEW:        '📋',
  POST_WRITE_SHARING:       '🎁',
  POST_WRITE_DISTILLERY_TOUR: '🏭',
  POST_WRITE_NOTICE:        '📢',
  POST_DELETE:              '🗑️',
  POST_LOCKED:              '🔒',
  POST_LIKED:               '👍',
  COMMENT_WRITE:            '💬',
  SPIRIT_REVIEW_WRITE:      '📖',
  SPIRIT_REQUEST:           '🥃',
  SPIRIT_REQUEST_APPROVED:  '✅',
  WISHLIST_ADD:             '⭐',
  ATTENDANCE:               '🔥',
  ATTENDANCE_STREAK_7:      '🎉',
  ATTENDANCE_STREAK_30:     '🏆',
  ADMIN_ADJUST:             '⚙️',
}
