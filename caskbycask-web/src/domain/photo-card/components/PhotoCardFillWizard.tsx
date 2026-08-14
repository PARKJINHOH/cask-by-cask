import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhotoCardEditor } from '../hooks/usePhotoCardEditor'
import type { PhotoCardBinding } from '../types/photoCard.types'
import { describeLayer } from '../utils/layerLabel'
import { PHOTO_CARD_MAX_TEXT_LENGTH } from '../utils/layoutSchema'
import { isSpiritBinding, resolveLayerText } from '../utils/resolveBindings'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

interface Props {
  editor: PhotoCardEditor
  /** 흐름을 끝내거나 접었을 때 */
  onClose: () => void
  /** 주류가 들어가는 자리에서 검색창을 열어 준다 */
  onOpenSpiritPicker: () => void
}

/** 이 자리에 넣을 값이 사용자가 직접 적는 것인가 — 그렇다면 레이어가 아니라 입력값 쪽에 적는다. */
const USER_FIELD: Partial<Record<PhotoCardBinding, 'place' | 'memo' | 'date'>> = {
  USER_PLACE: 'place',
  USER_MEMO: 'memo',
  USER_DATE: 'date',
}

const isExif = (binding: PhotoCardBinding) => binding.startsWith('EXIF_')

/**
 * 템플릿이 불러온 요소를 하나씩 채우는 흐름.
 *
 * 템플릿을 고르면 카드에 빈 자리가 여럿 생기는데, 그 자리들은 캔버스에서 아무것도 그리지 않는다
 * (값이 빈 텍스트는 그리지 않는다) — 무엇을 더 적어야 카드가 완성되는지 알 길이 없다.
 * 자리마다 한 칸씩 물어보면 "이 템플릿이 무엇을 원하는지"가 그대로 드러난다.
 *
 * ── 어디에 적히는가 ──
 * 장소·메모·날짜는 <b>입력값</b>에 적는다. 템플릿을 바꿔도 따라오는 값이라, 레이어에 적어 두면
 * 다음 템플릿에서 사라진다(usePhotoCardEditor 의 이월 규칙이 입력값을 본다).
 * 나머지(EXIF·주류)는 자동으로 채워지는 자리다 — 손을 대는 순간 그 레이어를 '직접 수정함'으로
 * 바꿔 적는다. 사진이나 주류를 갈아 끼워도 적어 둔 문구가 그대로 남는다.
 *
 * ── 비워 두어도 된다 ──
 * 값이 없는 자리는 카드에 아무것도 그리지 않으므로, 넘기면 그 요소는 없는 셈이 된다.
 * 그래서 모든 단계에 '넘기기'가 있고, 적은 것이 있으면 같은 자리의 버튼이 '다음'이 된다.
 */
export default function PhotoCardFillWizard({ editor, onClose, onOpenSpiritPicker }: Props) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const { selectLayer, endGesture } = editor

  // 카드에서 보이는 순서(위 → 아래)로 묻는다. 레이어 배열 순서는 겹침 순서라 눈에 보이는 차례와 다르다.
  const steps = useMemo(() => editor.layout.layers
    .filter((layer) => layer.type === 'TEXT' && layer.visible !== false)
    .sort((a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x)),
  [editor.layout.layers])

  const total = steps.length
  const step = Math.min(index, Math.max(total - 1, 0))
  const layer = steps[step]
  const binding = layer?.binding ?? 'NONE'

  // 글자 자리가 하나도 없는 템플릿(도형만 있는 것 등)이라면 물어볼 것이 없다.
  useEffect(() => { if (total === 0) onClose() }, [total, onClose])

  // 지금 채우는 자리를 카드에서도 짚어 준다 — 줄이 여럿인 템플릿에서 어느 줄인지 알 수 있게.
  const layerId = layer?.id
  useEffect(() => { if (layerId) selectLayer(layerId) }, [layerId, selectLayer])

  if (!layer) return null

  const value = resolveLayerText(layer, editor.dataContext)
  const userField = layer.overridden ? undefined : USER_FIELD[binding]

  const write = (next: string) => {
    if (userField) {
      editor.setUserInput((current) => ({ ...current, [userField]: next }))
      return
    }
    editor.patchLayer(
      layer.id,
      // 자동 채움 자리에 적은 글은 '직접 수정함'으로 남긴다. 직접 입력 자리는 원래 그 값이 본문이다.
      binding === 'NONE' ? { text: next } : { text: next, overridden: true },
      `fill:${layer.id}`,
    )
  }

  const go = (next: number) => {
    endGesture()
    setIndex(Math.max(0, Math.min(total - 1, next)))
  }

  const placeholder = binding === 'USER_PLACE' ? t('photoCard.placePlaceholder')
    : binding === 'USER_MEMO' ? t('photoCard.memoPlaceholder')
      : t('photoCard.fillPlaceholder')

  const inputClass = 'w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-sm text-neutral-800'
  const navClass = 'flex-1 rounded-lg py-2.5 text-xs font-bold transition-colors disabled:opacity-30'

  const isLast = step >= total - 1
  const hasValue = value.trim().length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-neutral-800">{t('photoCard.fillTitle')}</h3>
          <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-neutral-500">
            {t('photoCard.fillIntro')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-50"
        >
          {t('photoCard.fillClose')}
        </button>
      </div>

      {/* 몇 개 중 몇 번째인지 — 끝이 보여야 '넘기기'를 마음 편히 누른다. */}
      <div className="flex items-center gap-2">
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-primary-600 transition-all"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
        <span className="shrink-0 font-mono text-[11px] font-semibold text-neutral-500">
          {t('photoCard.fillProgress', { current: step + 1, total })}
        </span>
      </div>

      <div>
        <label htmlFor="photo-card-fill-input" className="mb-1 block text-xs font-bold text-neutral-700">
          {/* 직접 입력 자리는 describeLayer 가 '적힌 글'을 돌려준다 — 칸 이름으로는 그 자리의 정체를 쓴다. */}
          {binding === 'NONE' ? t('photoCard.binding_NONE') : describeLayer(layer, t)}
        </label>
        {binding === 'USER_MEMO' || binding === 'NONE' ? (
          <AutoGrowTextarea
            id="photo-card-fill-input"
            rows={2}
            maxLength={PHOTO_CARD_MAX_TEXT_LENGTH}
            value={value}
            placeholder={placeholder}
            onChange={(event) => write(event.target.value)}
            onBlur={endGesture}
            className={`${inputClass}`}
          />
        ) : (
          <input
            id="photo-card-fill-input"
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(event) => write(event.target.value)}
            onBlur={endGesture}
            // 한 줄짜리 칸에서는 엔터가 곧 '다음'이다 — 자판을 띄운 채로 끝까지 갈 수 있다.
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              if (isLast) onClose()
              else go(step + 1)
            }}
            className={inputClass}
          />
        )}

        {/* 값이 어디서 왔는지 — 사진에서 읽어 온 값을 사용자가 적은 것으로 오해하지 않게. */}
        {!layer.overridden && hasValue && isExif(binding) && (
          <p className="mt-1 text-[11px] font-medium text-neutral-500">{t('photoCard.fillFromExif')}</p>
        )}
        {!layer.overridden && hasValue && isSpiritBinding(binding) && (
          <p className="mt-1 text-[11px] font-medium text-neutral-500">{t('photoCard.fillFromSpirit')}</p>
        )}
        {!hasValue && isExif(binding) && (
          <p className="mt-1 text-[11px] font-medium text-neutral-500">{t('photoCard.fillNoValue')}</p>
        )}
        {layer.overridden && binding !== 'NONE' && (
          <button
            type="button"
            onClick={() => editor.patchLayer(layer.id, { overridden: false })}
            className="mt-1 text-[11px] font-semibold text-primary-700 hover:underline"
          >
            {t('photoCard.resetOverride')}
          </button>
        )}
      </div>

      {/* 주류 이름·생산자는 검색으로 한 번에 채우는 편이 정확하다. 직접 적어도 된다. */}
      {isSpiritBinding(binding) && (
        <button
          type="button"
          onClick={onOpenSpiritPicker}
          className="w-full rounded-lg border border-primary-300 py-2 text-xs font-bold text-primary-700 hover:bg-primary-50"
        >
          {t('photoCard.searchSpirit')}
        </button>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => go(step - 1)}
          className={`${navClass} border border-neutral-300 text-neutral-600 hover:bg-neutral-50`}
        >
          {t('photoCard.fillPrev')}
        </button>
        <button
          type="button"
          onClick={() => (isLast ? onClose() : go(step + 1))}
          className={`${navClass} bg-primary-600 text-white hover:bg-primary-500`}
        >
          {isLast ? t('photoCard.fillDone')
            : hasValue ? t('photoCard.fillNext') : t('photoCard.fillSkip')}
        </button>
      </div>
    </div>
  )
}
