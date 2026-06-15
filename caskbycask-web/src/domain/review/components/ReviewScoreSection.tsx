import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ScoreInput from '@/shared/components/ScoreInput'
import type { AromaCategory, AromaNotes } from '../constants/whiskyAromas'

// ── 아로마 카테고리 아이템 그리드 ─────────────────────────────────

interface AromaItemsProps {
  categories: AromaCategory[]
  selectedIds: string[]
  onToggleId: (id: string) => void
  isEn: boolean
}

function AromaItemGrid({ categories, selectedIds, onToggleId, isEn }: AromaItemsProps) {
  if (categories.length === 0) return null
  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <div key={category.id}>
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
            {isEn ? category.en : category.ko}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {category.items.map((item) => {
              const isSelected = selectedIds.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggleId(item.id)}
                  className={[
                    'flex items-center gap-2 px-2.5 py-2 rounded-xl border w-[7.5rem] text-left',
                    'transition-all active:scale-95 touch-manipulation select-none',
                    isSelected
                      ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300'
                      : 'border-neutral-100 bg-white hover:border-amber-200 hover:bg-amber-50/30',
                  ].join(' ')}
                >
                  <span className="text-xl leading-none flex-shrink-0">{item.icon}</span>
                  <span className="flex flex-col min-w-0">
                    <span className={[
                      'text-[13px] font-semibold leading-tight truncate',
                      isSelected ? 'text-amber-700' : 'text-neutral-700',
                    ].join(' ')}>
                      {item.ko}
                    </span>
                    <span className="text-[11px] text-neutral-400 leading-tight truncate">
                      {item.en}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── ReviewScoreSection ────────────────────────────────────────────

interface ReviewScoreSectionProps {
  label: string
  score: number
  onScoreChange: (v: number) => void
  note: string
  onNoteChange: (v: string) => void
  notePlaceholder?: string
  noteError?: string
  scoreError?: string
  aromaCategories?: AromaCategory[]
  aromaWheelTitle?: string
  aromaNote: AromaNotes
  onAromaNoteChange: (v: AromaNotes) => void
}

export default function ReviewScoreSection({
  label,
  score,
  onScoreChange,
  note,
  onNoteChange,
  notePlaceholder,
  noteError,
  scoreError,
  aromaCategories,
  aromaWheelTitle,
  aromaNote,
  onAromaNoteChange,
}: ReviewScoreSectionProps) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const [mobileAromaOpen, setMobileAromaOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const hasAroma = !!aromaCategories && aromaCategories.length > 0
  const totalSelected = aromaNote.ids.length + aromaNote.custom.length

  // 아로마 맵 (칩 표시용)
  const aromaMap = useMemo(() => {
    if (!aromaCategories) return new Map()
    return new Map(aromaCategories.flatMap((c) => c.items).map((item) => [item.id, item]))
  }, [aromaCategories])

  // 검색 필터링
  const term = search.trim().toLowerCase()
  const filteredCategories = useMemo(() => {
    if (!term || !aromaCategories) return aromaCategories ?? []
    return aromaCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.ko.toLowerCase().includes(term) ||
            item.en.toLowerCase().includes(term),
        ),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [aromaCategories, term])

  const noWheelMatch = !!term && filteredCategories.length === 0
  const canAddDirect = !!term && !aromaNote.custom.includes(search.trim())

  const toggleId = (id: string) => {
    const ids = aromaNote.ids.includes(id)
      ? aromaNote.ids.filter((i) => i !== id)
      : [...aromaNote.ids, id]
    onAromaNoteChange({ ...aromaNote, ids })
  }

  const addCustom = (val: string) => {
    const trimmed = val.trim()
    if (!trimmed || aromaNote.custom.includes(trimmed)) return
    onAromaNoteChange({ ...aromaNote, custom: [...aromaNote.custom, trimmed] })
    setSearch('')
    searchRef.current?.focus()
  }

  const removeId = (id: string) =>
    onAromaNoteChange({ ...aromaNote, ids: aromaNote.ids.filter((i) => i !== id) })
  const removeCustom = (c: string) =>
    onAromaNoteChange({ ...aromaNote, custom: aromaNote.custom.filter((x) => x !== c) })

  // ── 검색 입력 UI (PC·모바일 공용) ──────────────────────────────
  const SearchInput = (
    <div className="flex gap-1.5 flex-1 min-w-0">
      <div className="relative flex-1 min-w-0">
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (noWheelMatch && canAddDirect) addCustom(search) }
          }}
          placeholder={t('review.aromaSearchPlaceholder')}
          maxLength={30}
          className="w-full px-2.5 py-1.5 pr-6 text-xs border border-neutral-400 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder:text-neutral-300 bg-white"
        />
        {search && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { setSearch(''); searchRef.current?.focus() }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400
              hover:text-neutral-600 transition-colors leading-none text-sm"
          >
            ×
          </button>
        )}
      </div>
      {noWheelMatch && canAddDirect && (
        <button
          type="button"
          onClick={() => addCustom(search)}
          className="px-2.5 py-1.5 text-xs rounded-lg bg-neutral-800 text-white
            transition-all active:scale-95 whitespace-nowrap flex-shrink-0"
        >
          {t('review.aromaAdd')}
        </button>
      )}
    </div>
  )

  return (
    <div className="bg-neutral-50 rounded-2xl p-4">
      <div className={hasAroma ? 'md:grid md:grid-cols-[34%_66%] md:gap-6' : ''}>

        {/* ── 좌측: 점수 슬라이더 + 모바일 아로마 + 선택 칩 + 노트 ── */}
        <div className={['space-y-3', hasAroma ? 'md:border-r md:border-neutral-200 md:pr-6' : ''].join(' ')}>
          <ScoreInput label={label} value={score} onChange={onScoreChange} />
          {scoreError && <p className="text-xs text-red-500">{scoreError}</p>}

          {/* 모바일 전용: 토글 버튼 + 인라인 패널 */}
          {hasAroma && (
            <div className="md:hidden space-y-2">
              <button
                type="button"
                onClick={() => setMobileAromaOpen((o) => !o)}
                className={[
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all touch-manipulation select-none',
                  mobileAromaOpen
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300',
                ].join(' ')}
              >
                <span className="flex items-center gap-2 font-medium">
                  🌹 {aromaWheelTitle ?? t('review.selectAroma')}
                  {totalSelected > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold leading-none">
                      {totalSelected}
                    </span>
                  )}
                </span>
                <span className="text-neutral-400 text-xs">{mobileAromaOpen ? '▲' : '▼'}</span>
              </button>

              {mobileAromaOpen && (
                <div className="border border-amber-200 rounded-xl bg-white overflow-hidden">
                  <div className="p-3 max-h-[50vh] overflow-y-auto space-y-3">
                    {/* 모바일 검색 입력 */}
                    {SearchInput}

                    {/* 기타 칩 */}
                    {aromaNote.custom.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-neutral-100">
                        {aromaNote.custom.map((c) => (
                          <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                            bg-neutral-100 border border-neutral-200 text-[11px] text-neutral-600">
                            ✏️ {c}
                            <button type="button" onClick={() => removeCustom(c)}
                              className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 아이템 그리드 */}
                    <AromaItemGrid
                      categories={filteredCategories}
                      selectedIds={aromaNote.ids}
                      onToggleId={toggleId}
                      isEn={isEn}
                    />

                    {noWheelMatch && (
                      <p className="text-xs text-neutral-400 text-center py-2">
                        "{search.trim()}" — {t('review.aromaAdd')} 버튼으로 직접 추가
                      </p>
                    )}
                  </div>
                  <div className="border-t border-amber-100 px-3 py-2 bg-amber-50/50 flex justify-end">
                    <button type="button" onClick={() => setMobileAromaOpen(false)}
                      className="text-xs text-amber-700 font-medium hover:text-amber-900 transition-colors">
                      {t('review.aromaDone')} ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 선택된 아로마 칩 — PC·모바일 공통 (textarea 위) */}
          {hasAroma && totalSelected > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {aromaNote.ids.map((id) => {
                const item = aromaMap.get(id)
                if (!item) return null
                return (
                  <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
                    {item.icon} {isEn ? item.en : item.ko}
                    <button type="button" onClick={() => removeId(id)}
                      className="ml-0.5 opacity-60 hover:opacity-100 leading-none">×</button>
                  </span>
                )
              })}
              {aromaNote.custom.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  bg-neutral-100 border border-neutral-200 text-[11px] text-neutral-600">
                  ✏️ {c}
                  <button type="button" onClick={() => removeCustom(c)}
                    className="ml-0.5 opacity-60 hover:opacity-100 leading-none">×</button>
                </span>
              ))}
            </div>
          )}

          {/* 노트 텍스트에어리어 */}
          <div>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder={notePlaceholder}
              maxLength={200}
              rows={9}
              className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-xl resize-none
                focus:outline-none focus:ring-2 focus:ring-primary-400
                placeholder:text-neutral-300 leading-relaxed"
            />
            <div className="flex items-start justify-between mt-0.5">
              <p className="text-xs text-red-500 min-h-[1rem]">{noteError ?? ''}</p>
              <p className="text-[10px] text-neutral-300 tabular-nums">{note.length}/200</p>
            </div>
          </div>
        </div>

        {/* ── 우측: 아로마 휠 (PC 전용) ── */}
        {hasAroma && (
          <div className="hidden md:flex md:flex-col md:pl-1 min-w-0">
            {/* 타이틀 + 검색/직접 입력 */}
            <div className="flex items-center gap-4 mb-3 min-w-0">
              <span className="text-sm font-semibold text-neutral-700 whitespace-nowrap flex-shrink-0">
                🌹 {aromaWheelTitle ?? t('review.aromaWheel')}
              </span>
              <div className="w-52 flex-shrink-0">
                {SearchInput}
              </div>
            </div>

            {/* 기타(직접 입력) 칩 */}
            {aromaNote.custom.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-neutral-100">
                {aromaNote.custom.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                    bg-neutral-100 border border-neutral-200 text-xs text-neutral-700">
                    ✏️ {c}
                    <button type="button" onClick={() => removeCustom(c)}
                      className="ml-0.5 text-neutral-400 hover:text-red-500 transition-colors leading-none">×</button>
                  </span>
                ))}
              </div>
            )}

            {/* 검색 결과 없음 메시지 */}
            {noWheelMatch && (
              <p className="text-xs text-neutral-400 text-center py-3">
                "{search.trim()}" {t('review.aromaNoMatch')} →{' '}
                <button
                  type="button"
                  onClick={() => addCustom(search)}
                  className="text-neutral-700 font-medium underline underline-offset-2 hover:text-neutral-900"
                >
                  {t('review.aromaAdd')}
                </button>
              </p>
            )}

            {/* 아이템 그리드 */}
            <div className="flex-1 overflow-y-auto pr-1">
              <AromaItemGrid
                categories={filteredCategories}
                selectedIds={aromaNote.ids}
                onToggleId={toggleId}
                isEn={isEn}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
