import type { EventCategory } from '../types/event.types'

const MS_PER_DAY = 86_400_000

/** 'YYYY-MM-DD' → 로컬 자정 Date (UTC 파싱으로 인한 하루 밀림 방지) */
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Date → 'YYYY-MM-DD' (로컬) */
export function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** 두 로컬 자정 날짜의 일수 차 (a - b) */
export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** 일요일 시작 기준 해당 주의 첫날(일요일) */
export function startOfWeekSunday(d: Date): Date {
  return addDays(d, -d.getDay())
}

/**
 * 주어진 연·월의 달력 그리드(일요일 시작) — 6주 고정으로 레이아웃 안정.
 * 반환: Date[][] (주 × 7일)
 */
export function buildMonthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month - 1, 1)
  const gridStart = startOfWeekSunday(firstOfMonth)
  const weeks: Date[][] = []
  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(addDays(gridStart, w * 7 + i))
    }
    weeks.push(week)
  }
  return weeks
}

export interface BarSource {
  id: number
  category: EventCategory
  startDate: string
  endDate: string | null
  isVisible?: boolean
  title: string
}

export interface PlacedBar<T extends BarSource = BarSource> {
  event: T
  startCol: number      // 0~6
  span: number          // 1~7
  lane: number          // 0-based 세로 위치
  roundLeft: boolean    // 실제 시작일이 이 주 안 → 왼쪽 둥글게
  roundRight: boolean   // 실제 종료일이 이 주 안 → 오른쪽 둥글게
  continuesLeft: boolean
  continuesRight: boolean
}

export interface WeekLayout<T extends BarSource = BarSource> {
  bars: PlacedBar<T>[]
  laneCount: number
}

/**
 * 한 주([weekStart..weekStart+6])에 대해 이벤트 막대의 lane(겹침 회피 세로 위치)을 배정.
 * 그리디: 시작일 빠른 순, 같으면 긴 기간 우선 → 비어있는 가장 위 lane에 배치.
 */
export function layoutWeek<T extends BarSource>(events: T[], weekStart: Date): WeekLayout<T> {
  const weekEnd = addDays(weekStart, 6)

  const candidates = events
    .map((e) => {
      const s = parseYmd(e.startDate)
      const en = parseYmd(e.endDate ?? e.startDate)
      return { e, s, en }
    })
    .filter(({ s, en }) => s.getTime() <= weekEnd.getTime() && en.getTime() >= weekStart.getTime())
    .sort((a, b) => {
      const ds = a.s.getTime() - b.s.getTime()
      if (ds !== 0) return ds
      const la = a.en.getTime() - a.s.getTime()
      const lb = b.en.getTime() - b.s.getTime()
      if (lb !== la) return lb - la
      return a.e.id - b.e.id
    })

  // lanes[laneIndex] = 점유된 col 구간 목록
  const lanes: { start: number; end: number }[][] = []
  const bars: PlacedBar<T>[] = []

  for (const { e, s, en } of candidates) {
    const segStart = s.getTime() < weekStart.getTime() ? weekStart : s
    const segEnd = en.getTime() > weekEnd.getTime() ? weekEnd : en
    const startCol = diffDays(segStart, weekStart)
    const endCol = diffDays(segEnd, weekStart)
    const span = endCol - startCol + 1

    let lane = 0
    for (;;) {
      const occupied = lanes[lane] ?? []
      const conflict = occupied.some((r) => !(endCol < r.start || startCol > r.end))
      if (!conflict) break
      lane++
    }
    if (!lanes[lane]) lanes[lane] = []
    lanes[lane].push({ start: startCol, end: endCol })

    bars.push({
      event: e,
      startCol,
      span,
      lane,
      roundLeft: s.getTime() >= weekStart.getTime(),
      roundRight: en.getTime() <= weekEnd.getTime(),
      continuesLeft: s.getTime() < weekStart.getTime(),
      continuesRight: en.getTime() > weekEnd.getTime(),
    })
  }

  return { bars, laneCount: lanes.length }
}
