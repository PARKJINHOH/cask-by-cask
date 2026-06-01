import { useMemo } from 'react'
import { CATEGORY_META } from '../constants/eventCategory'
import type { BarSource } from '../utils/calendar'
import {
  buildMonthGrid,
  layoutWeek,
  isSameDay,
  toYmd,
} from '../utils/calendar'

const DAY_HEADER_H = 26 // 날짜 숫자 영역 높이(px)
const BAR_H = 20        // 막대 높이(px)
const BAR_GAP = 3       // 막대 세로 간격(px)
const WEEK_BOTTOM_PAD = 6

interface Props<T extends BarSource> {
  year: number
  month: number
  events: T[]
  /** 요일 헤더 라벨 (일~토, 길이 7) */
  weekdayLabels: string[]
  onEventClick?: (event: T) => void
  /** 날짜 셀 클릭 (관리자 등록용). 지정 시 셀에 hover/커서 표시 */
  onDayClick?: (dateStr: string) => void
}

export default function EventCalendarGrid<T extends BarSource>({
  year,
  month,
  events,
  weekdayLabels,
  onEventClick,
  onDayClick,
}: Props<T>) {
  const today = new Date()
  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month])

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50">
        {weekdayLabels.map((label, i) => (
          <div
            key={i}
            className={[
              'py-2 text-center text-xs font-semibold',
              i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-600' : 'text-neutral-500',
            ].join(' ')}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 주 단위 렌더 */}
      {weeks.map((week, wi) => {
        const weekStart = week[0]
        const { bars, laneCount } = layoutWeek(events, weekStart)
        const bodyLanes = Math.max(laneCount, 1)
        const weekHeight =
          DAY_HEADER_H + bodyLanes * (BAR_H + BAR_GAP) + WEEK_BOTTOM_PAD

        return (
          <div
            key={wi}
            className="relative border-b border-neutral-100 last:border-b-0"
            style={{ height: weekHeight }}
          >
            {/* 배경 날짜 셀 */}
            <div className="absolute inset-0 grid grid-cols-7">
              {week.map((day, di) => {
                const inMonth = day.getMonth() === month - 1
                const isToday = isSameDay(day, today)
                const clickable = onDayClick != null
                return (
                  <div
                    key={di}
                    onClick={clickable ? () => onDayClick!(toYmd(day)) : undefined}
                    className={[
                      'border-r border-neutral-100 last:border-r-0 px-1.5 pt-1',
                      inMonth ? 'bg-white' : 'bg-neutral-50/60',
                      clickable ? 'cursor-pointer hover:bg-primary-50/50 transition-colors' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'inline-flex items-center justify-center w-6 h-5 text-xs font-medium rounded-full',
                        isToday ? 'bg-primary-800 text-white' : '',
                        !isToday && di === 0 ? 'text-rose-500' : '',
                        !isToday && di === 6 ? 'text-sky-600' : '',
                        !isToday && di !== 0 && di !== 6
                          ? inMonth ? 'text-neutral-700' : 'text-neutral-300'
                          : '',
                        !isToday && (di === 0 || di === 6) && !inMonth ? 'opacity-40' : '',
                      ].join(' ')}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* 이벤트 막대 오버레이 (pointer-events-none → 빈 영역 클릭은 날짜 셀로 전달) */}
            <div
              className="absolute inset-0 grid pointer-events-none px-1"
              style={{
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gridAutoRows: `${BAR_H}px`,
                rowGap: `${BAR_GAP}px`,
                paddingTop: DAY_HEADER_H,
              }}
            >
              {bars.map((b) => {
                const meta = CATEGORY_META[b.event.category]
                const hidden = b.event.isVisible === false
                const rounded = [
                  b.roundLeft ? 'rounded-l-md' : 'rounded-l-none',
                  b.roundRight ? 'rounded-r-md' : 'rounded-r-none',
                ].join(' ')
                return (
                  <button
                    key={b.event.id}
                    type="button"
                    title={b.event.title}
                    onClick={() => onEventClick?.(b.event)}
                    style={{
                      gridColumn: `${b.startCol + 1} / span ${b.span}`,
                      gridRow: b.lane + 1,
                    }}
                    className={[
                      'pointer-events-auto mx-px h-5 px-1.5 flex items-center gap-1',
                      'text-[11px] leading-none font-medium truncate text-left',
                      'transition-opacity hover:opacity-90',
                      rounded,
                      meta.bar,
                      hidden ? 'opacity-40 ring-1 ring-inset ring-white/60' : '',
                      onEventClick ? 'cursor-pointer' : 'cursor-default',
                    ].join(' ')}
                  >
                    {b.continuesLeft && <span className="opacity-80">‹</span>}
                    <span className="truncate">{b.event.title}</span>
                    {hidden && <span className="opacity-80">🔒</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
