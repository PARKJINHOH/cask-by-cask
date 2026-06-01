import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEvents, useUpcomingEvents } from '@/domain/event/hooks/useEvents'
import EventCalendarGrid from '@/domain/event/components/EventCalendarGrid'
import UpcomingEvents from '@/domain/event/components/UpcomingEvents'
import { CATEGORY_META, CATEGORY_ORDER } from '@/domain/event/constants/eventCategory'
import type { CalendarEvent } from '@/domain/event/types/event.types'
import { parseYmd } from '@/domain/event/utils/calendar'
import Modal from '@/shared/components/Modal'

function formatDate(s: string) {
  const d = parseYmd(s)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function EventCalendarPage() {
  const { t } = useTranslation()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1~12
  const [selected, setSelected] = useState<CalendarEvent | null>(null)

  const { data: events = [], isLoading } = useEvents(year, month)
  const { data: upcoming = [] } = useUpcomingEvents(10)

  const goPrev = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1)
  }
  const goNext = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1)
  }
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }

  const weekdayLabels = [
    t('calendar.weekday.sun'), t('calendar.weekday.mon'), t('calendar.weekday.tue'),
    t('calendar.weekday.wed'), t('calendar.weekday.thu'), t('calendar.weekday.fri'),
    t('calendar.weekday.sat'),
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-neutral-900">{t('calendar.title')}</h1>
        <p className="text-sm text-neutral-500 mt-1">{t('calendar.subtitle')}</p>
      </div>

      {/* 달력 + 다가오는 이벤트 사이드바 */}
      <div className="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_320px] mt-5">
        <div className="min-w-0">
          {/* 월 네비게이션 + 범례 — 달력 우측 상단 */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                aria-label={t('calendar.prevMonth')}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                ‹
              </button>
              <div className="min-w-[120px] text-center text-lg font-semibold text-neutral-900 tabular-nums">
                {t('calendar.yearMonth', { year, month })}
              </div>
              <button
                type="button"
                onClick={goNext}
                aria-label={t('calendar.nextMonth')}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                ›
              </button>
              <button
                type="button"
                onClick={goToday}
                className="ml-1 h-9 px-3 text-sm font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                {t('calendar.today')}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {CATEGORY_ORDER.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
                  <span className={`w-3 h-3 rounded-sm ${CATEGORY_META[c].dot}`} />
                  {t(CATEGORY_META[c].labelKey)}
                </span>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-neutral-400 text-sm">
              {t('common.loading')}
            </div>
          ) : (
            <EventCalendarGrid
              year={year}
              month={month}
              events={events}
              weekdayLabels={weekdayLabels}
              onEventClick={setSelected}
            />
          )}
        </div>

        <aside className="lg:sticky lg:top-4">
          <UpcomingEvents events={upcoming} onSelect={setSelected} />
        </aside>
      </div>

      {/* 상세 모달 */}
      <Modal open={selected != null} onClose={() => setSelected(null)} title={t('calendar.detailTitle')}>
        {selected && (
          <div className="space-y-4">
            <div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_META[selected.category].chip}`}>
                {t(CATEGORY_META[selected.category].labelKey)}
              </span>
              <h2 className="mt-2 text-lg font-bold text-neutral-900 break-words">{selected.title}</h2>
            </div>

            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
              </svg>
              <span className="tabular-nums">
                {formatDate(selected.startDate)}
                {selected.endDate && selected.endDate !== selected.startDate
                  ? ` ~ ${formatDate(selected.endDate)}`
                  : ''}
              </span>
            </div>

            {selected.description && (
              <p className="text-sm text-neutral-700 whitespace-pre-wrap break-words leading-relaxed">
                {selected.description}
              </p>
            )}

            {selected.linkUrl && (
              <a
                href={selected.linkUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-800 hover:underline break-all"
              >
                {t('calendar.openLink')}
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H8M17 7v9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
