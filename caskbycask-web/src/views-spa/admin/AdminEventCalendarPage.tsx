import { useState } from 'react'
import {
  useAdminEvents,
  useAdminEventList,
  useEventSuggestions,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useUpdateEventVisibility,
} from '@/domain/event/hooks/useAdminEvents'
import EventCalendarGrid from '@/domain/event/components/EventCalendarGrid'
import { CATEGORY_META, CATEGORY_ORDER } from '@/domain/event/constants/eventCategory'
import type {
  AdminCalendarEvent,
  EventCategory,
  EventPayload,
} from '@/domain/event/types/event.types'
import Button from '@/shared/components/Button'
import DateInput from '@/shared/components/DateInput'
import Modal from '@/shared/components/Modal'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface FormState {
  id?: number
  title: string
  category: EventCategory
  startDate: string
  endDate: string
  linkUrl: string
  description: string
  isVisible: boolean
}

const emptyForm = (startDate: string): FormState => ({
  title: '',
  category: 'RELEASE',
  startDate,
  endDate: '',
  linkUrl: '',
  description: '',
  isVisible: true,
})

const fmtDate = (s: string) => s.replace(/-/g, '.')

const fmtPeriod = (event: AdminCalendarEvent) =>
  `${fmtDate(event.startDate)}${event.endDate && event.endDate !== event.startDate ? ` ~ ${fmtDate(event.endDate)}` : ''}`

const fmtCreatedAt = (s?: string) => s?.slice(0, 16).replace('T', ' ') ?? '-'

export default function AdminEventCalendarPage() {
  const { toasts, showToast, removeToast } = useToast()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'ALL'>('ALL')

  const [viewMode, setViewMode] = useState<'calendar' | 'suggestions'>('calendar')
  const [form, setForm] = useState<FormState | null>(null)
  const [editingEvent, setEditingEvent] = useState<AdminCalendarEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminCalendarEvent | null>(null)

  const { data: events = [], isLoading } = useAdminEvents({
    year,
    month,
    category: categoryFilter === 'ALL' ? undefined : categoryFilter,
  })
  const { data: eventList = [], isLoading: isEventListLoading } = useAdminEventList({
    category: categoryFilter === 'ALL' ? undefined : categoryFilter,
    size: 200,
  })
  const { data: suggestions = [], isLoading: isSuggestionsLoading } = useEventSuggestions()

  const createMutation = useCreateEvent()
  const updateMutation = useUpdateEvent()
  const deleteMutation = useDeleteEvent()
  const visibilityMutation = useUpdateEventVisibility()

  const goPrev = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const goNext = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }

  const openCreate = (dateStr: string) => {
    setError(null)
    setEditingEvent(null)
    setForm(emptyForm(dateStr))
  }

  const openEdit = (e: AdminCalendarEvent) => {
    setError(null)
    setEditingEvent(e)
    setForm({
      id: e.id,
      title: e.title,
      category: e.category,
      startDate: e.startDate,
      endDate: e.endDate ?? '',
      linkUrl: e.linkUrl ?? '',
      description: e.description ?? '',
      isVisible: e.isVisible,
    })
  }

  const patch = (p: Partial<FormState>) => setForm((f) => (f ? { ...f, ...p } : f))

  const handleSave = async () => {
    if (!form) return
    if (!form.title.trim()) { setError('이벤트명을 입력해주세요.'); return }
    if (!form.startDate) { setError('시작일을 선택해주세요.'); return }
    if (form.endDate && form.endDate < form.startDate) {
      setError('종료일은 시작일 이후여야 합니다.'); return
    }

    const payload: EventPayload = {
      title: form.title.trim(),
      category: form.category,
      startDate: form.startDate,
      endDate: form.endDate || null,
      linkUrl: form.linkUrl.trim() || null,
      description: form.description.trim() || null,
      isVisible: form.isVisible,
    }

    try {
      if (form.id) {
        await updateMutation.mutateAsync({ id: form.id, data: payload })
        showToast('이벤트가 수정되었습니다.', 'success')
      } else {
        await createMutation.mutateAsync(payload)
        showToast('이벤트가 등록되었습니다.', 'success')
      }
      setForm(null)
    } catch {
      setError('저장 중 오류가 발생했습니다. 입력값을 확인해주세요.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      showToast('이벤트가 삭제되었습니다.', 'success')
      setDeleteTarget(null)
      setForm(null)
    } catch {
      showToast('삭제 중 오류가 발생했습니다.', 'error')
    }
  }

  const handleToggleVisibility = async (event: AdminCalendarEvent) => {
    try {
      await visibilityMutation.mutateAsync({ id: event.id, isVisible: !event.isVisible })
      showToast(event.isVisible ? '이벤트가 미노출로 변경되었습니다.' : '이벤트가 노출로 변경되었습니다.', 'success')
    } catch {
      showToast('노출 상태 변경 중 오류가 발생했습니다.', 'error')
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-8">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">이벤트 달력</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {viewMode === 'calendar'
              ? '날짜 칸을 클릭해 이벤트를 등록하고, 막대를 클릭해 수정·삭제합니다.'
              : '사용자가 제보한 이벤트입니다. 행을 클릭해 내용을 수정하고 공개로 전환(승인)합니다.'}
          </p>
        </div>
        {viewMode === 'calendar' && (
          <Button onClick={() => openCreate(`${year}-${String(month).padStart(2, '0')}-01`)}>
            + 이벤트 등록
          </Button>
        )}
      </div>

      {/* 뷰 전환 탭 */}
      <div className="flex items-center gap-1 mb-5 border-b border-neutral-200">
        {([
          ['calendar', '달력'],
          ['suggestions', '사용자 제보'],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={[
              'relative h-10 px-4 text-sm font-medium transition-colors',
              viewMode === mode
                ? 'text-primary-800 border-b-2 border-primary-800 -mb-px'
                : 'text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {label}
            {mode === 'suggestions' && suggestions.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[11px] font-semibold align-middle">
                {suggestions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {viewMode === 'calendar' && (
      <>
      {/* 월 네비 + 카테고리 필터 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goPrev}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50">‹</button>
          <div className="min-w-[110px] text-center text-lg font-semibold text-neutral-900 tabular-nums">
            {year}년 {month}월
          </div>
          <button type="button" onClick={goNext}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50">›</button>
          <button type="button" onClick={goToday}
            className="ml-1 h-9 px-3 text-sm font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50">오늘</button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', ...CATEGORY_ORDER] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={[
                'inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-full border transition-colors',
                categoryFilter === c
                  ? 'bg-primary-800 text-white border-primary-800'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50',
              ].join(' ')}
            >
              {c !== 'ALL' && (
                <span className={`w-2.5 h-2.5 rounded-sm ${CATEGORY_META[c].dot} ${categoryFilter === c ? 'ring-1 ring-white' : ''}`} />
              )}
              {c === 'ALL' ? '전체' : CATEGORY_META[c].koLabel}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400 text-sm">불러오는 중...</div>
      ) : (
        <EventCalendarGrid
          year={year}
          month={month}
          events={events}
          weekdayLabels={WEEKDAYS}
          onDayClick={openCreate}
          onEventClick={openEdit}
        />
      )}

      <p className="mt-3 text-xs text-neutral-400">🔒 표시는 비공개(사용자에게 노출되지 않음) 이벤트입니다.</p>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">등록된 이벤트 목록</h2>
            <p className="text-xs text-neutral-500 mt-1">
              기간 시작일 최신순으로 최대 200건을 표시합니다. 수정, 삭제, 노출 상태를 바로 관리할 수 있습니다.
            </p>
          </div>
          <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
            {eventList.length}건
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-left">
                <th className="px-4 py-3 font-medium min-w-[240px]">이벤트명</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">카테고리</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">기간</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">출처</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">등록일</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">노출</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isEventListLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                    불러오는 중...
                  </td>
                </tr>
              ) : eventList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                    등록된 이벤트가 없습니다.
                  </td>
                </tr>
              ) : (
                eventList.map((event) => (
                  <tr key={event.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(event)}
                        className="text-left font-medium text-neutral-900 hover:text-primary-800 hover:underline line-clamp-1"
                      >
                        {event.title}
                      </button>
                      {event.description && (
                        <p className="mt-1 text-xs text-neutral-400 line-clamp-1">
                          {event.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_META[event.category].chip}`}>
                        {CATEGORY_META[event.category].koLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600 tabular-nums">
                      {fmtPeriod(event)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-neutral-600">
                        {event.source === 'USER' ? '사용자 제보' : '관리자'}
                      </span>
                      {event.source === 'USER' && event.createdByNickname && (
                        <span className="ml-1 text-neutral-400">({event.createdByNickname})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-500 tabular-nums">
                      {fmtCreatedAt(event.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={event.isVisible}
                          disabled={visibilityMutation.isPending}
                          onClick={() => handleToggleVisibility(event)}
                          className={[
                            'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full',
                            'border-2 border-transparent transition-colors duration-200',
                            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                            'disabled:cursor-not-allowed disabled:opacity-60',
                            event.isVisible ? 'bg-primary-800' : 'bg-neutral-300',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
                              'transform transition-transform duration-200',
                              event.isVisible ? 'translate-x-4' : 'translate-x-0',
                            ].join(' ')}
                          />
                        </button>
                        <span className={event.isVisible ? 'text-emerald-700 text-xs font-medium' : 'text-neutral-500 text-xs font-medium'}>
                          {event.isVisible ? '노출' : '미노출'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(event)}>
                          수정
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(event)}>
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {viewMode === 'suggestions' && (
        isSuggestionsLoading ? (
          <div className="flex items-center justify-center py-20 text-neutral-400 text-sm">불러오는 중...</div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 text-sm">
            <span className="text-3xl mb-2">📭</span>
            접수된 사용자 제보가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 text-left">
                  <th className="px-4 py-3 font-medium">제보자</th>
                  <th className="px-4 py-3 font-medium">이벤트명</th>
                  <th className="px-4 py-3 font-medium">카테고리</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">기간</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 font-medium whitespace-nowrap">제보일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {suggestions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openEdit(s)}
                    className="cursor-pointer hover:bg-amber-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-neutral-800">{s.createdByNickname ?? '알 수 없음'}</span>
                      {s.createdById != null && (
                        <span className="text-neutral-400"> #{s.createdById}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-800 max-w-[260px] truncate">{s.title}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_META[s.category].chip}`}>
                        {CATEGORY_META[s.category].koLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600 tabular-nums">
                      {fmtDate(s.startDate)}
                      {s.endDate && s.endDate !== s.startDate ? ` ~ ${fmtDate(s.endDate)}` : ''}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {s.isVisible ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-medium">● 공개</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-neutral-500 text-xs font-medium">🔒 검토 대기</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-400 tabular-nums">
                      {s.createdAt?.slice(0, 10).replace(/-/g, '.')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* 등록/수정 모달 */}
      <Modal
        open={form != null}
        onClose={() => setForm(null)}
        title={form?.id ? '이벤트 수정' : '이벤트 등록'}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {form?.id && (
                <Button
                  variant="danger"
                  onClick={() => {
                    if (editingEvent) setDeleteTarget(editingEvent)
                  }}
                >
                  삭제
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setForm(null)}>취소</Button>
              <Button isLoading={isSaving} onClick={handleSave}>저장</Button>
            </div>
          </div>
        }
      >
        {form && (
          <div className="space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
            )}

            {editingEvent?.source === 'USER' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-800 text-sm">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-xs font-semibold">
                  사용자 제보
                </span>
                <span>
                  제보자: {editingEvent.createdByNickname ?? '알 수 없음'}
                  {editingEvent.createdById != null && (
                    <span className="text-amber-600"> #{editingEvent.createdById}</span>
                  )}
                  {' · 공개로 전환하면 제보자에게 점수가 지급됩니다.'}
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">이벤트명 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.title}
                maxLength={200}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="예) OO 위스키 출시, OO 막걸리 페스티벌"
                className="w-full h-10 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">카테고리 <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ORDER.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => patch({ category: c })}
                    className={[
                      'inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-lg border transition-colors',
                      form.category === c
                        ? `${CATEGORY_META[c].bar} border-transparent`
                        : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50',
                    ].join(' ')}
                  >
                    <span className={`w-2.5 h-2.5 rounded-sm ${form.category === c ? 'bg-white/80' : CATEGORY_META[c].dot}`} />
                    {CATEGORY_META[c].koLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">시작일 <span className="text-red-500">*</span></label>
                <DateInput
                  value={form.startDate}
                  onChange={(e) => patch({ startDate: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  종료일 <span className="text-neutral-400 font-normal">(선택 · 비우면 하루)</span>
                </label>
                <DateInput
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => patch({ endDate: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">링크 <span className="text-neutral-400 font-normal">(선택)</span></label>
              <input
                type="url"
                value={form.linkUrl}
                maxLength={500}
                onChange={(e) => patch({ linkUrl: e.target.value })}
                placeholder="https://..."
                className="w-full h-10 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">설명 <span className="text-neutral-400 font-normal">(선택)</span></label>
              <textarea
                value={form.description}
                maxLength={2000}
                rows={4}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="이벤트 내용을 입력하세요."
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isVisible}
                onChange={(e) => patch({ isVisible: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-primary-800 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-700">사용자에게 공개</span>
            </label>
          </div>
        )}
      </Modal>

      {/* 삭제 확인 */}
      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="이벤트 삭제"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="danger" isLoading={deleteMutation.isPending} onClick={handleDelete}>삭제</Button>
          </>
        }
      >
        <p className="text-sm text-neutral-700">
          <span className="font-medium">"{deleteTarget?.title}"</span> 이벤트를 삭제하시겠습니까?
          <br />
          <span className="text-neutral-500 text-xs mt-1 block">삭제 후 복구할 수 없습니다.</span>
        </p>
      </Modal>
    </div>
  )
}
