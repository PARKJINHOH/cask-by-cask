import { useState } from 'react'
import {
  useAdminEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '@/domain/event/hooks/useAdminEvents'
import EventCalendarGrid from '@/domain/event/components/EventCalendarGrid'
import { CATEGORY_META, CATEGORY_ORDER } from '@/domain/event/constants/eventCategory'
import type {
  AdminCalendarEvent,
  EventCategory,
  EventPayload,
} from '@/domain/event/types/event.types'
import Button from '@/shared/components/Button'
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

export default function AdminEventCalendarPage() {
  const { toasts, showToast, removeToast } = useToast()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'ALL'>('ALL')

  const [form, setForm] = useState<FormState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminCalendarEvent | null>(null)

  const { data: events = [], isLoading } = useAdminEvents({
    year,
    month,
    category: categoryFilter === 'ALL' ? undefined : categoryFilter,
  })

  const createMutation = useCreateEvent()
  const updateMutation = useUpdateEvent()
  const deleteMutation = useDeleteEvent()

  const goPrev = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const goNext = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }

  const openCreate = (dateStr: string) => {
    setError(null)
    setForm(emptyForm(dateStr))
  }

  const openEdit = (e: AdminCalendarEvent) => {
    setError(null)
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

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-8">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">이벤트 달력</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            날짜 칸을 클릭해 이벤트를 등록하고, 막대를 클릭해 수정·삭제합니다.
          </p>
        </div>
        <Button onClick={() => openCreate(`${year}-${String(month).padStart(2, '0')}-01`)}>
          + 이벤트 등록
        </Button>
      </div>

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
                    const target = events.find((e) => e.id === form.id)
                    if (target) setDeleteTarget(target)
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
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => patch({ startDate: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  종료일 <span className="text-neutral-400 font-normal">(선택 · 비우면 하루)</span>
                </label>
                <input
                  type="date"
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
