import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ScoreInput from '@/shared/components/ScoreInput'
import { WHISKY_AROMA_CATEGORIES, WHISKY_AROMA_MAP } from '../constants/whiskyAromas'
import type { AromaNotes } from '../constants/whiskyAromas'

// ── 아로마 휠 콘텐츠 (모바일 패널 + PC 우측 컬럼 공용) ────────────

interface AromaContentProps {
  aromaNotes: AromaNotes
  onAromaNoteChange: (v: AromaNotes) => void
  isEn: boolean
  compact?: boolean
}

function AromaWheelContent({ aromaNotes, onAromaNoteChange, isEn, compact }: AromaContentProps) {
  const { t } = useTranslation()
  const [customInput, setCustomInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const chipW = compact ? 'w-[3.6rem]' : 'w-[4rem]'

  const toggleId = (id: string) => {
    const ids = aromaNotes.ids.includes(id)
      ? aromaNotes.ids.filter((i) => i !== id)
      : [...aromaNotes.ids, id]
    onAromaNoteChange({ ...aromaNotes, ids })
  }

  const addCustom = () => {
    const val = customInput.trim()
    if (!val || aromaNotes.custom.includes(val)) return
    onAromaNoteChange({ ...aromaNotes, custom: [...aromaNotes.custom, val] })
    setCustomInput('')
    inputRef.current?.focus()
  }

  const removeCustom = (c: string) => {
    onAromaNoteChange({ ...aromaNotes, custom: aromaNotes.custom.filter((x) => x !== c) })
  }

  return (
    <div className="space-y-3">
      {/* 카테고리별 칩 */}
      {WHISKY_AROMA_CATEGORIES.map((category) => (
        <div key={category.id}>
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
            {isEn ? category.en : category.ko}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {category.items.map((item) => {
              const isSelected = aromaNotes.ids.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleId(item.id)}
                  className={[
                    'flex flex-col items-center justify-center py-1.5 rounded-xl border',
                    'transition-all active:scale-95 touch-manipulation select-none',
                    chipW,
                    isSelected
                      ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300'
                      : 'border-neutral-100 bg-white hover:border-amber-200 hover:bg-amber-50/30',
                  ].join(' ')}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span className={[
                    'text-[10px] font-medium mt-0.5 leading-tight text-center',
                    isSelected ? 'text-amber-700' : 'text-neutral-700',
                  ].join(' ')}>
                    {item.ko}
                  </span>
                  <span className="text-[9px] text-neutral-400 leading-tight text-center">
                    {item.en}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* 기타 (직접 입력) */}
      <div className="border-t border-neutral-100 pt-3 space-y-2">
        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
          {t('review.aromaCustom')}
          <span className="normal-case font-normal ml-1 text-neutral-300">
            ({t('review.aromaCustomHint')})
          </span>
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
            placeholder={t('review.aromaCustomPlaceholder')}
            maxLength={30}
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-neutral-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder:text-neutral-300"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="px-3 py-2 text-sm rounded-lg bg-neutral-800 text-white
              disabled:opacity-30 transition-opacity touch-manipulation active:scale-95 whitespace-nowrap"
          >
            {t('review.aromaAdd')}
          </button>
        </div>
        {aromaNotes.custom.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {aromaNotes.custom.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                bg-neutral-100 border border-neutral-200 text-xs text-neutral-700">
                ✏️ {c}
                <button
                  type="button"
                  onClick={() => removeCustom(c)}
                  className="ml-0.5 text-neutral-400 hover:text-red-500 transition-colors leading-none"
                >×</button>
              </span>
            ))}
          </div>
        )}
      </div>
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
  isWhisky?: boolean
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
  isWhisky = false,
  aromaNote,
  onAromaNoteChange,
}: ReviewScoreSectionProps) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const [mobileAromaOpen, setMobileAromaOpen] = useState(false)

  const totalSelected = aromaNote.ids.length + aromaNote.custom.length

  const removeId = (id: string) =>
    onAromaNoteChange({ ...aromaNote, ids: aromaNote.ids.filter((i) => i !== id) })
  const removeCustom = (c: string) =>
    onAromaNoteChange({ ...aromaNote, custom: aromaNote.custom.filter((x) => x !== c) })

  return (
    <div className="bg-neutral-50 rounded-2xl p-4">
      {/*
       * PC: 좌(점수+노트) / 우(아로마 휠) 2컬럼
       * 모바일: 단일 컬럼, 아로마 토글
       */}
      <div className={isWhisky ? 'md:grid md:grid-cols-[45%_55%] md:gap-5' : ''}>

        {/* ── 좌측: 점수 슬라이더 + (모바일 아로마) + 노트 ── */}
        <div className={['space-y-3', isWhisky ? 'md:border-r md:border-neutral-200 md:pr-5' : ''].join(' ')}>
          <ScoreInput label={label} value={score} onChange={onScoreChange} />
          {scoreError && <p className="text-xs text-red-500">{scoreError}</p>}

          {/* 모바일 전용: 아로마 토글 */}
          {isWhisky && (
            <div className="md:hidden space-y-2">

              {/* 토글 버튼 */}
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
                  🌹 {t('review.selectAroma')}
                  {totalSelected > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold leading-none">
                      {totalSelected}
                    </span>
                  )}
                </span>
                <span className="text-neutral-400 text-xs">{mobileAromaOpen ? '▲' : '▼'}</span>
              </button>

              {/* 모바일 인라인 패널 */}
              {mobileAromaOpen && (
                <div className="border border-amber-200 rounded-xl bg-white overflow-hidden">
                  <div className="p-3 max-h-[50vh] overflow-y-auto">
                    {/* 선택된 항목 요약 (패널 상단) */}
                    {totalSelected > 0 && (
                      <div className="flex flex-wrap gap-1.5 pb-2 mb-2 border-b border-neutral-100">
                        {aromaNote.ids.map((id) => {
                          const item = WHISKY_AROMA_MAP.get(id)
                          if (!item) return null
                          return (
                            <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-[11px] text-amber-700">
                              {item.icon} {isEn ? item.en : item.ko}
                              <button type="button" onClick={() => removeId(id)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                            </span>
                          )
                        })}
                        {aromaNote.custom.map((c) => (
                          <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-[11px] text-neutral-600">
                            ✏️ {c}
                            <button type="button" onClick={() => removeCustom(c)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <AromaWheelContent
                      aromaNotes={aromaNote}
                      onAromaNoteChange={onAromaNoteChange}
                      isEn={isEn}
                    />
                  </div>
                  <div className="border-t border-amber-100 px-3 py-2 bg-amber-50/50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setMobileAromaOpen(false)}
                      className="text-xs text-amber-700 font-medium hover:text-amber-900 transition-colors"
                    >
                      {t('review.aromaDone')} ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 선택된 아로마 칩 — textarea 바로 위 (PC + 모바일 공통) */}
          {isWhisky && totalSelected > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {aromaNote.ids.map((id) => {
                const item = WHISKY_AROMA_MAP.get(id)
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
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl resize-none
                focus:outline-none focus:ring-2 focus:ring-primary-400
                placeholder:text-neutral-300 leading-relaxed"
            />
            <div className="flex items-start justify-between mt-0.5">
              <p className="text-xs text-red-500 min-h-[1rem]">{noteError ?? ''}</p>
              <p className="text-[10px] text-neutral-300 tabular-nums">{note.length}/200</p>
            </div>
          </div>
        </div>

        {/* ── 우측: 아로마 휠 (PC 전용, 항상 표시) ── */}
        {isWhisky && (
          <div className="hidden md:flex md:flex-col md:pl-1">
            {/* 헤더 */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-sm font-semibold text-neutral-700">
                🌹 {t('review.aromaWheel')}
              </span>
            </div>

            {/* 스크롤 가능한 아로마 콘텐츠 */}
            <div className="flex-1 overflow-y-auto pr-1 max-h-[320px]
              scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent">
              <AromaWheelContent
                aromaNotes={aromaNote}
                onAromaNoteChange={onAromaNoteChange}
                isEn={isEn}
                compact
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
