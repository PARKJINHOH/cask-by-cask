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
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="px-4 py-3 border-b border-neutral-100">
        <h2 className="text-sm font-semibold text-neutral-800">{t('calendar.upcoming')}</h2>
      </div>

      {events.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-neutral-400">
          {t('calendar.upcomingEmpty')}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-50">
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
                  className="group w-full flex items-stretch gap-3 px-4 py-3 text-left hover:bg-primary-50/40 transition-colors"
                >
                  <span className={`w-1 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${meta.chip}`}>
                        {t(meta.labelKey)}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${relClass}`}>
                        {relLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-neutral-800 truncate group-hover:text-primary-800 transition-colors">
                      {ev.title}
                    </p>
                    <p className="text-xs text-neutral-500 tabular-nums">{dateText}</p>
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
