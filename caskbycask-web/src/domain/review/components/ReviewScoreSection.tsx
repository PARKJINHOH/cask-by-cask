import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ScoreInput from '@/shared/components/ScoreInput'
import type { AromaNotes } from '../utils/aroma'

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
  showAroma?: boolean
  aromaWheelTitle?: string
  aromaNote: AromaNotes
  onAromaNoteChange: (v: AromaNotes) => void
}

function formatAromaId(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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
  showAroma,
  aromaWheelTitle,
  aromaNote,
  onAromaNoteChange,
}: ReviewScoreSectionProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const hasAroma = !!showAroma
  const totalSelected = aromaNote.ids.length + aromaNote.custom.length

  const addCustom = (val: string) => {
    const trimmed = val.trim()
    if (!trimmed) return

    if (aromaNote.custom.includes(trimmed) || aromaNote.ids.includes(trimmed)) {
      setSearch('')
      return
    }
    onAromaNoteChange({
      ...aromaNote,
      custom: [...aromaNote.custom, trimmed],
    })
    setSearch('')
    searchRef.current?.focus()
  }

  const removeId = (id: string) =>
    onAromaNoteChange({ ...aromaNote, ids: aromaNote.ids.filter((i) => i !== id) })
  const removeCustom = (c: string) =>
    onAromaNoteChange({ ...aromaNote, custom: aromaNote.custom.filter((x) => x !== c) })

  return (
    <div className="bg-neutral-50 rounded-2xl p-4 space-y-4">
      {/* 점수 입력 */}
      <div>
        <ScoreInput label={label} value={score} onChange={onScoreChange} />
        {scoreError && <p className="text-xs text-red-500 mt-1">{scoreError}</p>}
      </div>

      {/* 아로마 직접 입력 */}
      {hasAroma && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-800">
              🌹 {aromaWheelTitle ?? t('review.aromaWheel')}
            </span>
            {totalSelected > 0 && (
              <span className="text-xs text-neutral-400 font-medium">
                {t('review.aromaSelected', { count: totalSelected })}
              </span>
            )}
          </div>

          {/* 선택된 아로마 칩 */}
          {totalSelected > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-white rounded-xl border border-neutral-200/60 min-h-[2.5rem] items-center">
              {aromaNote.ids.map((id) => {
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md
                      bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800"
                  >
                    <span>{formatAromaId(id)}</span>
                    <button
                      type="button"
                      onClick={() => removeId(id)}
                      className="ml-1 opacity-60 hover:opacity-100 hover:text-red-500 transition-colors text-sm font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
              {aromaNote.custom.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md
                    bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-700"
                >
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() => removeCustom(c)}
                    className="ml-1 opacity-60 hover:opacity-100 hover:text-red-500 transition-colors text-sm font-bold cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 입력창 */}
          <div className="flex gap-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (search.trim()) {
                    addCustom(search)
                  }
                }
              }}
              placeholder={t('review.aromaSearchPlaceholder')}
              maxLength={30}
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl bg-white
                focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder:text-neutral-350"
            />
            {search.trim() && (
              <button
                type="button"
                onClick={() => addCustom(search)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800
                  transition-all active:scale-95 whitespace-nowrap flex-shrink-0 cursor-pointer"
              >
                {t('review.aromaAdd')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 테이스팅 노트 작성 */}
      <div>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={notePlaceholder}
          maxLength={200}
          rows={5}
          className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl resize-none
            focus:outline-none focus:ring-2 focus:ring-primary-400
            placeholder:text-neutral-350 leading-relaxed bg-white"
        />
        <div className="flex items-start justify-between mt-0.5">
          <p className="text-xs text-red-500 min-h-[1.25rem]">{noteError ?? ''}</p>
          <p className="text-[10px] text-neutral-400 tabular-nums">{note.length}/200</p>
        </div>
      </div>
    </div>
  )
}
