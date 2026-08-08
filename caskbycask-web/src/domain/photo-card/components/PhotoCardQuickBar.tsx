import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getTextFont, getTextFontFamily, resolveTextFontKey,
  TEXT_FONT_WEIGHT_LABEL_KEYS, type TextFontKey,
} from '@/shared/components/imageEditorText'
import type { PhotoCardEditor } from '../hooks/usePhotoCardEditor'
import { NO_ZOOM_ATTRIBUTE } from '../hooks/usePhotoCardViewport'
import type { PhotoCardLayer } from '../types/photoCard.types'
import {
  PHOTO_CARD_MAX_FONT_SIZE_RATIO, PHOTO_CARD_MIN_FONT_SIZE_RATIO,
} from '../utils/layoutSchema'
import type { LayerBounds } from '../utils/photoCardRender'
import FontPicker from './panels/FontPicker'

interface Props {
  editor: PhotoCardEditor
  /** 선택 상자(캔버스 좌표) */
  bounds: LayerBounds | null
  /** 화면 px ÷ 캔버스 px */
  displayScale: number
  /** 카드가 놓인 영역의 크기(화면 px) — 바가 밖으로 나가지 않게 잡아 둔다 */
  displayWidth: number
}

/** 글자 크기를 한 번에 얼마나 키우고 줄일지(프레임 짧은 변 대비). */
const SIZE_STEP = 0.004
/** 크기 칸에 적는 단위 — 비율을 %로 보여 준다(속성 패널의 표시와 같다). */
const MIN_SIZE_PERCENT = PHOTO_CARD_MIN_FONT_SIZE_RATIO * 100
const MAX_SIZE_PERCENT = PHOTO_CARD_MAX_FONT_SIZE_RATIO * 100
/** 바의 대략적인 반폭(화면 px) — 카드 밖으로 밀려나지 않게 가둘 때 쓴다. */
const BAR_HALF_WIDTH = 235

/**
 * 이 요소에 빠른 편집 바가 뜨는가.
 *
 * 오버레이의 ✕ 는 상자 오른쪽 위, 곧 이 바가 뜨는 자리와 겹친다.
 * 겹쳐 놓으면 서로를 가리므로, 바가 뜨는 글자에서는 ✕ 대신 바 안의 삭제 버튼을 쓴다.
 */
export const showsQuickBar = (layer: PhotoCardLayer | null | undefined, locked: boolean) =>
  layer?.type === 'TEXT' && !locked

/**
 * 빠른 편집 바.
 *
 * 자주 만지는 것(글꼴·굵기·크기·색·삭제)만 담는다 — 오른쪽 패널까지 가지 않고
 * 그 자리에서 고치기 위한 것이다. 나머지 속성은 패널에 그대로 있다.
 * 텍스트일 때만 뜬다. 도형·이미지는 크기 손잡이로 충분하고, 여기 담을 만한 공통 속성이 없다.
 *
 * ── 자리 ──
 * 고른 글자 바로 위에 띄운다 — 무엇을 고치는 중인지 눈이 이어진다.
 * 넓은 화면에서만 쓴다(PhotoCardStage): 좁은 화면에서는 바가 카드보다 넓어 띄울 자리가 없고,
 * 작업 영역 아래에 붙이면 카드가 그만큼 밀린다. 그쪽은 아래 속성 시트가 같은 값을 모두 담고 있다.
 */
export default function PhotoCardQuickBar({
  editor, bounds, displayScale, displayWidth,
}: Props) {
  const { t } = useTranslation()
  // 크기를 손으로 칠 때는 "1" 처럼 아직 완성되지 않은 값도 그대로 보여 줘야 한다.
  // 칸을 떠나면 비우고 실제 값으로 돌아간다.
  const [sizeDraft, setSizeDraft] = useState<string | null>(null)

  const layer = editor.selectedLayer
  if (!layer || !bounds || !showsQuickBar(layer, editor.lockedIds.has(layer.id))) return null

  const font = getTextFont((layer.fontKey ?? 'pretendardBold') as TextFontKey)
  const family = getTextFontFamily(font.key)
  const patch = (values: Parameters<typeof editor.patchLayer>[1], gesture?: string) =>
    editor.patchLayer(layer.id, values, gesture)

  const sizePercent = (layer.fontSizeRatio ?? 0.04) * 100

  const applySize = (percent: number) => {
    const clamped = Math.max(MIN_SIZE_PERCENT, Math.min(MAX_SIZE_PERCENT, percent))
    patch({ fontSizeRatio: clamped / 100 }, `quickSize:${layer.id}`)
  }

  const stepSize = (delta: number) => {
    applySize(((layer.fontSizeRatio ?? 0.04) + delta) * 100)
    editor.endGesture()
  }

  // 상자 위쪽 가운데. 화면 좌표로 바꿔 카드 밖으로 나가지 않게 가둔다.
  // 카드가 바보다 좁으면 가둘 자리가 없다 — 그때는 카드 한가운데에 둔다.
  const centerX = ((bounds.left + bounds.right) / 2) * displayScale
  const top = bounds.top * displayScale
  const half = Math.min(BAR_HALF_WIDTH, displayWidth / 2)

  const button = 'inline-flex h-8 shrink-0 items-center justify-center rounded-md px-1.5 text-[12px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-100'
  const divider = <span className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200" />

  const content = (
    <>
      <div className="w-[196px] shrink-0">
        <FontPicker
          value={layer.fontKey}
          onChange={(fontKey) => patch({ fontKey })}
          showWeights={false}
          compact
        />
      </div>

      {family.weights.length > 1 && (
        <select
          value={font.weight}
          onChange={(event) => patch({
            fontKey: resolveTextFontKey(family.key, Number(event.target.value)),
          })}
          title={t('photoCard.fontWeight')}
          className="h-8 shrink-0 rounded-md border border-neutral-300 bg-white px-1 text-[12px] font-semibold text-neutral-600"
        >
          {family.weights.map((entry) => (
            <option key={entry.fontKey} value={entry.weight}>
              {t(TEXT_FONT_WEIGHT_LABEL_KEYS[entry.weight] ?? 'imageEditor.weightRegular')}
            </option>
          ))}
        </select>
      )}

      {divider}

      <button type="button" className={button} title={t('photoCard.sizeDown')}
        onClick={() => stepSize(-SIZE_STEP)}>−</button>
      {/* 숫자를 직접 칠 수 있다. type=number 는 휠에 값이 바뀌고 화살표까지 붙어 쓰지 않는다. */}
      <input
        type="text"
        inputMode="decimal"
        value={sizeDraft ?? sizePercent.toFixed(1)}
        title={t('photoCard.fontSize')}
        aria-label={t('photoCard.fontSize')}
        onChange={(event) => {
          setSizeDraft(event.target.value)
          const next = Number(event.target.value)
          // 다 치기 전에 잘라 내면 손이 꼬인다 — 범위 안의 온전한 숫자일 때만 반영한다.
          if (event.target.value.trim() !== '' && Number.isFinite(next)
            && next >= MIN_SIZE_PERCENT && next <= MAX_SIZE_PERCENT) applySize(next)
        }}
        onBlur={(event) => {
          const next = Number(event.target.value)
          if (event.target.value.trim() !== '' && Number.isFinite(next)) applySize(next)
          setSizeDraft(null)
          editor.endGesture()
        }}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
        className="h-8 w-12 shrink-0 rounded-md border border-neutral-300 bg-white px-1 text-center font-mono text-[12px] text-neutral-700 focus:border-primary-400 focus:outline-none"
      />
      <span className="shrink-0 text-[11px] text-neutral-400">%</span>
      <button type="button" className={button} title={t('photoCard.sizeUp')}
        onClick={() => stepSize(SIZE_STEP)}>＋</button>

      {divider}

      <label className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-neutral-100"
        title={t('photoCard.textColor')}>
        <span className="h-4 w-4 rounded border border-neutral-300"
          style={{ backgroundColor: layer.color ?? '#ffffff' }} />
        <input
          type="color"
          value={(layer.color ?? '#ffffff').slice(0, 7)}
          onChange={(event) => patch({ color: event.target.value }, `quickColor:${layer.id}`)}
          onBlur={editor.endGesture}
          className="sr-only"
        />
      </label>

      {divider}

      {/* 삭제 — 선택 상자의 ✕ 가 이 바에 가리므로, 지우는 길은 여기 하나로 모은다. */}
      <button
        type="button"
        title={t('photoCard.removeLayer')}
        aria-label={t('photoCard.removeLayer')}
        onClick={() => editor.removeLayer(layer.id)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M10 3h4l1 1.5h4V6.5H5V4.5h4L10 3zM6.5 8h11l-.9 11.4a2 2 0 01-2 1.6H9.4a2 2 0 01-2-1.6L6.5 8zm3.3 2.2v7.6h1.4v-7.6H9.8zm3.4 0v7.6h1.4v-7.6h-1.4z" />
        </svg>
      </button>
    </>
  )

  // 바를 누르는 동안 캔버스가 선택을 풀거나 요소를 끌면 안 된다.
  // 글꼴 목록을 휠로 굴릴 때 카드가 확대되지도 않아야 한다.
  const guards = {
    onPointerDown: (event: React.PointerEvent) => event.stopPropagation(),
    [NO_ZOOM_ATTRIBUTE]: '',
  }

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ left: 0, top: 0, width: displayWidth }}
    >
      <div
        className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-xl border border-neutral-200 bg-white/95 px-1.5 py-1 shadow-lg backdrop-blur"
        style={{
          left: Math.min(Math.max(centerX, half), displayWidth - half),
          top: Math.max(top - 10, 44),
        }}
        {...guards}
      >
        {content}
      </div>
    </div>
  )
}
