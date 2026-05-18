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

export const LEVELS: LevelInfo[] = [
  { level: 1,  name: '몰트',   minScore: 0 },
  { level: 2,  name: '스피릿', minScore: 50 },
  { level: 3,  name: '스카치', minScore: 150 },
  { level: 4,  name: '12yo',  minScore: 350 },
  { level: 5,  name: '15yo',  minScore: 700 },
  { level: 6,  name: '18yo',  minScore: 1200 },
  { level: 7,  name: 'CS',    minScore: 2000 },
  { level: 8,  name: '21yo',  minScore: 3500 },
  { level: 9,  name: '30yo',  minScore: 6000 },
  { level: 10, name: '40yo',  minScore: 10000 },
  { level: 11, name: '50yo',  minScore: 20000 },
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
