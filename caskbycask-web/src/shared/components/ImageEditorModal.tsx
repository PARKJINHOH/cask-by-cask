import { Fragment, useState, useEffect, useRef } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import {
  TEXT_FONT_GROUPS,
  TEXT_FONT_OPTIONS,
  TEXT_FONT_SIZE_MAX,
  TEXT_FONT_SIZE_MIN,
  TEXT_LAYER_MAX,
  TEXT_MAX_LENGTH,
  TEXT_OUTLINE_WIDTH_MAX,
  clampTextPosition,
  createTextLayer,
  drawTextLayers,
  findTextLayerAtPoint,
  getDrawableTextLayers,
  getTextFont,
  hasTextContent,
  measureTextBounds,
  type TextFontKey,
  type TextLayer,
  type TextPosition,
  type TextStyleState,
} from './imageEditorText'
import { ensureEditorFontCssLoaded } from './imageEditorFontCss'
import './image-editor.css'

interface ImageEditorModalProps {
  open: boolean
  onClose: () => void
  imageSrc: string
  onSave: (editedFile: File) => Promise<void>
  isSaving: boolean
  fixedRatio?: string
  initialCropRatio?: string
  initialMode?: EditMode
  outputSize?: {
    width: number
    height: number
  }
  fitOutputSize?: {
    width: number
    height: number
  }
  recommendedResolution?: string
  showInstagramCropPreset?: boolean
}

type EditMode = 'paint' | 'crop' | 'rotate' | 'resize' | 'adjust' | 'text'
type PaintType = 'mosaic' | 'blur'

interface TextControlsProps {
  idPrefix: string
  compact?: boolean
  layers: TextLayer[]
  activeLayer: TextLayer
  isApplying: boolean
  onSelectLayer: (layerId: string) => void
  onAddLayer: () => void
  onRemoveLayer: (layerId: string) => void
  onChange: (patch: Partial<TextStyleState>) => void
  onPositionChange: (position: TextPosition) => void
  onApply: () => void
}

function TextControls({
  idPrefix,
  compact = false,
  layers,
  activeLayer,
  isApplying,
  onSelectLayer,
  onAddLayer,
  onRemoveLayer,
  onChange,
  onPositionChange,
  onApply,
}: TextControlsProps) {
  const { t } = useTranslation()
  const style = activeLayer
  const drawableCount = getDrawableTextLayers(layers).length
  const canApply = drawableCount > 0 && !isApplying
  const canAddLayer = layers.length < TEXT_LAYER_MAX

  return (
    <div className={compact ? 'flex flex-col gap-3' : 'space-y-4'}>
      {/* 텍스트 레이어 목록 — ＋ 로 늘리고, 고른 것 하나를 아래 컨트롤이 편집한다. */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-neutral-400">{t('imageEditor.textLayers')}</span>
          <span className="text-[10px] font-mono text-neutral-500">{layers.length}/{TEXT_LAYER_MAX}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {layers.map((layer, index) => {
            const isActive = layer.id === activeLayer.id
            const preview = layer.content.trim().split('\n')[0]
            return (
              <span
                key={layer.id}
                className={`inline-flex max-w-full items-center gap-1 rounded-lg border py-1 pl-2 pr-1 text-[11px] transition-colors ${
                  isActive
                    ? 'border-primary-500 bg-primary-600/20 text-white'
                    : 'border-neutral-700 bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectLayer(layer.id)}
                  aria-pressed={isActive}
                  className="min-w-0 max-w-[7.5rem] truncate text-left"
                  title={preview || t('imageEditor.textLayerName', { index: index + 1 })}
                >
                  <span className="font-mono text-neutral-500">{index + 1}.</span>{' '}
                  {preview || <span className="italic text-neutral-600">{t('imageEditor.emptyTextLayer')}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveLayer(layer.id)}
                  aria-label={t('imageEditor.removeTextLayer')}
                  title={t('imageEditor.removeTextLayer')}
                  className="shrink-0 rounded p-0.5 leading-none text-neutral-500 hover:bg-neutral-700 hover:text-red-300"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            )
          })}
          <button
            type="button"
            onClick={onAddLayer}
            disabled={!canAddLayer}
            aria-label={t('imageEditor.addTextLayer')}
            title={canAddLayer
              ? t('imageEditor.addTextLayer')
              : t('imageEditor.textLayerLimit', { count: TEXT_LAYER_MAX })}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-neutral-600 px-2 py-1 text-[11px] font-medium text-neutral-300 transition-colors hover:border-primary-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('imageEditor.addTextLayer')}
          </button>
        </div>
      </div>

      <div className={compact ? 'grid grid-cols-2 gap-2' : 'space-y-3'}>
        <div className={compact ? 'col-span-2 space-y-1' : 'space-y-2'}>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`${idPrefix}-content`} className="text-xs font-medium text-neutral-300">
              {t('imageEditor.textContent')}
            </label>
            <span className="text-[10px] font-mono text-neutral-500">
              {style.content.length}/{TEXT_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id={`${idPrefix}-content`}
            rows={compact ? 2 : 3}
            maxLength={TEXT_MAX_LENGTH}
            value={style.content}
            onChange={(event) => onChange({ content: event.target.value })}
            placeholder={t('imageEditor.textPlaceholder')}
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-950/50 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-primary-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-font`} className="text-[11px] font-medium text-neutral-400">
            {t('imageEditor.font')}
          </label>
          <select
            id={`${idPrefix}-font`}
            value={style.fontKey}
            onChange={(event) => onChange({ fontKey: event.target.value as TextFontKey })}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-2 text-xs text-white focus:border-primary-500 focus:outline-none"
          >
            {TEXT_FONT_GROUPS.map((group) => (
              <optgroup key={group.key} label={t(group.labelKey)}>
                {TEXT_FONT_OPTIONS.filter((font) => font.groupKey === group.key).map((font) => (
                  <option key={font.key} value={font.key} style={{ fontFamily: font.family, fontWeight: font.weight }}>
                    {t(font.labelKey)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-size`} className="text-[11px] font-medium text-neutral-400">
            {t('imageEditor.fontSize')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`${idPrefix}-size`}
              type="number"
              min={TEXT_FONT_SIZE_MIN}
              max={TEXT_FONT_SIZE_MAX}
              value={style.fontSize}
              onChange={(event) => onChange({
                fontSize: Math.max(
                  TEXT_FONT_SIZE_MIN,
                  Math.min(TEXT_FONT_SIZE_MAX, Number(event.target.value) || TEXT_FONT_SIZE_MIN),
                ),
              })}
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-2 text-xs text-white focus:border-primary-500 focus:outline-none"
            />
            <span className="text-[10px] text-neutral-500">px</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-neutral-400">{t('imageEditor.textColor')}</span>
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-2">
            <input
              type="color"
              value={style.color}
              onChange={(event) => onChange({ color: event.target.value })}
              aria-label={t('imageEditor.textColor')}
              className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
            />
            <span className="text-[10px] font-mono uppercase text-neutral-300">{style.color}</span>
          </label>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-[11px] font-medium text-neutral-400">
            <input
              type="checkbox"
              checked={style.outlineEnabled}
              onChange={(event) => onChange({ outlineEnabled: event.target.checked })}
              className="rounded border-neutral-700 bg-neutral-800 text-primary-600 focus:ring-primary-500/30"
            />
            {t('imageEditor.outline')}
          </label>
          <label className={`flex h-9 items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-2 ${
            style.outlineEnabled ? 'cursor-pointer' : 'opacity-40'
          }`}>
            <input
              type="color"
              value={style.outlineColor}
              disabled={!style.outlineEnabled}
              onChange={(event) => onChange({ outlineColor: event.target.value })}
              aria-label={t('imageEditor.outlineColor')}
              className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
            />
            <span className="text-[10px] font-mono uppercase text-neutral-300">{style.outlineColor}</span>
          </label>
        </div>
      </div>

      <div className={compact ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`${idPrefix}-outline-width`} className="text-[11px] font-medium text-neutral-400">
              {t('imageEditor.outlineWidth')}
            </label>
            <span className="text-[10px] font-mono text-neutral-300">{style.outlineWidth}px</span>
          </div>
          <input
            id={`${idPrefix}-outline-width`}
            type="range"
            min="0"
            max={TEXT_OUTLINE_WIDTH_MAX}
            value={style.outlineWidth}
            disabled={!style.outlineEnabled}
            onChange={(event) => onChange({ outlineWidth: Number(event.target.value) })}
            className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800 accent-primary-500 disabled:opacity-40"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`${idPrefix}-position-x`} className="text-[11px] font-medium text-neutral-400">
              {t('imageEditor.positionX')}
            </label>
            <span className="text-[10px] font-mono text-neutral-300">{Math.round(style.position.x * 100)}%</span>
          </div>
          <input
            id={`${idPrefix}-position-x`}
            type="range"
            min="0"
            max="100"
            value={Math.round(style.position.x * 100)}
            onChange={(event) => onPositionChange({ ...style.position, x: Number(event.target.value) / 100 })}
            className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800 accent-primary-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`${idPrefix}-position-y`} className="text-[11px] font-medium text-neutral-400">
              {t('imageEditor.positionY')}
            </label>
            <span className="text-[10px] font-mono text-neutral-300">{Math.round(style.position.y * 100)}%</span>
          </div>
          <input
            id={`${idPrefix}-position-y`}
            type="range"
            min="0"
            max="100"
            value={Math.round(style.position.y * 100)}
            onChange={(event) => onPositionChange({ ...style.position, y: Number(event.target.value) / 100 })}
            className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800 accent-primary-500"
          />
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-neutral-500">
        {t('imageEditor.textLayerHint')}
        {' '}
        {t('imageEditor.textDragHint')}
        {' · '}
        {t('imageEditor.fontLicense')}
      </p>

      <button
        type="button"
        onClick={onApply}
        disabled={!canApply}
        className="w-full rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-950/20 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {isApplying ? t('imageEditor.applyingText') : t('imageEditor.applyText')}
      </button>
    </div>
  )
}

/** 이미지 크기에 비례한 기본 글자 크기 — 작은 이미지에 거대한 글자가 얹히지 않게 한다. */
const defaultTextFontSize = (canvas: HTMLCanvasElement): number => Math.max(
  TEXT_FONT_SIZE_MIN,
  Math.min(TEXT_FONT_SIZE_MAX, Math.round(Math.min(canvas.width, canvas.height) * 0.08)),
)

/** 새 레이어는 기존 것과 겹치지 않게 세로로 조금씩 내려 배치한다. */
const nextTextLayerPosition = (index: number): TextPosition => ({
  x: 0.5,
  y: Math.min(0.9, 0.5 + (index % 5) * 0.09),
})

/** 밝기/대비/채도/선명도 기본값(%) — 100 = 원본 그대로 */
const ADJUST_DEFAULT = 100

type AdjustKey = 'brightness' | 'contrast' | 'saturation' | 'sharpness'
type AdjustValues = Record<AdjustKey, number>

const ADJUST_SLIDERS: { key: AdjustKey; labelKey: string; min: number; max: number }[] = [
  { key: 'brightness', labelKey: 'imageEditor.brightness', min: 20, max: 200 },
  { key: 'contrast', labelKey: 'imageEditor.contrast', min: 20, max: 200 },
  { key: 'saturation', labelKey: 'imageEditor.saturation', min: 0, max: 200 },
  { key: 'sharpness', labelKey: 'imageEditor.sharpness', min: 0, max: 200 },
]

const ADJUST_IDENTITY: AdjustValues = {
  brightness: ADJUST_DEFAULT,
  contrast: ADJUST_DEFAULT,
  saturation: ADJUST_DEFAULT,
  sharpness: ADJUST_DEFAULT,
}

const isAdjustIdentity = (values: AdjustValues): boolean =>
  ADJUST_SLIDERS.every((slider) => values[slider.key] === ADJUST_DEFAULT)

const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v)

const supportsCtxFilter = (ctx: CanvasRenderingContext2D): boolean =>
  typeof (ctx as { filter?: unknown }).filter === 'string'

/**
 * CanvasRenderingContext2D.filter 미지원 브라우저용 폴백.
 * CSS filter 와 동일한 순서(brightness → contrast → saturate)/계수로 픽셀을 직접 변환한다.
 */
const applyAdjustFallback = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  brightnessPercent: number,
  contrastPercent: number,
  saturationPercent: number,
) => {
  if (width <= 0 || height <= 0) return
  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data

  const b = brightnessPercent / 100
  const c = contrastPercent / 100
  const s = saturationPercent / 100

  // CSS saturate() 행렬 계수
  const rr = 0.213 + 0.787 * s
  const rg = 0.715 - 0.715 * s
  const rb = 0.072 - 0.072 * s
  const gr = 0.213 - 0.213 * s
  const gg = 0.715 + 0.285 * s
  const gb = 0.072 - 0.072 * s
  const br = 0.213 - 0.213 * s
  const bg = 0.715 - 0.715 * s
  const bb = 0.072 + 0.928 * s

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * b
    let g = data[i + 1] * b
    let bl = data[i + 2] * b

    r = (r - 127.5) * c + 127.5
    g = (g - 127.5) * c + 127.5
    bl = (bl - 127.5) * c + 127.5

    data[i] = clamp255(r * rr + g * rg + bl * rb)
    data[i + 1] = clamp255(r * gr + g * gg + bl * gb)
    data[i + 2] = clamp255(r * br + g * bg + bl * bb)
  }

  ctx.putImageData(imgData, 0, 0)
}

/**
 * 언샤프 마스크. out = orig + amount × (orig − blurred)
 * - amount > 0 → 선명하게 (경계 대비 강조)
 * - amount < 0 → 부드럽게 (블러 쪽으로 보간)
 *
 * 블러는 GPU 가속되는 ctx.filter 로 만들고, 픽셀 합성만 JS 로 처리한다.
 * blurred 의 alpha 는 캔버스 경계에서 감소하지만 getImageData 는 straight alpha 를
 * 돌려주므로 RGB 는 "캔버스 내부 픽셀만의 가중 평균"으로 정규화되어 있다 → 경계 halo 없음.
 */
const applySharpen = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  amount: number,
) => {
  const w = canvas.width
  const h = canvas.height
  if (w <= 0 || h <= 0 || amount === 0) return

  // 원본 해상도가 클수록 반경을 키워야 화면 미리보기에서 효과가 보인다
  const radius = Math.max(1, Math.min(4, Math.round(Math.min(w, h) / 400)))

  const blurCanvas = document.createElement('canvas')
  blurCanvas.width = w
  blurCanvas.height = h
  const blurCtx = blurCanvas.getContext('2d')
  if (!blurCtx) return

  if (supportsCtxFilter(blurCtx)) {
    blurCtx.filter = `blur(${radius}px)`
    blurCtx.drawImage(canvas, 0, 0)
    blurCtx.filter = 'none'
  } else {
    // 폴백: 축소 → 확대 보간으로 블러 근사
    const dw = Math.max(1, Math.round(w / (radius + 1)))
    const dh = Math.max(1, Math.round(h / (radius + 1)))
    const tmp = document.createElement('canvas')
    tmp.width = dw
    tmp.height = dh
    const tmpCtx = tmp.getContext('2d')
    if (!tmpCtx) return
    tmpCtx.imageSmoothingEnabled = true
    tmpCtx.imageSmoothingQuality = 'high'
    tmpCtx.drawImage(canvas, 0, 0, dw, dh)
    blurCtx.imageSmoothingEnabled = true
    blurCtx.imageSmoothingQuality = 'high'
    blurCtx.drawImage(tmp, 0, 0, dw, dh, 0, 0, w, h)
  }

  const srcData = ctx.getImageData(0, 0, w, h)
  const blurData = blurCtx.getImageData(0, 0, w, h)
  const s = srcData.data
  const b = blurData.data

  for (let i = 0; i < s.length; i += 4) {
    s[i] = clamp255(s[i] + amount * (s[i] - b[i]))
    s[i + 1] = clamp255(s[i + 1] + amount * (s[i + 1] - b[i + 1]))
    s[i + 2] = clamp255(s[i + 2] + amount * (s[i + 2] - b[i + 2]))
  }

  ctx.putImageData(srcData, 0, 0)
}

interface CropBox {
  x: number // 0 ~ 1
  y: number // 0 ~ 1
  w: number // 0 ~ 1
  h: number // 0 ~ 1
}

interface CropRatioOption {
  label: string
  value: string
  instagram?: boolean
}

export default function ImageEditorModal({
  open,
  onClose,
  imageSrc,
  onSave,
  isSaving,
  fixedRatio,
  initialCropRatio,
  initialMode = 'paint',
  outputSize,
  fitOutputSize,
  recommendedResolution,
  showInstagramCropPreset = false,
}: ImageEditorModalProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<EditMode>('paint')
  const [paintType, setPaintType] = useState<PaintType>('mosaic')
  const [brushSize, setBrushSize] = useState<number>(30)

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textOverlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const mosaicCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const blurCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const containerRef = useRef<HTMLDivElement>(null)

  // Drawing state
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  // Text state — 적용 전에는 투명 오버레이 캔버스에서 미리보고, 적용 시 본 캔버스에 합성한다.
  // 레이어 배열은 항상 1개 이상을 유지한다(마지막을 지우면 빈 레이어로 교체).
  const [textLayers, setTextLayers] = useState<TextLayer[]>(() => [createTextLayer()])
  const [activeTextLayerId, setActiveTextLayerId] = useState<string | null>(null)
  const activeTextLayer = textLayers.find((layer) => layer.id === activeTextLayerId) ?? textLayers[0]
  const [isApplyingText, setIsApplyingText] = useState(false)
  const [isDraggingText, setIsDraggingText] = useState(false)
  const textDragRef = useRef<{
    pointerId: number
    layerId: string
    offsetX: number
    offsetY: number
  } | null>(null)

  // History state
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)

  // Crop Box state
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
  // Crop Ratio state
  const [cropRatio, setCropRatio] = useState<string>('free')
  const [customRatioW, setCustomRatioW] = useState<string>('1')
  const [customRatioH, setCustomRatioH] = useState<string>('1')

  // Rotation / Tilt state
  const tiltBaseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [tiltAngle, setTiltAngle] = useState<number>(0)

  // Brightness / Contrast / Saturation / Sharpness state (percent, 100 = 원본)
  const adjustBaseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [adjustValues, setAdjustValues] = useState<AdjustValues>(ADJUST_IDENTITY)
  const hasPendingAdjust = !isAdjustIdentity(adjustValues)
  // 선명도는 픽셀 연산이 필요해 비용이 크므로 rAF 로 슬라이더 입력을 합친다
  const adjustRafRef = useRef<number | null>(null)
  const pendingAdjustRef = useRef<AdjustValues | null>(null)

  // Resize resolution state
  const [resizeW, setResizeW] = useState<string>('')
  const [resizeH, setResizeH] = useState<string>('')
  const [keepAspectRatio, setKeepAspectRatio] = useState<boolean>(true)

  const getRatioVal = (ratioStr: string): number | null => {
    if (ratioStr === 'free') return null
    if (ratioStr === 'custom') {
      const w = parseFloat(customRatioW)
      const h = parseFloat(customRatioH)
      if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null
      return w / h
    }
    const parts = ratioStr.split(':')
    const rWidth = parseFloat(parts[0])
    const rHeight = parseFloat(parts[1])
    if (isNaN(rWidth) || isNaN(rHeight)) return null
    return rWidth / rHeight
  }

  const getInitialCropBoxForRatio = (ratioStr: string, customW?: string, customH?: string): CropBox => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }

    if (ratioStr === 'free') {
      return { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }
    }

    let ratioVal: number | null = null
    if (ratioStr === 'custom') {
      const w = parseFloat(customW ?? customRatioW)
      const h = parseFloat(customH ?? customRatioH)
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        ratioVal = w / h
      }
    } else {
      ratioVal = getRatioVal(ratioStr)
    }

    if (!ratioVal) return { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }

    const R = ratioVal
    const A_canvas = canvas.width / canvas.height

    if (R >= A_canvas) {
      const w = 0.8
      const h = (w * A_canvas) / R
      return {
        x: (1 - w) / 2,
        y: (1 - h) / 2,
        w,
        h,
      }
    } else {
      const h = 0.8
      const w = (h * R) / A_canvas
      return {
        x: (1 - w) / 2,
        y: (1 - h) / 2,
        w,
        h,
      }
    }
  }

  // Canvas scale state for dynamic brush cursor size
  const [canvasScale, setCanvasScale] = useState<number>(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateScale = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0 && canvas.width > 0) {
        setCanvasScale(rect.width / canvas.width)
      }
    }

    // Update on load
    updateScale()

    const observer = new ResizeObserver(() => {
      updateScale()
    })
    observer.observe(canvas)

    window.addEventListener('resize', updateScale)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [historyIndex, mode, open])

  // Helper: push state to history
  const pushState = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    const nextHistory = history.slice(0, historyIndex + 1)
    nextHistory.push(imgData)
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
  }

  // Pre-generate mosaic and blur canvases
  const regenerateEffects = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.width
    const h = canvas.height

    // 1. Mosaic Effect
    const mCanvas = mosaicCanvasRef.current
    mCanvas.width = w
    mCanvas.height = h
    const mCtx = mCanvas.getContext('2d')!

    const scale = 0.04 // Mosaic pixelation factor
    const sw = Math.max(1, Math.round(w * scale))
    const sh = Math.max(1, Math.round(h * scale))

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = sw
    tempCanvas.height = sh
    const tCtx = tempCanvas.getContext('2d')!
    tCtx.drawImage(canvas, 0, 0, sw, sh)

    mCtx.imageSmoothingEnabled = false
    mCtx.drawImage(tempCanvas, 0, 0, sw, sh, 0, 0, w, h)

    // 2. Blur Effect
    const bCanvas = blurCanvasRef.current
    bCanvas.width = w
    bCanvas.height = h
    const bCtx = bCanvas.getContext('2d')!
    if ('filter' in (bCtx as any)) {
      (bCtx as any).filter = 'blur(16px)'
      bCtx.drawImage(canvas, 0, 0)
    } else {
      // Fallback: scale down and scale up with smoothing
      const bScale = 0.1
      const bw = Math.max(1, Math.round(w * bScale))
      const bh = Math.max(1, Math.round(h * bScale))
      const bTemp = document.createElement('canvas')
      bTemp.width = bw
      bTemp.height = bh
      const btCtx = bTemp.getContext('2d')!
      btCtx.imageSmoothingEnabled = true
      btCtx.drawImage(canvas, 0, 0, bw, bh)

      bCtx.imageSmoothingEnabled = true
      bCtx.drawImage(bTemp, 0, 0, bw, bh, 0, 0, w, h)
    }
  }

  // Load image on mount/src change
  useEffect(() => {
    if (!open || !imageSrc) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)

      regenerateEffects()

      // Set initial history state
      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setHistory([initialData])
      setHistoryIndex(0)
      const initialLayer = createTextLayer(defaultTextFontSize(canvas))
      setTextLayers([initialLayer])
      setActiveTextLayerId(initialLayer.id)
      setIsApplyingText(false)
      setIsDraggingText(false)
      textDragRef.current = null

      const startingRatio = fixedRatio ?? initialCropRatio
      if (startingRatio) {
        setCropBox(getInitialCropBoxForRatio(startingRatio))
      }
    }
    img.src = imageSrc
    setMode(initialMode)
    if (fixedRatio ?? initialCropRatio) {
      setCropRatio((fixedRatio ?? initialCropRatio)!)
    } else {
      setCropRatio('free')
    }
    setTiltAngle(0)
    tiltBaseCanvasRef.current = null
    setAdjustValues(ADJUST_IDENTITY)
    adjustBaseCanvasRef.current = null
  }, [open, imageSrc, fixedRatio, initialCropRatio, initialMode])

  const handleCustomRatioChange = (w: string, h: string) => {
    setCustomRatioW(w)
    setCustomRatioH(h)
    setCropRatio('custom')
    setCropBox(getInitialCropBoxForRatio('custom', w, h))
  }

  /** 현재 캔버스 픽셀을 그대로 복사한 오프스크린 캔버스를 만든다 (미리보기 원본 보관용) */
  const captureCurrentCanvas = (): HTMLCanvasElement | null => {
    const canvas = canvasRef.current
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null
    const copy = document.createElement('canvas')
    copy.width = canvas.width
    copy.height = canvas.height
    const copyCtx = copy.getContext('2d')
    if (!copyCtx) return null
    copyCtx.drawImage(canvas, 0, 0)
    return copy
  }

  const initTiltBase = () => {
    tiltBaseCanvasRef.current = captureCurrentCanvas()
  }

  /**
   * 회전한 w×h 이미지가 w×h 프레임을 빈 공간 없이 덮기 위한 최소 확대 배율.
   * 프레임을 -θ 만큼 회전시킨 바운딩 박스가 확대된 이미지 안에 들어가야 한다는 조건에서 유도.
   */
  const getTiltCoverScale = (angleRad: number, w: number, h: number): number => {
    if (w <= 0 || h <= 0) return 1
    const cos = Math.abs(Math.cos(angleRad))
    const sin = Math.abs(Math.sin(angleRad))
    return Math.max((w * cos + h * sin) / w, (w * sin + h * cos) / h)
  }

  const applyTiltAngle = (angleDegrees: number) => {
    const canvas = canvasRef.current
    const baseCanvas = tiltBaseCanvasRef.current
    if (!canvas || !baseCanvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = baseCanvas.width
    const h = baseCanvas.height

    // 캔버스 크기는 원본 그대로 유지하고, 이미지를 확대해서 채운다 → 모서리 빈 공간 없음
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    const angleRad = (angleDegrees * Math.PI) / 180
    const scale = getTiltCoverScale(angleRad, w, h)

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.translate(w / 2, h / 2)
    ctx.rotate(angleRad)
    ctx.scale(scale, scale)
    ctx.drawImage(baseCanvas, -w / 2, -h / 2)
    ctx.restore()
  }

  const restorePreTilt = () => {
    const canvas = canvasRef.current
    const baseCanvas = tiltBaseCanvasRef.current
    if (canvas && baseCanvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = baseCanvas.width
        canvas.height = baseCanvas.height
        ctx.drawImage(baseCanvas, 0, 0)
        regenerateEffects()
      }
    }
    setTiltAngle(0)
  }

  const handleApplyTilt = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    regenerateEffects()

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1)
      next.push(imgData)
      return next
    })
    setHistoryIndex((prev) => prev + 1)

    initTiltBase()
    setTiltAngle(0)
  }

  const handleTiltSliderChange = (angle: number) => {
    setTiltAngle(angle)
    applyTiltAngle(angle)
  }

  // ── Brightness / Contrast / Saturation / Sharpness ──────────────────
  const initAdjustBase = () => {
    adjustBaseCanvasRef.current = captureCurrentCanvas()
  }

  const renderAdjustPreview = (values: AdjustValues) => {
    const canvas = canvasRef.current
    const baseCanvas = adjustBaseCanvasRef.current
    if (!canvas || !baseCanvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (canvas.width !== baseCanvas.width || canvas.height !== baseCanvas.height) {
      canvas.width = baseCanvas.width
      canvas.height = baseCanvas.height
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 1) 밝기 · 대비 · 채도 — ctx.filter 미지원 브라우저는 픽셀 연산으로 폴백
    if (supportsCtxFilter(ctx)) {
      ctx.filter = `brightness(${values.brightness}%) contrast(${values.contrast}%) saturate(${values.saturation}%)`
      ctx.drawImage(baseCanvas, 0, 0)
      ctx.filter = 'none'
    } else {
      ctx.drawImage(baseCanvas, 0, 0)
      applyAdjustFallback(
        ctx,
        canvas.width,
        canvas.height,
        values.brightness,
        values.contrast,
        values.saturation,
      )
    }

    // 2) 선명도 — CSS filter 로는 불가능하므로 언샤프 마스크를 마지막에 적용
    if (values.sharpness !== ADJUST_DEFAULT) {
      applySharpen(canvas, ctx, (values.sharpness - ADJUST_DEFAULT) / 100)
    }
  }

  const cancelPendingAdjustRender = () => {
    if (adjustRafRef.current !== null) {
      cancelAnimationFrame(adjustRafRef.current)
      adjustRafRef.current = null
    }
    pendingAdjustRef.current = null
  }

  /** 예약된 미리보기 렌더를 즉시 반영한다 — 캔버스 픽셀을 읽기 전에 반드시 호출 */
  const flushAdjustRender = () => {
    const pending = pendingAdjustRef.current
    cancelPendingAdjustRender()
    if (pending) renderAdjustPreview(pending)
  }

  const scheduleAdjustRender = (values: AdjustValues) => {
    pendingAdjustRef.current = values
    if (adjustRafRef.current !== null) return
    adjustRafRef.current = requestAnimationFrame(() => {
      adjustRafRef.current = null
      const pending = pendingAdjustRef.current
      pendingAdjustRef.current = null
      if (pending) renderAdjustPreview(pending)
    })
  }

  // 모달이 닫히거나 언마운트될 때 예약된 렌더 정리
  useEffect(() => {
    if (!open) cancelPendingAdjustRender()
    return () => cancelPendingAdjustRender()
  }, [open])

  const handleAdjustChange = (key: AdjustKey, value: number) => {
    const next: AdjustValues = { ...adjustValues, [key]: value }
    setAdjustValues(next)
    scheduleAdjustRender(next)
  }

  const handleResetAdjust = () => {
    cancelPendingAdjustRender()
    setAdjustValues(ADJUST_IDENTITY)
    renderAdjustPreview(ADJUST_IDENTITY)
  }

  const restorePreAdjust = () => {
    cancelPendingAdjustRender()
    const canvas = canvasRef.current
    const baseCanvas = adjustBaseCanvasRef.current
    if (canvas && baseCanvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = baseCanvas.width
        canvas.height = baseCanvas.height
        ctx.drawImage(baseCanvas, 0, 0)
        regenerateEffects()
      }
    }
    setAdjustValues(ADJUST_IDENTITY)
  }

  const handleApplyAdjust = () => {
    flushAdjustRender()

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    regenerateEffects()

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1)
      next.push(imgData)
      return next
    })
    setHistoryIndex((prev) => prev + 1)

    initAdjustBase()
    setAdjustValues(ADJUST_IDENTITY)
  }

  const handleModeChange = (newMode: EditMode) => {
    if (newMode === mode) return
    // 적용하지 않은 미리보기는 모드 전환 시 되돌린다
    if (mode === 'rotate' && tiltAngle !== 0) {
      restorePreTilt()
    }
    if (mode === 'adjust') {
      if (hasPendingAdjust) {
        restorePreAdjust()
      } else {
        cancelPendingAdjustRender()
      }
    }
    setMode(newMode)
  }

  // Manage tilt / adjust base canvas state (모드 전환·히스토리 변경 시 재기준화)
  useEffect(() => {
    if (mode === 'rotate') {
      initTiltBase()
      setTiltAngle(0)
    } else {
      tiltBaseCanvasRef.current = null
    }

    if (mode === 'adjust') {
      initAdjustBase()
      setAdjustValues(ADJUST_IDENTITY)
    } else {
      adjustBaseCanvasRef.current = null
    }
  }, [mode, historyIndex])

  // Sync resize dimensions when canvas changes or mode changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      setResizeW(canvas.width.toString())
      setResizeH(canvas.height.toString())
    }
  }, [historyIndex, mode, open])

  const handleResizeWChange = (val: string) => {
    setResizeW(val)
    const canvas = canvasRef.current
    if (!canvas || !keepAspectRatio) return
    const w = parseFloat(val)
    if (isNaN(w) || w <= 0) return
    const ratio = canvas.width / canvas.height
    setResizeH(Math.round(w / ratio).toString())
  }

  const handleResizeHChange = (val: string) => {
    setResizeH(val)
    const canvas = canvasRef.current
    if (!canvas || !keepAspectRatio) return
    const h = parseFloat(val)
    if (isNaN(h) || h <= 0) return
    const ratio = canvas.width / canvas.height
    setResizeW(Math.round(h * ratio).toString())
  }

  const handleApplyResize = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const targetW = Math.round(parseFloat(resizeW))
    const targetH = Math.round(parseFloat(resizeH))

    if (isNaN(targetW) || isNaN(targetH) || targetW <= 0 || targetH <= 0) return

    pushState()

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = targetW
    tempCanvas.height = targetH
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.imageSmoothingEnabled = true
    tempCtx.imageSmoothingQuality = 'high'
    tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, targetW, targetH)

    canvas.width = targetW
    canvas.height = targetH
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(tempCanvas, 0, 0)

    regenerateEffects()

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => {
      const next = [...prev]
      next[historyIndex + 1] = imgData
      return next
    })
    setHistoryIndex((prev) => prev + 1)
  }

  // Canvas drawing event handlers (Unified touch/mouse)
  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) * (canvas.width / rect.width)
    const y = (clientY - rect.top) * (canvas.height / rect.height)
    return { x, y }
  }

  /**
   * 캔버스에 그리기 전에 해당 글자들의 폰트 조각을 확보한다.
   * 장식용 서체 CSS 는 편집기가 열릴 때 <link> 로 주입되므로 그것부터 기다린다.
   */
  const ensureTextFontLoaded = async (styles: TextStyleState[]) => {
    const drawable = getDrawableTextLayers(styles)
    if (drawable.length === 0) return
    await ensureEditorFontCssLoaded()
    if (!document.fonts) return
    await Promise.all(drawable.map(async (style) => {
      const font = getTextFont(style.fontKey)
      try {
        await document.fonts.load(
          `${font.weight} ${style.fontSize}px ${font.family}`,
          style.content,
        )
      } catch {
        // Font Loading API 가 실패한 구형 브라우저에서는 Canvas 자체 폴백으로 계속 진행한다.
      }
    }))
  }

  const clampCurrentTextPosition = (
    position: TextPosition,
    style: TextStyleState,
  ): TextPosition => {
    const canvas = canvasRef.current
    const overlayCanvas = textOverlayCanvasRef.current
    if (!canvas || !overlayCanvas || canvas.width <= 0 || canvas.height <= 0) return position

    if (overlayCanvas.width !== canvas.width || overlayCanvas.height !== canvas.height) {
      overlayCanvas.width = canvas.width
      overlayCanvas.height = canvas.height
    }
    const overlayContext = overlayCanvas.getContext('2d')
    if (!overlayContext) return position
    return clampTextPosition(overlayContext, overlayCanvas, style, position)
  }

  const patchTextLayer = (layerId: string, patch: Partial<TextStyleState>) => {
    setTextLayers((current) => current.map((layer) => (
      layer.id === layerId ? { ...layer, ...patch } : layer
    )))
  }

  const handleTextStyleChange = (patch: Partial<TextStyleState>) => {
    if (!activeTextLayer) return
    patchTextLayer(activeTextLayer.id, patch)
  }

  const setTextLayerPosition = (layerId: string, position: TextPosition) => {
    setTextLayers((current) => current.map((layer) => (
      layer.id === layerId
        ? { ...layer, position: clampCurrentTextPosition(position, layer) }
        : layer
    )))
  }

  const handleTextPositionChange = (position: TextPosition) => {
    if (!activeTextLayer) return
    setTextLayerPosition(activeTextLayer.id, position)
  }

  const handleSelectTextLayer = (layerId: string) => {
    setActiveTextLayerId(layerId)
  }

  /** 편집 중인 레이어의 서식(내용·위치 제외) — 새 레이어가 물려받는다. */
  const inheritedTextStyle = (): Partial<TextStyleState> => {
    if (!activeTextLayer) return {}
    const { id: _id, content: _content, position: _position, ...rest } = activeTextLayer
    return rest
  }

  const handleAddTextLayer = () => {
    if (textLayers.length >= TEXT_LAYER_MAX) return
    const canvas = canvasRef.current
    // 새 레이어는 현재 편집 중인 서식을 물려받는다 — 같은 톤으로 여러 줄을 얹는 흐름이 많다.
    const layer = createTextLayer(canvas ? defaultTextFontSize(canvas) : undefined, {
      ...inheritedTextStyle(),
      position: nextTextLayerPosition(textLayers.length),
    })
    setTextLayers((current) => [...current, layer])
    setActiveTextLayerId(layer.id)
  }

  const handleRemoveTextLayer = (layerId: string) => {
    const remaining = textLayers.filter((layer) => layer.id !== layerId)
    if (remaining.length === 0) {
      const canvas = canvasRef.current
      const fresh = createTextLayer(canvas ? defaultTextFontSize(canvas) : undefined)
      setTextLayers([fresh])
      setActiveTextLayerId(fresh.id)
      return
    }
    setTextLayers(remaining)
    if (activeTextLayer?.id === layerId) {
      setActiveTextLayerId(remaining[remaining.length - 1].id)
    }
  }

  // 실제 출력과 동일한 Canvas API 로 텍스트를 미리 그려 폰트·외곽선 차이를 없앤다.
  useEffect(() => {
    let cancelled = false

    const renderPreview = async () => {
      const canvas = canvasRef.current
      const overlayCanvas = textOverlayCanvasRef.current
      if (!canvas || !overlayCanvas) return

      if (overlayCanvas.width !== canvas.width || overlayCanvas.height !== canvas.height) {
        overlayCanvas.width = canvas.width
        overlayCanvas.height = canvas.height
      }

      const overlayContext = overlayCanvas.getContext('2d')
      if (!overlayContext) return
      overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

      const drawable = getDrawableTextLayers(textLayers)
      if (!open || mode !== 'text' || drawable.length === 0) return
      await ensureTextFontLoaded(drawable)
      if (cancelled) return

      const clamped = drawable.map((layer) => ({
        ...layer,
        position: clampTextPosition(overlayContext, overlayCanvas, layer, layer.position),
      }))
      drawTextLayers(overlayContext, overlayCanvas, clamped)

      // 편집 중인 레이어를 점선으로 표시한다(오버레이에만 그리므로 결과 이미지에는 남지 않는다).
      const focused = clamped.find((layer) => layer.id === activeTextLayer?.id)
      if (focused && clamped.length > 1) {
        const bounds = measureTextBounds(overlayContext, overlayCanvas, focused)
        overlayContext.save()
        overlayContext.strokeStyle = 'rgba(255, 255, 255, 0.85)'
        overlayContext.lineWidth = Math.max(1, 2 / Math.max(canvasScale, 0.01))
        overlayContext.setLineDash([overlayContext.lineWidth * 4, overlayContext.lineWidth * 3])
        overlayContext.strokeRect(
          bounds.left,
          bounds.top,
          bounds.right - bounds.left,
          bounds.bottom - bounds.top,
        )
        overlayContext.restore()
      }

      const moved = clamped.filter((layer) => {
        const original = textLayers.find((item) => item.id === layer.id)
        return original
          && (original.position.x !== layer.position.x || original.position.y !== layer.position.y)
      })
      if (moved.length > 0) {
        setTextLayers((current) => current.map((layer) => {
          const fixed = moved.find((item) => item.id === layer.id)
          return fixed ? { ...layer, position: fixed.position } : layer
        }))
      }
    }

    void renderPreview()
    return () => {
      cancelled = true
    }
  }, [activeTextLayer?.id, canvasScale, historyIndex, mode, open, textLayers])

  useEffect(() => {
    if (mode === 'text') return
    textDragRef.current = null
    setIsDraggingText(false)
  }, [mode])

  // 글꼴 <select> 의 미리보기가 실제 서체로 보이려면 CSS 가 먼저 붙어 있어야 한다.
  useEffect(() => {
    if (!open) return
    void ensureEditorFontCssLoaded()
  }, [open])

  const commitCurrentCanvasToHistory = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const nextHistory = history.slice(0, historyIndex + 1)
    nextHistory.push(imageData)
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
  }

  const handleApplyText = async () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const drawable = getDrawableTextLayers(textLayers)
    if (!canvas || !ctx || drawable.length === 0 || isApplyingText) return

    setIsApplyingText(true)
    try {
      await ensureTextFontLoaded(drawable)
      drawTextLayers(ctx, canvas, drawable.map((layer) => ({
        ...layer,
        position: clampCurrentTextPosition(layer.position, layer),
      })))
      regenerateEffects()
      commitCurrentCanvasToHistory()
      // 적용된 레이어는 캔버스에 구워졌으므로 편집 목록은 빈 상태로 되돌린다.
      const fresh = createTextLayer(defaultTextFontSize(canvas), inheritedTextStyle())
      setTextLayers([fresh])
      setActiveTextLayerId(fresh.id)
    } finally {
      setIsApplyingText(false)
    }
  }

  const handleTextPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'text') return
    const coords = getCanvasCoords(event.clientX, event.clientY)
    const canvas = canvasRef.current
    const overlayCanvas = textOverlayCanvasRef.current
    const overlayContext = overlayCanvas?.getContext('2d')
    if (!coords || !canvas || !overlayCanvas || !overlayContext) return

    const hitPadding = Math.max(8, 12 / Math.max(canvasScale, 0.01))
    // 겹친 레이어는 위에 그려진(= 나중에 추가된) 것을 먼저 집는다.
    const hit = findTextLayerAtPoint(overlayContext, overlayCanvas, textLayers, coords, hitPadding)
    if (!hit) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setActiveTextLayerId(hit.id)
    textDragRef.current = {
      pointerId: event.pointerId,
      layerId: hit.id,
      offsetX: coords.x - hit.position.x * canvas.width,
      offsetY: coords.y - hit.position.y * canvas.height,
    }
    setIsDraggingText(true)
  }

  const handleTextPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = textDragRef.current
    const canvas = canvasRef.current
    if (!drag || drag.pointerId !== event.pointerId || !canvas) return
    const coords = getCanvasCoords(event.clientX, event.clientY)
    if (!coords) return

    event.preventDefault()
    setTextLayerPosition(drag.layerId, {
      x: (coords.x - drag.offsetX) / canvas.width,
      y: (coords.y - drag.offsetY) / canvas.height,
    })
  }

  const handleTextPointerEnd = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (textDragRef.current?.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    textDragRef.current = null
    setIsDraggingText(false)
  }

  const startDrawing = (clientX: number, clientY: number) => {
    if (mode !== 'paint') return
    const coords = getCanvasCoords(clientX, clientY)
    if (!coords) return

    pushState() // Save history before drawing
    isDrawingRef.current = true
    lastPosRef.current = coords

    // Draw single dot on click/tap
    drawDot(coords.x, coords.y)
  }

  const drawDot = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const effectCanvas = paintType === 'mosaic' ? mosaicCanvasRef.current : blurCanvasRef.current
    const pattern = ctx.createPattern(effectCanvas, 'no-repeat')
    if (pattern) {
      ctx.save()
      ctx.fillStyle = pattern
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  const drawStroke = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const effectCanvas = paintType === 'mosaic' ? mosaicCanvasRef.current : blurCanvasRef.current
    const pattern = ctx.createPattern(effectCanvas, 'no-repeat')
    if (pattern) {
      ctx.save()
      ctx.strokeStyle = pattern
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.restore()
    }

    lastPosRef.current = { x, y }
  }

  const handleDrawingMove = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current) return
    const coords = getCanvasCoords(clientX, clientY)
    if (!coords) return
    drawStroke(coords.x, coords.y)
  }

  const endDrawing = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false
      // Push the finished stroke to history and update effects
      regenerateEffects()
      // Overwrite the current history state with the updated canvas
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')!
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        setHistory((prev) => {
          const next = [...prev]
          next[historyIndex] = imgData
          return next
        })
      }
    }
  }

  // Rotation: 90 degrees clockwise
  const handleRotate = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    pushState()

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.height
    tempCanvas.height = canvas.width
    const tempCtx = tempCanvas.getContext('2d')!

    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2)
    tempCtx.rotate((90 * Math.PI) / 180)
    tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)

    canvas.width = tempCanvas.width
    canvas.height = tempCanvas.height
    ctx.drawImage(tempCanvas, 0, 0)

    regenerateEffects()

    // Overwrite the updated rotation back into history
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => {
      const next = [...prev]
      next[historyIndex + 1] = imgData
      return next
    })
    setHistoryIndex((prev) => prev + 1)

    // If we're in rotate mode, re-init the tilt base and angle!
    if (mode === 'rotate') {
      initTiltBase()
      setTiltAngle(0)
    }
  }

  // Apply Crop
  const handleApplyCrop = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    pushState()

    const cropX = Math.round(cropBox.x * canvas.width)
    const cropY = Math.round(cropBox.y * canvas.height)
    const cropW = Math.round(cropBox.w * canvas.width)
    const cropH = Math.round(cropBox.h * canvas.height)

    if (cropW <= 10 || cropH <= 10) return // Avoid zero/tiny crops

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = cropW
    tempCanvas.height = cropH
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

    canvas.width = cropW
    canvas.height = cropH
    ctx.drawImage(tempCanvas, 0, 0)

    regenerateEffects()

    // Overwrite crop state back into history
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => {
      const next = [...prev]
      next[historyIndex + 1] = imgData
      return next
    })
    setHistoryIndex((prev) => prev + 1)

    // Reset crop box
    setCropRatio('free')
    setCropBox({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
    setMode('paint')
  }

  // Undo/Redo logic
  const handleUndo = () => {
    if (historyIndex <= 0) return
    cancelPendingAdjustRender()
    const prevIndex = historyIndex - 1
    setHistoryIndex(prevIndex)
    restoreHistoryState(prevIndex)
  }

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return
    cancelPendingAdjustRender()
    const nextIndex = historyIndex + 1
    setHistoryIndex(nextIndex)
    restoreHistoryState(nextIndex)
  }

  const restoreHistoryState = (index: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const imgData = history[index]
    if (!imgData) return

    canvas.width = imgData.width
    canvas.height = imgData.height
    ctx.putImageData(imgData, 0, 0)

    regenerateEffects()
  }

  // Crop Dragging handlers (Unified mouse/touch)
  const handleCropBoxDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const startX = clientX
    const startY = clientY
    const startBox = { ...cropBox }

    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY

      const dx = (currentX - startX) / rect.width
      const dy = (currentY - startY) / rect.height

      let nextX = startBox.x + dx
      let nextY = startBox.y + dy

      nextX = Math.max(0, Math.min(1 - startBox.w, nextX))
      nextY = Math.max(0, Math.min(1 - startBox.h, nextY))

      setCropBox((prev) => ({ ...prev, x: nextX, y: nextY }))
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
  }

  const handleHandleDragStart = (e: React.MouseEvent | React.TouchEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const startX = clientX
    const startY = clientY
    const startBox = { ...cropBox }

    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY

      const dx = (currentX - startX) / rect.width
      const dy = (currentY - startY) / rect.height

      let x = startBox.x
      let y = startBox.y
      let w = startBox.w
      let h = startBox.h

      const minSize = 0.08

      const canvas = canvasRef.current
      const ratioVal = getRatioVal(cropRatio)

      if (canvas && ratioVal !== null) {
        const A_canvas = canvas.width / canvas.height
        const r_rel = ratioVal / A_canvas
        if (handle === 'e' || handle === 's' || handle === 'se') {
          let dw = 0
          if (handle === 'e') {
            dw = dx
          } else if (handle === 's') {
            dw = dy * r_rel
          } else {
            dw = Math.abs(dx) > Math.abs(dy * r_rel) ? dx : dy * r_rel
          }
          const maxW = Math.min(1 - startBox.x, (1 - startBox.y) * r_rel)
          w = Math.max(minSize, Math.min(maxW, startBox.w + dw))
          h = w / r_rel
        } else if (handle === 'w' || handle === 'n' || handle === 'nw') {
          let dw = 0
          if (handle === 'w') {
            dw = -dx
          } else if (handle === 'n') {
            dw = -dy * r_rel
          } else {
            dw = Math.abs(dx) > Math.abs(dy * r_rel) ? -dx : -dy * r_rel
          }
          const right = startBox.x + startBox.w
          const bottom = startBox.y + startBox.h
          const maxW = Math.min(right, bottom * r_rel)
          w = Math.max(minSize, Math.min(maxW, startBox.w + dw))
          h = w / r_rel
          x = right - w
          y = bottom - h
        } else if (handle === 'ne') {
          const dw = Math.abs(dx) > Math.abs(dy * r_rel) ? dx : -dy * r_rel
          const bottom = startBox.y + startBox.h
          const maxW = Math.min(1 - startBox.x, bottom * r_rel)
          w = Math.max(minSize, Math.min(maxW, startBox.w + dw))
          h = w / r_rel
          y = bottom - h
        } else if (handle === 'sw') {
          const dw = Math.abs(dx) > Math.abs(dy * r_rel) ? -dx : dy * r_rel
          const right = startBox.x + startBox.w
          const maxW = Math.min(right, (1 - startBox.y) * r_rel)
          w = Math.max(minSize, Math.min(maxW, startBox.w + dw))
          h = w / r_rel
          x = right - w
        }
      } else {
        if (handle.includes('e')) {
          w = Math.max(minSize, Math.min(1 - x, startBox.w + dx))
        }
        if (handle.includes('w')) {
          const newX = Math.max(0, Math.min(startBox.x + startBox.w - minSize, startBox.x + dx))
          w = startBox.w + (startBox.x - newX)
          x = newX
        }
        if (handle.includes('s')) {
          h = Math.max(minSize, Math.min(1 - y, startBox.h + dy))
        }
        if (handle.includes('n')) {
          const newY = Math.max(0, Math.min(startBox.y + startBox.h - minSize, startBox.y + dy))
          h = startBox.h + (startBox.y - newY)
          y = newY
        }
      }

      setCropBox({ x, y, w, h })
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
  }

  // Dynamic cursor style representing current brush size
  const getCursorStyle = () => {
    if (mode !== 'paint') return 'default'
    const visualSize = Math.max(10, Math.round(brushSize * canvasScale))
    if (visualSize > 120) {
      return 'crosshair'
    }
    const half = visualSize / 2
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${visualSize}" height="${visualSize}" viewBox="0 0 ${visualSize} ${visualSize}"><circle cx="${half}" cy="${half}" r="${half - 1.5}" fill="rgba(255, 255, 255, 0.2)" stroke="white" stroke-width="1"/><circle cx="${half}" cy="${half}" r="${half - 0.5}" fill="none" stroke="black" stroke-width="0.75"/></svg>`
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${half} ${half}, crosshair`
  }

  // Handle Save
  const handleSaveClick = async () => {
    if (isApplyingText) return
    // 예약된 밝기/선명도 미리보기가 남아 있으면 먼저 캔버스에 반영
    flushAdjustRender()

    const canvas = canvasRef.current
    if (!canvas) return

    let sourceCanvas = canvas
    const pendingTextLayers = mode === 'text' ? getDrawableTextLayers(textLayers) : []

    if (pendingTextLayers.length > 0) {
      setIsApplyingText(true)
      await ensureTextFontLoaded(pendingTextLayers)
      sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = canvas.width
      sourceCanvas.height = canvas.height
      const sourceContext = sourceCanvas.getContext('2d')
      if (!sourceContext) {
        setIsApplyingText(false)
        return
      }
      sourceContext.drawImage(canvas, 0, 0)
      drawTextLayers(sourceContext, sourceCanvas, pendingTextLayers.map((layer) => ({
        ...layer,
        position: clampCurrentTextPosition(layer.position, layer),
      })))
      setIsApplyingText(false)
    }

    let outputCanvas = sourceCanvas

    if (outputSize) {
      const targetRatio = outputSize.width / outputSize.height
      const sourceRatio = sourceCanvas.width / sourceCanvas.height
      let sourceX = 0
      let sourceY = 0
      let sourceWidth = sourceCanvas.width
      let sourceHeight = sourceCanvas.height

      if (sourceRatio > targetRatio) {
        sourceWidth = sourceCanvas.height * targetRatio
        sourceX = (sourceCanvas.width - sourceWidth) / 2
      } else if (sourceRatio < targetRatio) {
        sourceHeight = sourceCanvas.width / targetRatio
        sourceY = (sourceCanvas.height - sourceHeight) / 2
      }

      outputCanvas = document.createElement('canvas')
      outputCanvas.width = outputSize.width
      outputCanvas.height = outputSize.height
      const outputContext = outputCanvas.getContext('2d')
      if (!outputContext) return

      outputContext.imageSmoothingEnabled = true
      outputContext.imageSmoothingQuality = 'high'
      outputContext.drawImage(
        sourceCanvas,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputSize.width,
        outputSize.height,
      )
    } else if (fitOutputSize) {
      const scale = Math.min(
        1,
        fitOutputSize.width / sourceCanvas.width,
        fitOutputSize.height / sourceCanvas.height,
      )
      if (scale < 1) {
        outputCanvas = document.createElement('canvas')
        outputCanvas.width = Math.max(1, Math.round(sourceCanvas.width * scale))
        outputCanvas.height = Math.max(1, Math.round(sourceCanvas.height * scale))
        const outputContext = outputCanvas.getContext('2d')
        if (!outputContext) return
        outputContext.imageSmoothingEnabled = true
        outputContext.imageSmoothingQuality = 'high'
        outputContext.drawImage(
          sourceCanvas,
          0,
          0,
          sourceCanvas.width,
          sourceCanvas.height,
          0,
          0,
          outputCanvas.width,
          outputCanvas.height,
        )
      }
    }

    outputCanvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'edited_image.png', { type: 'image/png' })
      onSave(file)
    }, 'image/png')
  }

  const cropRatioOptions: CropRatioOption[] = [
    { label: t('imageEditor.free'), value: 'free' },
    { label: '1:1', value: '1:1' },
    { label: '21:5', value: '21:5' },
    { label: '16:9', value: '16:9' },
    { label: '4:3', value: '4:3' },
    { label: '3:4', value: '3:4' },
    { label: '9:16', value: '9:16' },
    ...(showInstagramCropPreset
      ? [{ label: '4:5', value: '4:5', instagram: true }]
      : []),
    { label: t('imageEditor.custom'), value: 'custom' },
  ]

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-[4px]" aria-hidden="true" />
        </TransitionChild>

        <div className="di-image-editor-scroll fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            {/* PC 는 편집 영역이 클수록 정확하게 다듬을 수 있어 화면 폭을 넓게 쓴다.
                (모바일은 하단 툴 시트가 화면을 나눠 쓰므로 기존 비율을 유지) */}
            {/* 높이는 vh 가 아니라 dvh 다 — vh 는 주소창이 펼쳐진 상태를 반영하지 못해
                모바일에서 패널 아래쪽(저장 버튼)이 화면 밖으로 잘린다. */}
            <DialogPanel className="w-full max-w-5xl md:max-w-6xl xl:max-w-7xl bg-neutral-900 text-neutral-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90dvh]">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
                <DialogTitle className="text-base font-semibold text-neutral-100">
                  {t('imageEditor.title')}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 transition-all duration-150"
                    title={t('imageEditor.undo')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 transition-all duration-150"
                    title={t('imageEditor.redo')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2m18-8l-6 6m6-6l-6-6" />
                    </svg>
                  </button>
                  <div className="h-4 w-px bg-neutral-800 mx-1" />
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all duration-150"
                    title={t('imageEditor.close')}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                {/* Left Sidebar Toolbar (for Desktop/Large screens) */}
                <div className="hidden md:flex flex-col gap-6 w-64 xl:w-72 shrink-0 border-r border-neutral-800 p-5 xl:p-6 bg-neutral-900/30">
                  <div className="space-y-4">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.tools')}</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleModeChange('paint')}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs gap-1.5 transition-all duration-150 ${
                          mode === 'paint'
                            ? 'bg-primary-600 border-primary-500 text-white font-medium shadow-lg shadow-primary-900/20'
                            : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {t('imageEditor.brush')}
                      </button>
                      <button
                        onClick={() => handleModeChange('crop')}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs gap-1.5 transition-all duration-150 ${
                          mode === 'crop'
                            ? 'bg-primary-600 border-primary-500 text-white font-medium shadow-lg shadow-primary-900/20'
                            : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v14a2 2 0 002 2h14M18 22V10a2 2 0 00-2-2H2" />
                        </svg>
                        {t('imageEditor.crop')}
                      </button>
                      <button
                        onClick={() => handleModeChange('rotate')}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs gap-1.5 transition-all duration-150 ${
                          mode === 'rotate'
                            ? 'bg-primary-600 border-primary-500 text-white font-medium shadow-lg shadow-primary-900/20'
                            : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                        </svg>
                        {t('imageEditor.rotate')}
                      </button>
                      <button
                        onClick={() => handleModeChange('text')}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs gap-1.5 transition-all duration-150 ${
                          mode === 'text'
                            ? 'bg-primary-600 border-primary-500 text-white font-medium shadow-lg shadow-primary-900/20'
                            : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 5h12M12 5v14m-4 0h8" />
                        </svg>
                        {t('imageEditor.text')}
                      </button>
                      <button
                        onClick={() => handleModeChange('resize')}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs gap-1.5 transition-all duration-150 ${
                          mode === 'resize'
                            ? 'bg-primary-600 border-primary-500 text-white font-medium shadow-lg shadow-primary-900/20'
                            : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                        </svg>
                        {t('imageEditor.resize')}
                      </button>
                      <button
                        onClick={() => handleModeChange('adjust')}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs gap-1.5 transition-all duration-150 ${
                          mode === 'adjust'
                            ? 'bg-primary-600 border-primary-500 text-white font-medium shadow-lg shadow-primary-900/20'
                            : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m-6.364-2.636l1.061-1.061m10.606-10.606l1.061-1.061M3 12h1.5m15 0H21M5.636 5.636l1.061 1.061m10.606 10.606l1.061 1.061M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {t('imageEditor.adjust')}
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-800" />

                  {/* Mode Specific Controls */}
                  <div className="di-image-editor-scroll flex-1 space-y-5 overflow-y-auto pr-1">
                    {mode === 'paint' && (
                      <>
                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.effectType')}</span>
                          <div className="flex rounded-lg overflow-hidden bg-neutral-800 p-1 border border-neutral-700">
                            <button
                              onClick={() => setPaintType('mosaic')}
                              className={`flex-1 py-1.5 text-xs rounded-md transition-all duration-150 ${
                                paintType === 'mosaic' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              {t('imageEditor.mosaic')}
                            </button>
                            <button
                              onClick={() => setPaintType('blur')}
                              className={`flex-1 py-1.5 text-xs rounded-md transition-all duration-150 ${
                                paintType === 'blur' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              {t('imageEditor.blur')}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.brushSize')}</span>
                            <span className="text-xs font-mono text-neutral-300">{brushSize}px</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                          />
                          <div className="flex justify-center items-center h-16 bg-neutral-950/40 rounded-xl border border-neutral-800/60">
                            <div
                              className="bg-neutral-100 rounded-full opacity-60 transition-all duration-75"
                              style={{ width: `${brushSize}px`, height: `${brushSize}px` }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {mode === 'crop' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.cropRatio')}</span>
                          {fixedRatio ? (
                            <div className="text-xs text-neutral-300 bg-neutral-800 p-3 rounded-xl border border-neutral-700 font-medium">
                              {t('imageEditor.fixedRatio', { ratio: fixedRatio })}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {cropRatioOptions.map((opt) => (
                                <div key={opt.value} className="group relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCropRatio(opt.value)
                                      setCropBox(getInitialCropBoxForRatio(opt.value))
                                    }}
                                    aria-label={opt.instagram
                                      ? `${opt.label}, ${t('imageEditor.instagramResolution')}`
                                      : opt.label}
                                    className={`w-full py-2 px-3 text-xs rounded-xl border transition-all duration-150 ${
                                      cropRatio === opt.value
                                        ? 'bg-neutral-700 border-neutral-600 text-white font-medium shadow-md shadow-neutral-950/20'
                                        : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                  {opt.instagram && (
                                    <span
                                      role="tooltip"
                                      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-neutral-800 opacity-0 shadow-lg transition-opacity after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-white group-hover:opacity-100 group-focus-within:opacity-100"
                                    >
                                      {t('imageEditor.instagramResolution')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {recommendedResolution && (
                            <div className="text-xs leading-relaxed text-amber-200 bg-amber-950/30 p-3 rounded-xl border border-amber-800/60">
                              {recommendedResolution}
                            </div>
                          )}

                          {cropRatio === 'custom' && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-neutral-950/40 rounded-xl border border-neutral-800">
                              <div className="flex-1 flex flex-col gap-1">
                                <label className="text-[10px] text-neutral-400 font-medium">{t('imageEditor.widthRatio')}</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={customRatioW}
                                  onChange={(e) => handleCustomRatioChange(e.target.value, customRatioH)}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary-500"
                                />
                              </div>
                              <span className="text-neutral-500 self-end mb-1.5">:</span>
                              <div className="flex-1 flex flex-col gap-1">
                                <label className="text-[10px] text-neutral-400 font-medium">{t('imageEditor.heightRatio')}</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={customRatioH}
                                  onChange={(e) => handleCustomRatioChange(customRatioW, e.target.value)}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary-500"
                                />
                              </div>
                            </div>
                          )}
                          {showInstagramCropPreset && (
                            <p className="text-xs leading-relaxed text-amber-200">
                              {t('imageEditor.instagramRecommendedRatio')}
                            </p>
                          )}
                        </div>

                        <div className="h-px bg-neutral-800" />

                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.cropAction')}</span>
                          <p className="text-xs text-neutral-400 leading-relaxed">
                            {t('imageEditor.cropHint')}
                          </p>
                          <button
                            onClick={handleApplyCrop}
                            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-semibold shadow-lg shadow-amber-950/20 transition-all duration-150"
                          >
                            {t('imageEditor.applyCrop')}
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === 'rotate' && (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.tilt')}</span>
                            <span className="text-xs font-mono text-neutral-300">{tiltAngle}°</span>
                          </div>
                          <input
                            type="range"
                            min="-45"
                            max="45"
                            value={tiltAngle}
                            onChange={(e) => handleTiltSliderChange(Number(e.target.value))}
                            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                          />
                          <p className="text-xs text-neutral-400 leading-relaxed">
                            {t('imageEditor.tiltZoomHint')}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTiltSliderChange(0)}
                              disabled={tiltAngle === 0}
                              className="flex-1 py-1.5 text-xs rounded-lg border border-neutral-700 bg-neutral-800/40 hover:bg-neutral-800 text-neutral-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-150"
                            >
                              {t('imageEditor.resetTilt')}
                            </button>
                            <button
                              onClick={handleApplyTilt}
                              disabled={tiltAngle === 0}
                              className="flex-1 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-30 transition-all duration-150"
                            >
                              {t('imageEditor.applyTilt')}
                            </button>
                          </div>
                        </div>

                        <div className="h-px bg-neutral-800" />

                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.rotate90')}</span>
                          <button
                            onClick={handleRotate}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800/40 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition-all duration-150"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                            </svg>
                            {t('imageEditor.rotateClockwise')}
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === 'resize' && (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.resizeAction')}</span>
                          <div className="flex items-center gap-2 p-2 bg-neutral-950/40 rounded-xl border border-neutral-800">
                            <div className="flex-1 flex flex-col gap-1">
                              <label className="text-[10px] text-neutral-400 font-medium">{t('imageEditor.widthPx')}</label>
                              <input
                                type="number"
                                min="1"
                                value={resizeW}
                                onChange={(e) => handleResizeWChange(e.target.value)}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary-500"
                              />
                            </div>
                            <span className="text-neutral-500 self-end mb-2">×</span>
                            <div className="flex-1 flex flex-col gap-1">
                              <label className="text-[10px] text-neutral-400 font-medium">{t('imageEditor.heightPx')}</label>
                              <input
                                type="number"
                                min="1"
                                value={resizeH}
                                onChange={(e) => handleResizeHChange(e.target.value)}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary-500"
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-300">
                            <input
                              type="checkbox"
                              checked={keepAspectRatio}
                              onChange={(e) => setKeepAspectRatio(e.target.checked)}
                              className="rounded border-neutral-700 bg-neutral-800 text-primary-600 focus:ring-primary-500/30 font-sans"
                            />
                            {t('imageEditor.keepRatio')}
                          </label>
                        </div>

                        <button
                          onClick={handleApplyResize}
                          className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-950/20 transition-all duration-150"
                        >
                          {t('imageEditor.applyResize')}
                        </button>
                      </div>
                    )}

                    {mode === 'adjust' && (
                      <div className="space-y-4">
                        <div className="space-y-4">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.adjustAction')}</span>

                          {ADJUST_SLIDERS.map((slider) => (
                            <div key={slider.key} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label htmlFor={`adjust-${slider.key}`} className="text-xs text-neutral-300">
                                  {t(slider.labelKey)}
                                </label>
                                <span className="text-xs font-mono text-neutral-400">
                                  {adjustValues[slider.key] - ADJUST_DEFAULT > 0 ? '+' : ''}
                                  {adjustValues[slider.key] - ADJUST_DEFAULT}
                                </span>
                              </div>
                              <input
                                id={`adjust-${slider.key}`}
                                type="range"
                                min={slider.min}
                                max={slider.max}
                                value={adjustValues[slider.key]}
                                onChange={(e) => handleAdjustChange(slider.key, Number(e.target.value))}
                                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleResetAdjust}
                            disabled={!hasPendingAdjust}
                            className="flex-1 py-1.5 text-xs rounded-lg border border-neutral-700 bg-neutral-800/40 hover:bg-neutral-800 text-neutral-300 disabled:opacity-30 transition-all duration-150"
                          >
                            {t('imageEditor.reset')}
                          </button>
                          <button
                            onClick={handleApplyAdjust}
                            disabled={!hasPendingAdjust}
                            className="flex-1 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-30 transition-all duration-150"
                          >
                            {t('imageEditor.applyAdjust')}
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === 'text' && (
                      <TextControls
                        idPrefix="image-text-desktop"
                        layers={textLayers}
                        activeLayer={activeTextLayer}
                        isApplying={isApplyingText}
                        onSelectLayer={handleSelectTextLayer}
                        onAddLayer={handleAddTextLayer}
                        onRemoveLayer={handleRemoveTextLayer}
                        onChange={handleTextStyleChange}
                        onPositionChange={handleTextPositionChange}
                        onApply={() => { void handleApplyText() }}
                      />
                    )}
                  </div>

                </div>
                
                {/* Canvas Viewport (Center)
                    캔버스 세로 상한은 모달 높이(90vh)에서 헤더·푸터·여백을 뺀 값 안에 들어가야 한다.
                    66vh 는 세로 720px 화면에서도 잘리지 않는 상한이다. */}
                <div className="flex-1 min-w-0 flex items-center justify-center p-4 md:p-5 bg-neutral-950/20 overflow-hidden relative">
                  <div
                    ref={containerRef}
                    className="relative inline-block overflow-hidden max-w-full max-h-full border border-neutral-800 rounded-lg shadow-xl"
                  >
                    <canvas
                      ref={canvasRef}
                      className="block max-w-full max-h-[50vh] md:max-h-[66vh] h-auto w-auto object-contain select-none bg-neutral-900"
                      onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
                      onMouseMove={(e) => handleDrawingMove(e.clientX, e.clientY)}
                      onMouseUp={endDrawing}
                      onMouseLeave={endDrawing}
                      onTouchStart={(e) => {
                        const touch = e.touches[0]
                        startDrawing(touch.clientX, touch.clientY)
                      }}
                      onTouchMove={(e) => {
                        const touch = e.touches[0]
                        handleDrawingMove(touch.clientX, touch.clientY)
                      }}
                      onTouchEnd={endDrawing}
                      style={{
                        touchAction: mode === 'paint' ? 'none' : 'auto',
                        cursor: getCursorStyle(),
                      }}
                    />

                    {/* Text preview / drag layer — intrinsic size mirrors the image canvas. */}
                    <canvas
                      ref={textOverlayCanvasRef}
                      aria-label={t('imageEditor.textPositionCanvas')}
                      className="absolute inset-0 block h-full w-full select-none"
                      onPointerDown={handleTextPointerDown}
                      onPointerMove={handleTextPointerMove}
                      onPointerUp={handleTextPointerEnd}
                      onPointerCancel={handleTextPointerEnd}
                      style={{
                        pointerEvents: mode === 'text' ? 'auto' : 'none',
                        touchAction: mode === 'text' ? 'none' : 'auto',
                        cursor: mode === 'text' && textLayers.some(hasTextContent)
                          ? (isDraggingText ? 'grabbing' : 'grab')
                          : 'default',
                      }}
                    />

                    {/* Crop Overlay */}
                    {mode === 'crop' && (
                      <div className="absolute inset-0 select-none overflow-hidden bg-transparent">
                        <div
                          className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move transition-shadow"
                          style={{
                            left: `${cropBox.x * 100}%`,
                            top: `${cropBox.y * 100}%`,
                            width: `${cropBox.w * 100}%`,
                            height: `${cropBox.h * 100}%`,
                          }}
                          onMouseDown={handleCropBoxDragStart}
                          onTouchStart={handleCropBoxDragStart}
                        >
                          {/* Grid Lines */}
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                            <div className="border-r border-dashed border-white/30 border-b border-white/30" />
                            <div className="border-r border-dashed border-white/30 border-b border-white/30" />
                            <div className="border-b border-white/30" />
                            <div className="border-r border-dashed border-white/30 border-b border-white/30" />
                            <div className="border-r border-dashed border-white/30 border-b border-white/30" />
                            <div className="border-b border-white/30" />
                            <div className="border-r border-dashed border-white/30" />
                            <div className="border-r border-dashed border-white/30" />
                            <div />
                          </div>

                          {/* Handles */}
                          {/* NW */}
                          <div
                            className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border border-neutral-900 rounded-sm cursor-nwse-resize z-10 flex items-center justify-center active:scale-125 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'nw')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'nw')}
                          />
                          {/* NE */}
                          <div
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-neutral-900 rounded-sm cursor-nesw-resize z-10 flex items-center justify-center active:scale-125 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'ne')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'ne')}
                          />
                          {/* SW */}
                          <div
                            className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border border-neutral-900 rounded-sm cursor-nesw-resize z-10 flex items-center justify-center active:scale-125 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'sw')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'sw')}
                          />
                          {/* SE */}
                          <div
                            className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border border-neutral-900 rounded-sm cursor-nwse-resize z-10 flex items-center justify-center active:scale-125 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'se')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'se')}
                          />
                          {/* N */}
                          <div
                            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-white border border-neutral-900 rounded-sm cursor-ns-resize z-10 active:scale-110 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'n')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'n')}
                          />
                          {/* S */}
                          <div
                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-white border border-neutral-900 rounded-sm cursor-ns-resize z-10 active:scale-110 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 's')}
                            onTouchStart={(e) => handleHandleDragStart(e, 's')}
                          />
                          {/* W */}
                          <div
                            className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-6 bg-white border border-neutral-900 rounded-sm cursor-ew-resize z-10 active:scale-110 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'w')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'w')}
                          />
                          {/* E */}
                          <div
                            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-6 bg-white border border-neutral-900 rounded-sm cursor-ew-resize z-10 active:scale-110 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'e')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'e')}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Toolbar for Mobile (Hidden on Desktop) */}
                <div className="di-image-editor-scroll flex max-h-[48vh] flex-col gap-4 overflow-y-auto border-t border-neutral-800 bg-neutral-900/60 p-4 md:hidden">
                  
                  {/* Tool Swapper */}
                  <div className="grid grid-cols-6 gap-1.5">
                    <button
                      onClick={() => handleModeChange('paint')}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-[10px] font-semibold gap-1 ${
                        mode === 'paint' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      {t('imageEditor.brush')}
                    </button>
                    <button
                      onClick={() => handleModeChange('crop')}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-[10px] font-semibold gap-1 ${
                        mode === 'crop' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v14a2 2 0 002 2h14M18 22V10a2 2 0 00-2-2H2" />
                      </svg>
                      {t('imageEditor.crop')}
                    </button>
                    <button
                      onClick={() => handleModeChange('rotate')}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-[10px] font-semibold gap-1 ${
                        mode === 'rotate' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                      </svg>
                      {t('imageEditor.rotateShort')}
                    </button>
                    <button
                      onClick={() => handleModeChange('text')}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-[10px] font-semibold gap-1 ${
                        mode === 'text' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 5h12M12 5v14m-4 0h8" />
                      </svg>
                      {t('imageEditor.textShort')}
                    </button>
                    <button
                      onClick={() => handleModeChange('adjust')}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-[10px] font-semibold gap-1 ${
                        mode === 'adjust' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m-6.364-2.636l1.061-1.061m10.606-10.606l1.061-1.061M3 12h1.5m15 0H21M5.636 5.636l1.061 1.061m10.606 10.606l1.061 1.061M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {t('imageEditor.adjustShort')}
                    </button>
                    <button
                      onClick={() => handleModeChange('resize')}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-[10px] font-semibold gap-1 ${
                        mode === 'resize' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                      {t('imageEditor.resize')}
                    </button>
                  </div>

                  {/* Mode Specific settings for Mobile */}
                  {mode === 'paint' && (
                    <div className="flex items-center gap-3">
                      {/* Selector */}
                      <div className="flex rounded-lg overflow-hidden bg-neutral-800 p-0.5 border border-neutral-700 shrink-0">
                        <button
                          onClick={() => setPaintType('mosaic')}
                          className={`px-3 py-1.5 text-xs rounded-md ${
                            paintType === 'mosaic' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400'
                          }`}
                        >
                          {t('imageEditor.mosaic')}
                        </button>
                        <button
                          onClick={() => setPaintType('blur')}
                          className={`px-3 py-1.5 text-xs rounded-md ${
                            paintType === 'blur' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400'
                          }`}
                        >
                          {t('imageEditor.blur')}
                        </button>
                      </div>
                      {/* Slider */}
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="range"
                          min="10"
                          max="80"
                          value={brushSize}
                          onChange={(e) => setBrushSize(Number(e.target.value))}
                          className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                        <span className="text-[10px] font-mono text-neutral-400 shrink-0">{brushSize}px</span>
                      </div>
                    </div>
                  )}

                  {mode === 'crop' && (
                    <div className="flex flex-col gap-3">
                      {/* Crop Ratio Selector (horizontal scroll) */}
                      {fixedRatio ? (
                        <div className="text-xs text-neutral-300 bg-neutral-800 p-2.5 rounded-lg border border-neutral-700 font-medium">
                          {t('imageEditor.fixedRatio', { ratio: fixedRatio })}
                        </div>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-1 pt-8 scrollbar-none">
                          {cropRatioOptions.map((opt) => (
                            <div key={opt.value} className="group relative shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setCropRatio(opt.value)
                                  setCropBox(getInitialCropBoxForRatio(opt.value))
                                }}
                                aria-label={opt.instagram
                                  ? `${opt.label}, ${t('imageEditor.instagramResolution')}`
                                  : opt.label}
                                className={`py-1.5 px-3 text-xs rounded-lg border transition-all duration-150 ${
                                  cropRatio === opt.value
                                    ? 'bg-neutral-700 border-neutral-600 text-white font-medium shadow-md shadow-neutral-950/20'
                                    : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-400'
                                }`}
                              >
                                {opt.label}
                              </button>
                              {opt.instagram && (
                                <span
                                  role="tooltip"
                                  className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-neutral-800 opacity-0 shadow-lg transition-opacity after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-white group-hover:opacity-100 group-focus-within:opacity-100"
                                >
                                  {t('imageEditor.instagramResolution')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {recommendedResolution && (
                        <div className="text-[11px] leading-relaxed text-amber-200 bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/60">
                          {recommendedResolution}
                        </div>
                      )}

                      {!fixedRatio && cropRatio === 'custom' && (
                        <div className="flex items-center gap-2 p-1.5 bg-neutral-950/40 rounded-lg border border-neutral-800">
                          <div className="flex-1 flex items-center gap-1">
                            <span className="text-[10px] text-neutral-400 whitespace-nowrap">{t('imageEditor.widthRatio')}</span>
                            <input
                              type="number"
                              min="1"
                              value={customRatioW}
                              onChange={(e) => handleCustomRatioChange(e.target.value, customRatioH)}
                              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-1.5 py-0.5 text-xs text-white"
                            />
                          </div>
                          <span className="text-neutral-500">:</span>
                          <div className="flex-1 flex items-center gap-1">
                            <span className="text-[10px] text-neutral-400 whitespace-nowrap">{t('imageEditor.heightRatio')}</span>
                            <input
                              type="number"
                              min="1"
                              value={customRatioH}
                              onChange={(e) => handleCustomRatioChange(customRatioW, e.target.value)}
                              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-1.5 py-0.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      )}
                      {showInstagramCropPreset && (
                        <p className="text-[11px] leading-relaxed text-amber-200">
                          {t('imageEditor.instagramRecommendedRatio')}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[11px] text-neutral-400">{t('imageEditor.cropHintMobile')}</span>
                        <button
                          onClick={handleApplyCrop}
                          className="py-1.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shrink-0 shadow-lg shadow-amber-950/20"
                        >
                          {t('imageEditor.applyCrop')}
                        </button>
                      </div>
                    </div>
                  )}

                  {mode === 'rotate' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-neutral-400 shrink-0">{t('imageEditor.tilt')}</span>
                        <input
                          type="range"
                          min="-45"
                          max="45"
                          value={tiltAngle}
                          onChange={(e) => handleTiltSliderChange(Number(e.target.value))}
                          className="flex-1 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                        <span className="text-xs font-mono text-neutral-300 w-10 text-right">{tiltAngle}°</span>
                      </div>

                      <p className="text-[11px] leading-relaxed text-neutral-400">
                        {t('imageEditor.tiltZoomHint')}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={handleRotate}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/40 text-neutral-300 text-xs font-medium"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                          </svg>
                          {t('imageEditor.rotate90')}
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleTiltSliderChange(0)}
                            disabled={tiltAngle === 0}
                            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-700 bg-neutral-800/40 text-neutral-300 disabled:opacity-30"
                          >
                            {t('imageEditor.reset')}
                          </button>
                          <button
                            onClick={handleApplyTilt}
                            disabled={tiltAngle === 0}
                            className="px-4 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-30"
                          >
                            {t('imageEditor.applyTilt')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === 'resize' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 p-1.5 bg-neutral-950/40 rounded-lg border border-neutral-800">
                        <div className="flex-1 flex items-center gap-1.5">
                          <span className="text-[10px] text-neutral-400">{t('imageEditor.width')}</span>
                          <input
                            type="number"
                            min="1"
                            value={resizeW}
                            onChange={(e) => handleResizeWChange(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-1.5 py-0.5 text-xs text-white"
                          />
                        </div>
                        <span className="text-neutral-500">×</span>
                        <div className="flex-1 flex items-center gap-1.5">
                          <span className="text-[10px] text-neutral-400">{t('imageEditor.height')}</span>
                          <input
                            type="number"
                            min="1"
                            value={resizeH}
                            onChange={(e) => handleResizeHChange(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-1.5 py-0.5 text-xs text-white"
                          />
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-neutral-300 whitespace-nowrap ml-1">
                          <input
                            type="checkbox"
                            checked={keepAspectRatio}
                            onChange={(e) => setKeepAspectRatio(e.target.checked)}
                            className="rounded border-neutral-700 bg-neutral-800 text-primary-600 focus:ring-primary-500/30"
                          />
                          {t('imageEditor.keepRatioShort')}
                        </label>
                      </div>

                      <button
                        onClick={handleApplyResize}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-amber-950/20"
                      >
                        {t('imageEditor.applyResize')}
                      </button>
                    </div>
                  )}

                  {mode === 'text' && (
                    <TextControls
                      idPrefix="image-text-mobile"
                      compact
                      layers={textLayers}
                      activeLayer={activeTextLayer}
                      isApplying={isApplyingText}
                      onSelectLayer={handleSelectTextLayer}
                      onAddLayer={handleAddTextLayer}
                      onRemoveLayer={handleRemoveTextLayer}
                      onChange={handleTextStyleChange}
                      onPositionChange={handleTextPositionChange}
                      onApply={() => { void handleApplyText() }}
                    />
                  )}

                  {mode === 'adjust' && (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                        {ADJUST_SLIDERS.map((slider) => (
                          <div key={slider.key} className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <label
                                htmlFor={`adjust-mobile-${slider.key}`}
                                className="text-[11px] font-medium text-neutral-400 truncate"
                              >
                                {t(slider.labelKey)}
                              </label>
                              <span className="text-[10px] font-mono text-neutral-300 shrink-0">
                                {adjustValues[slider.key] - ADJUST_DEFAULT > 0 ? '+' : ''}
                                {adjustValues[slider.key] - ADJUST_DEFAULT}
                              </span>
                            </div>
                            <input
                              id={`adjust-mobile-${slider.key}`}
                              type="range"
                              min={slider.min}
                              max={slider.max}
                              value={adjustValues[slider.key]}
                              onChange={(e) => handleAdjustChange(slider.key, Number(e.target.value))}
                              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={handleResetAdjust}
                          disabled={!hasPendingAdjust}
                          className="px-3 py-1.5 text-xs rounded-lg border border-neutral-700 bg-neutral-800/40 text-neutral-300 disabled:opacity-30"
                        >
                          {t('imageEditor.reset')}
                        </button>
                        <button
                          onClick={handleApplyAdjust}
                          disabled={!hasPendingAdjust}
                          className="px-4 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-30"
                        >
                          {t('imageEditor.applyAdjust')}
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-900/80">
                <button
                  onClick={onClose}
                  disabled={isSaving || isApplyingText}
                  className="px-5 py-2.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition-all duration-150 disabled:opacity-50"
                >
                  {t('imageEditor.cancel')}
                </button>
                <button
                  onClick={() => { void handleSaveClick() }}
                  disabled={isSaving || isApplyingText}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 active:bg-primary-700 disabled:bg-primary-700 text-white text-xs font-semibold shadow-lg shadow-primary-900/20 flex items-center gap-2 transition-all duration-150"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('imageEditor.saving')}
                    </>
                  ) : (
                    t('imageEditor.apply')
                  )}
                </button>
              </div>

            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
