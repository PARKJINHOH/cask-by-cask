import { useTranslation } from 'react-i18next'
import { CATEGORY_META } from '../constants/eventCategory'
import type { CalendarEvent } from '../types/event.types'
import { parseYmd, diffDays } from '../utils/calendar'

interface Props {
  events: CalendarEvent[]
  onSelect: (event: CalendarEvent) => void
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function fmt(d: Date) {
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`
}

export default function UpcomingEvents({ events, onSelect }: Props) {
  const { t } = useTranslation()
  const today = startOfToday()

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-neutral-100">
        <h2 className="text-sm font-semibold text-neutral-900">{t('calendar.upcoming')}</h2>
      </div>

      {events.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-neutral-400">
          {t('calendar.upcomingEmpty')}
        </p>
      ) : (
        <ul className="space-y-2 p-3">
          {events.map((ev) => {
            const meta = CATEGORY_META[ev.category]
            const start = parseYmd(ev.startDate)
            const end = parseYmd(ev.endDate ?? ev.startDate)
            const dd = diffDays(start, today)

            let relLabel: string
            let relClass: string
            if (dd === 0) {
              relLabel = t('calendar.today')
              relClass = 'bg-primary-800 text-white'
            } else if (dd > 0) {
              relLabel = `D-${dd}`
              relClass = 'bg-primary-50 text-primary-800'
            } else {
              relLabel = t('calendar.ongoing')
              relClass = 'bg-emerald-50 text-emerald-700'
            }

            const hasRange = ev.endDate && ev.endDate !== ev.startDate
            const dateText = hasRange ? `${fmt(start)} ~ ${fmt(end)}` : fmt(start)

            return (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onSelect(ev)}
                  className="group w-full rounded-lg border border-neutral-100 bg-white px-3 py-3 text-left shadow-xs transition-[border-color,background-color,box-shadow] hover:border-primary-200 hover:bg-primary-50/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-10 w-1 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${meta.chip}`}>
                          {t(meta.labelKey)}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${relClass}`}>
                          {relLabel}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold leading-snug text-neutral-900 line-clamp-2 group-hover:text-primary-900 transition-colors">
                        {ev.title}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-neutral-500 tabular-nums">{dateText}</p>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-800">
                          {t('calendar.openLink')}
                          <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
