export type ScoreHistoryFilterType = 'ALL' | 'EARN' | 'DEDUCT'

export interface ScoreHistoryItem {
  id: number
  actionType: string
  score: number
  balanceAfter: number
  description: string | null
  // 점수를 획득/차감한 출처 페이지 경로 (게시글·댓글·리뷰·술 등). 매핑 불가 시 null.
  linkUrl: string | null
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

// 레벨 임계값 공식 — 100레벨 체계. (DB member_level_config 가 단일 소스이며, 아래는 미로딩 시 fallback)
// 이름은 레벨 번호 그 자체("N레벨"). 임계값은 시작점수·증가율 기반의 부드러운 지수 곡선.
// 관리자 레벨설정 화면의 기본 생성값과 동일한 공식이므로, V28 시드와도 일치한다.
export interface LevelFormula {
  maxLevel: number
  baseScore: number
  growthRate: number
}

export const DEFAULT_LEVEL_FORMULA: LevelFormula = { maxLevel: 100, baseScore: 40, growthRate: 1.07 }

/** 읽기 좋은 자리수로 반올림 (단계가 커질수록 거친 단위) */
function niceRound(v: number): number {
  if (v <= 0) return 0
  const step =
    v < 100 ? 5 : v < 1000 ? 10 : v < 10000 ? 100 : v < 100000 ? 1000 : v < 1000000 ? 10000 : 50000
  return Math.round(v / step) * step
}

/** 공식으로 레벨 구간 전체를 생성 (단조 증가 보장) */
export function generateLevels(f: LevelFormula = DEFAULT_LEVEL_FORMULA): LevelInfo[] {
  const out: LevelInfo[] = []
  let prev = -1
  for (let level = 1; level <= f.maxLevel; level++) {
    const raw = level === 1 ? 0 : f.baseScore * (Math.pow(f.growthRate, level - 1) - 1)
    let minScore = niceRound(raw)
    if (minScore <= prev) minScore = prev + (prev < 100 ? 5 : prev < 1000 ? 10 : prev < 10000 ? 100 : 1000)
    prev = minScore
    out.push({ level, name: `${level}레벨`, minScore })
  }
  return out
}

export const LEVELS: LevelInfo[] = generateLevels()

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
  PRICE_REGISTER:           '💰',
  FEEDBACK_WRITE:           '💡',
  FEEDBACK_RESOLVED:        '✔️',
}
