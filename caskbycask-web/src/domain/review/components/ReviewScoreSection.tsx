import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ScoreInput from '@/shared/components/ScoreInput'
import { RequiredMark } from '@/shared/components/FormFieldLabel'
import {
  formatAromaId,
  syncProfileAfterAromaRemoval,
  type AromaNotes,
} from '../utils/aroma'
import type { AromaProfile, AromaProfilePhase } from '../types/review.types'
import { REVIEW_TEXT_MAX_LENGTH } from '../constants/reviewLimits'
import AromaProfileControl from './AromaProfileControl'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

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
  /**
   * 테이스팅 노트 칸의 오류 앵커 이름(`noseNote` 등).
   *
   * 이 칸은 react-hook-form 에 register 되지 않고 `setValue` 로만 값을 넣어서
   * RHF 의 `shouldFocusError` 가 잡을 ref 가 없다. 검증에 걸려도 화면이 그대로라
   * 제출이 먹히지 않는 것처럼 보이므로, `focusFirstError` 가 찾을 표식을 직접 단다.
   */
  noteFieldName?: string
  showAroma?: boolean
  aromaWheelTitle?: string
  aromaNote: AromaNotes
  onAromaNoteChange: (v: AromaNotes) => void
  profileEnabled?: boolean
  profilePhase?: AromaProfilePhase
  aromaProfile?: AromaProfile
  onAromaProfileChange?: (profile: AromaProfile | null) => void
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
  noteFieldName,
  showAroma,
  aromaWheelTitle,
  aromaNote,
  onAromaNoteChange,
  profileEnabled,
  profilePhase,
  aromaProfile,
  onAromaProfileChange,
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

  const removeAroma = (
    aromaType: 'ID' | 'CUSTOM',
    aromaKey: string,
    next: AromaNotes,
  ) => {
    const synced = syncProfileAfterAromaRemoval(aromaProfile, { aromaType, aromaKey })
    if (synced === null && !window.confirm(t('review.aromaProfile.removeAxisConfirm'))) return
    onAromaNoteChange(next)
    if (synced !== undefined && synced !== aromaProfile) onAromaProfileChange?.(synced)
  }

  const removeId = (id: string) => removeAroma(
    'ID',
    id,
    { ...aromaNote, ids: aromaNote.ids.filter((item) => item !== id) },
  )
  const removeCustom = (value: string) => removeAroma(
    'CUSTOM',
    value,
    { ...aromaNote, custom: aromaNote.custom.filter((item) => item !== value) },
  )

  return (
    <div className="bg-neutral-50 rounded-2xl p-4 space-y-4">
      {/* 점수 입력 */}
      <div>
        <ScoreInput label={label} value={score} onChange={onScoreChange} required />
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

          {profileEnabled && profilePhase && onAromaProfileChange && (
            <AromaProfileControl
              phase={profilePhase}
              aromaNotes={aromaNote}
              profile={aromaProfile}
              onChange={onAromaProfileChange}
            />
          )}
        </div>
      )}

      {/* 테이스팅 노트 작성 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">
          {t('review.tastingNote')}
          <RequiredMark />
        </label>
        <AutoGrowTextarea
          required
          aria-required="true"
          data-field={noteFieldName}
          aria-invalid={noteError ? true : undefined}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={notePlaceholder}
          maxLength={REVIEW_TEXT_MAX_LENGTH}
          rows={5}
          className={`w-full px-3.5 py-2.5 text-sm border rounded-xl
            focus:outline-none focus:ring-2 focus:ring-primary-400
            placeholder:text-neutral-350 leading-relaxed bg-white ${
            noteError ? 'border-red-400' : 'border-neutral-300'
          }`}
        />
        {/* 글자수는 입력칸 우측 하단에 붙는다(AutoGrowTextarea) — 여기서는 오류만 알린다 */}
        <p className="mt-0.5 text-xs text-red-500 min-h-[1.25rem]">{noteError ?? ''}</p>
      </div>
    </div>
  )
}
