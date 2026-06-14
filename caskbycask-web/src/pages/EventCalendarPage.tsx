import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useEvents, useUpcomingEvents, useSuggestEvent } from '@/domain/event/hooks/useEvents'
import EventCalendarGrid from '@/domain/event/components/EventCalendarGrid'
import UpcomingEvents from '@/domain/event/components/UpcomingEvents'
import { CATEGORY_META, CATEGORY_ORDER } from '@/domain/event/constants/eventCategory'
import type { CalendarEvent, EventCategory } from '@/domain/event/types/event.types'
import { parseYmd } from '@/domain/event/utils/calendar'
import { useAuthStore } from '@/domain/auth/store/authStore'
import Modal from '@/shared/components/Modal'
import Button from '@/shared/components/Button'
import DateInput from '@/shared/components/DateInput'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

interface SuggestForm {
  title: string
  category: EventCategory
  startDate: string
  endDate: string
  linkUrl: string
  description: string
}

const emptySuggestForm = (): SuggestForm => ({
  title: '',
  category: 'RELEASE',
  startDate: '',
  endDate: '',
  linkUrl: '',
  description: '',
})

function formatDate(s: string) {
  const d = parseYmd(s)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function EventCalendarPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isLoggedIn } = useAuthStore()
  const { toasts, showToast, removeToast } = useToast()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1~12
  const [selected, setSelected] = useState<CalendarEvent | null>(null)

  const [suggestForm, setSuggestForm] = useState<SuggestForm | null>(null)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const suggestMutation = useSuggestEvent()

  const { data: events = [], isLoading } = useEvents(year, month)
  const { data: upcoming = [] } = useUpcomingEvents(10)

  const openSuggest = () => {
    if (!isLoggedIn) {
      showToast(t('calendar.suggest.loginRequired'), 'info')
      navigate('/login')
      return
    }
    setSuggestError(null)
    setSuggestForm(emptySuggestForm())
  }

  const patchSuggest = (p: Partial<SuggestForm>) =>
    setSuggestForm((f) => (f ? { ...f, ...p } : f))

  const handleSuggestSubmit = async () => {
    if (!suggestForm) return
    if (!suggestForm.title.trim()) { setSuggestError(t('calendar.suggest.errTitle')); return }
    if (!suggestForm.startDate) { setSuggestError(t('calendar.suggest.errStartDate')); return }
    if (suggestForm.endDate && suggestForm.endDate < suggestForm.startDate) {
      setSuggestError(t('calendar.suggest.errDateRange')); return
    }
    const link = suggestForm.linkUrl.trim()
    if (link && !/^https?:\/\/.+/i.test(link)) {
      setSuggestError(t('calendar.suggest.errLink')); return
    }
    try {
      await suggestMutation.mutateAsync({
        title: suggestForm.title.trim(),
        category: suggestForm.category,
        startDate: suggestForm.startDate,
        endDate: suggestForm.endDate || null,
        linkUrl: suggestForm.linkUrl.trim() || null,
        description: suggestForm.description.trim() || null,
      })
      setSuggestForm(null)
      showToast(t('calendar.suggest.success'), 'success')
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSuggestError(msg || t('calendar.suggest.error'))
    }
  }

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
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 헤더 */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('calendar.title')}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t('calendar.subtitle')}</p>
        </div>
        <Button onClick={openSuggest} className="shrink-0 whitespace-nowrap">
          + {t('calendar.suggest.button')}
        </Button>
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

      {/* 이벤트 제보 모달 */}
      <Modal
        open={suggestForm != null}
        onClose={() => setSuggestForm(null)}
        title={t('calendar.suggest.title')}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setSuggestForm(null)}>
              {t('calendar.suggest.cancel')}
            </Button>
            <Button isLoading={suggestMutation.isPending} onClick={handleSuggestSubmit}>
              {t('calendar.suggest.submit')}
            </Button>
          </div>
        }
      >
        {suggestForm && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">{t('calendar.suggest.subtitle')}</p>

            {suggestError && (
              <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{suggestError}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('calendar.suggest.name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={suggestForm.title}
                maxLength={200}
                onChange={(e) => patchSuggest({ title: e.target.value })}
                placeholder={t('calendar.suggest.namePlaceholder')}
                className="w-full h-10 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('calendar.suggest.category')} <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ORDER.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => patchSuggest({ category: c })}
                    className={[
                      'inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-lg border transition-colors',
                      suggestForm.category === c
                        ? `${CATEGORY_META[c].bar} border-transparent`
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50',
                    ].join(' ')}
                  >
                    <span className={`w-2.5 h-2.5 rounded-sm ${suggestForm.category === c ? 'bg-white/80' : CATEGORY_META[c].dot}`} />
                    {t(CATEGORY_META[c].labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('calendar.suggest.startDate')} <span className="text-red-500">*</span>
                </label>
                <DateInput
                  value={suggestForm.startDate}
                  onChange={(e) => patchSuggest({ startDate: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('calendar.suggest.endDate')}{' '}
                  <span className="text-neutral-400 font-normal">{t('calendar.suggest.endDateHint')}</span>
                </label>
                <DateInput
                  value={suggestForm.endDate}
                  min={suggestForm.startDate || undefined}
                  onChange={(e) => patchSuggest({ endDate: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('calendar.suggest.link')}{' '}
                <span className="text-neutral-400 font-normal">{t('calendar.suggest.linkHint')}</span>
              </label>
              <input
                type="url"
                value={suggestForm.linkUrl}
                maxLength={500}
                onChange={(e) => patchSuggest({ linkUrl: e.target.value })}
                placeholder="https://..."
                className="w-full h-10 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t('calendar.suggest.description')}{' '}
                <span className="text-neutral-400 font-normal">{t('calendar.suggest.descriptionHint')}</span>
              </label>
              <textarea
                value={suggestForm.description}
                maxLength={2000}
                rows={4}
                onChange={(e) => patchSuggest({ description: e.target.value })}
                placeholder={t('calendar.suggest.descriptionPlaceholder')}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
