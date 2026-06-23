import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { scoreApi } from '../api/scoreApi'
import Spinner from '@/shared/components/Spinner'
import { useRef, useEffect } from 'react'

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토']
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTHS_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function AttendanceGrass({ streakCount = 0 }: { streakCount?: number }) {
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['attendance', 'history'],
    queryFn: () => scoreApi.getAttendanceHistory().then((res) => res.data.data ?? []),
  })

  // 로딩 완료 및 윈도우 크기 변경 시 스크롤을 오른쪽 끝(최신 일자)으로 자동 이동시켜 오버플로우 시 왼쪽이 잘리도록 구현
  useEffect(() => {
    const handleScrollToEnd = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
      }
    }
    if (!isLoading) {
      handleScrollToEnd()
      window.addEventListener('resize', handleScrollToEnd)
    }
    return () => {
      window.removeEventListener('resize', handleScrollToEnd)
    }
  }, [isLoading])

  const attendedDates = new Set(history.map((d) => d.split('T')[0]))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 1년 치(364일전부터 오늘까지)로 범위 확장 복원
  const oneYearAgo = new Date(today)
  oneYearAgo.setDate(today.getDate() - 364)

  const startDay = oneYearAgo.getDay()
  const gridStartDate = new Date(oneYearAgo)
  gridStartDate.setDate(oneYearAgo.getDate() - startDay)

  const endDay = today.getDay()
  const gridEndDate = new Date(today)
  gridEndDate.setDate(today.getDate() + (6 - endDay))

  const cells: { date: Date; dateStr: string; isWithinRange: boolean; isFuture: boolean; attended: boolean }[] = []
  const tempDate = new Date(gridStartDate)

  while (tempDate <= gridEndDate) {
    const year = tempDate.getFullYear()
    const month = String(tempDate.getMonth() + 1).padStart(2, '0')
    const date = String(tempDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${date}`

    const isWithinRange = tempDate >= oneYearAgo && tempDate <= today
    const isFuture = tempDate > today
    const attended = attendedDates.has(dateStr)

    cells.push({
      date: new Date(tempDate),
      dateStr,
      isWithinRange,
      isFuture,
      attended,
    })

    tempDate.setDate(tempDate.getDate() + 1)
  }

  const weeks: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  const daysLabel = isEn ? DAYS_EN : DAYS_KO

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm flex justify-center py-10">
        <Spinner className="text-amber-600" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm max-w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">
            {isEn
              ? `Overview ${history.length} contributions in the last year`
              : `지난 1년간 ${history.length}회 출석`}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {isEn ? `Current streak: ${streakCount} days` : `현재 ${streakCount}일 연속 출석 중`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 select-none flex-shrink-0">
          <span>{isEn ? 'Absent' : '미출결'}</span>
          <div className="w-2.5 h-2.5 bg-neutral-100 rounded-[2px]" />
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-[2px]" />
          <span>{isEn ? 'Present' : '출결'}</span>
        </div>
      </div>

      <div className="flex gap-2 items-start select-none">
        {/* 요일 레이블: 스크롤 영역 외부에 배치하여 오버플로우 시에도 고정 및 가림 방지 */}
        <div className="grid grid-rows-7 text-[10px] text-neutral-400 h-[88px] pr-1.5 font-medium gap-[3px] select-none flex-shrink-0 pt-9">
          <div className="flex items-center justify-end"></div>
          <div className="flex items-center justify-end h-2.5 translate-y-[7px]">{daysLabel[1]}</div>
          <div className="flex items-center justify-end"></div>
          <div className="flex items-center justify-end h-2.5 translate-y-[7px]">{daysLabel[3]}</div>
          <div className="flex items-center justify-end"></div>
          <div className="flex items-center justify-end h-2.5 translate-y-[7px]">{daysLabel[5]}</div>
          <div className="flex items-center justify-end"></div>
        </div>

        {/* 스크롤 영역: 월 헤더와 잔디 그리드만 포함 */}
        <div
          ref={scrollRef}
          className="flex-1 min-w-0 overflow-hidden select-none pt-4"
        >
          <div className="flex flex-col min-w-0">
            {/* 월 헤더 행 */}
            <div className="flex gap-[3px] text-[10px] text-neutral-400 h-4 items-end mb-1 font-medium select-none relative">
              {weeks.map((week, idx) => {
                // 1일(월의 시작)이 속한 주이거나 첫 번째 주에 해당하는 경우 월 이름 표시
                const hasFirstDay = week.some((c) => c.date.getDate() === 1)
                const showMonthName = idx === 0 || hasFirstDay

                let displayMonth = -1
                if (showMonthName) {
                  // 1일이 속한 셀의 월을 가져오거나 첫 주는 해당 주 첫날의 월을 가져옴
                  const firstDayCell = week.find((c) => c.date.getDate() === 1)
                  displayMonth = firstDayCell ? firstDayCell.date.getMonth() : week[0].date.getMonth()
                }

                return (
                  <div
                    key={`month-label-${idx}`}
                    className="w-2.5 flex-shrink-0 relative"
                  >
                    {showMonthName && displayMonth !== -1 && (
                      <span className="absolute -mt-4 whitespace-nowrap left-0">
                        {isEn ? MONTHS_EN[displayMonth] : MONTHS_KO[displayMonth]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 잔디 그리드: 주(Week) 단위 Flex 구조. border-l 팽창 없이 개별 셀 보더 적용으로 오버플로우 깨짐 방지 */}
            <div className="flex gap-[3px] h-[88px] items-end">
              {weeks.map((week, idx) => {
                return (
                  <div
                    key={`week-${idx}`}
                    className="flex flex-col gap-[3px] flex-shrink-0"
                  >
                    {week.map((cell, dayIdx) => {
                      const isFutureOrOut = cell.isFuture || !cell.isWithinRange

                      // 이전 주 동일 요일의 월 번호와 비교하여 달라진 경우 정확한 날짜 단위로 지그재그(계단식) 세로 구분선 구성
                      const hasLeftLine =
                        !isFutureOrOut &&
                        idx > 0 &&
                        !weeks[idx - 1][dayIdx].isFuture &&
                        weeks[idx - 1][dayIdx].isWithinRange &&
                        cell.date.getMonth() !== weeks[idx - 1][dayIdx].date.getMonth()

                      const hasTopLine =
                        !isFutureOrOut &&
                        dayIdx > 0 &&
                        !week[dayIdx - 1].isFuture &&
                        week[dayIdx - 1].isWithinRange &&
                        cell.date.getMonth() !== week[dayIdx - 1].date.getMonth()

                      return (
                        <div
                          key={cell.dateStr}
                          title={
                            isFutureOrOut
                              ? undefined
                              : `${cell.dateStr}: ${
                                  cell.attended
                                    ? isEn
                                      ? 'Present'
                                      : '출결'
                                    : isEn
                                    ? 'Absent'
                                    : '미출결'
                                }`
                          }
                          className={`w-2.5 h-2.5 rounded-[2px] transition-colors box-border relative
                            ${
                              isFutureOrOut
                                ? 'bg-transparent'
                                : cell.attended
                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                : 'bg-neutral-100 hover:bg-neutral-200'
                            }`}
                        >
                          {hasLeftLine && (
                            <div className="absolute left-[-2.25px] top-[-2px] w-[1.5px] h-[13px] bg-neutral-300 pointer-events-none z-10" />
                          )}
                          {hasTopLine && (
                            <div className="absolute left-[-2px] top-[-2.25px] h-[1.5px] w-[13px] bg-neutral-300 pointer-events-none z-10" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
