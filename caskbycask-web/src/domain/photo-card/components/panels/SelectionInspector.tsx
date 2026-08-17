import { lazy, Suspense, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { photoCardApi } from '../../api/photoCardApi'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import type { PhotoCardBinding, PhotoCardTextAlign } from '../../types/photoCard.types'
import { PHOTO_CARD_BINDINGS, PHOTO_CARD_MAX_TEXT_LENGTH } from '../../utils/layoutSchema'
import { frameSizeOf } from '../../utils/photoCardRender'
import { PHOTO_CARD_MAX_EDGE } from '../../constants/photoCardRatios'
import { alignLayers, distributeLayers, type AlignMode } from '../../utils/photoCardSnap'
import { resolveLayerText } from '../../utils/resolveBindings'
import { ColorField, PanelButton, Section, SegmentedField, SliderField } from './controls'
import FontPicker from './FontPicker'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

// 2800줄짜리 편집기다. 실제로 그림을 고칠 때만 내려받는다.
const ImageEditorModal = lazy(() => import('@/shared/components/ImageEditorModal'))

interface Props {
  editor: PhotoCardEditor
  canvasRef: RefObject<HTMLCanvasElement | null>
}

const ALIGN_ROWS: { mode: AlignMode; labelKey: string; icon: string }[][] = [
  [
    { mode: 'left', labelKey: 'photoCard.alignObjectsLeft', icon: 'M3 3h2v18H3V3zm4 4h11v4H7V7zm0 6h7v4H7v-4z' },
    { mode: 'centerX', labelKey: 'photoCard.alignObjectsCenterX', icon: 'M11 3h2v3h5v4h-5v4h3v4h-3v3h-2v-3H8v-4h3v-4H6V6h5V3z' },
    { mode: 'right', labelKey: 'photoCard.alignObjectsRight', icon: 'M19 3h2v18h-2V3zM6 7h11v4H6V7zm4 6h7v4h-7v-4z' },
  ],
  [
    { mode: 'top', labelKey: 'photoCard.alignObjectsTop', icon: 'M3 3h18v2H3V3zm4 4h4v11H7V7zm6 0h4v7h-4V7z' },
    { mode: 'middleY', labelKey: 'photoCard.alignObjectsMiddleY', icon: 'M3 11h3V6h4v5h4V8h4v3h3v2h-3v3h-4v-3h-4v5H6v-5H3v-2z' },
    { mode: 'bottom', labelKey: 'photoCard.alignObjectsBottom', icon: 'M3 19h18v2H3v-2zM7 6h4v11H7V6zm6 4h4v7h-4v-7z' },
  ],
]

/**
 * 선택한 요소의 속성.
 *
 * 도구와 무관하게 오른쪽 패널 맨 위에 붙는다 — 무엇을 골랐는지와 그 속성이 늘 같은 자리에 있어야
 * "고쳤는데 어디서 고치는지 모르겠다"가 없다.
 *
 * ── 같은 종류를 여럿 골랐으면 한 번에 고친다 ──
 * 종류가 같으면 속성도 같다. 글자 열 줄의 크기를 함께 키우려고 열 번 반복하지 않도록,
 * 고른 것이 모두 같은 종류일 때는 <b>대표 요소의 값</b>을 보여 주고 손댄 값을 전부에 건다
 * (되돌리기도 한 단계다). 종류가 섞였을 때만 정렬·분배로 줄인다 —
 * 글꼴과 구분선 두께를 한 폼에 담을 수는 없다.
 */
export default function SelectionInspector({ editor, canvasRef }: Props) {
  const { t } = useTranslation()
  const [editingImage, setEditingImage] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  /** 하나만 골랐을 때. 요소마다 값이 다른 것(자동 채움·글 내용)은 이때만 고칠 수 있다. */
  const layer = editor.selectedLayer
  const selected = editor.selectedLayers
  const count = editor.selectedLayerIds.length
  if (count === 0) return null

  /** 고른 것이 모두 같은 종류면 그 대표 요소. 섞여 있으면 null. */
  const uniform = selected.length > 0 && selected.every((item) => item.type === selected[0].type)
    ? selected[0]
    : null
  const bulk = uniform != null && selected.length > 1

  const size = frameSizeOf(editor.layout.frame, PHOTO_CARD_MAX_EDGE)
  /** 고른 같은 종류 전부에 건다. 하나만 골랐으면 그 하나에만 걸린다. */
  const patch = (values: Parameters<typeof editor.patchLayer>[1], gesture?: string) => {
    if (uniform) editor.patchLayers(selected.map((item) => item.id), values, gesture)
  }
  /** 하나만 골랐을 때에만 걸리는 속성(글 내용·자동 채움·그림 주소). */
  const patchOne = (values: Parameters<typeof editor.patchLayer>[1], gesture?: string) => {
    if (layer) editor.patchLayer(layer.id, values, gesture)
  }

  const runAlign = (mode: AlignMode) => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    editor.moveLayersTo(alignLayers(ctx, size, editor.selectedLayers, editor.dataContext, mode))
    editor.endGesture()
  }

  const runDistribute = (axis: 'x' | 'y') => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    editor.moveLayersTo(distributeLayers(ctx, size, editor.selectedLayers, editor.dataContext, axis))
    editor.endGesture()
  }

  const alignButton = 'inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30'
  const headerButton = 'rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50'

  return (
    <div className="space-y-4 rounded-xl border border-primary-200 bg-primary-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-primary-700">
          {count > 1 ? t('photoCard.selectedCount', { count }) : t('photoCard.selectedLayer')}
        </span>
        <div className="flex gap-1">
          {/* 같은 종류를 한 번에 고르는 길. 여기서 고른 뒤 아래 속성을 만지면 전부에 걸린다. */}
          {uniform && (
            <button
              type="button"
              title={t('photoCard.selectSameTypeHint')}
              onClick={editor.selectSameType}
              className={headerButton}
            >
              {t('photoCard.selectSameType')}
            </button>
          )}
          {layer && (
            <>
              <button
                type="button"
                onClick={() => editor.toggleLock(layer.id)}
                className={headerButton}
              >
                {editor.lockedIds.has(layer.id) ? t('photoCard.unlock') : t('photoCard.lock')}
              </button>
              <button
                type="button"
                onClick={() => editor.duplicateLayer(layer.id)}
                className={headerButton}
              >
                {t('photoCard.duplicate')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 지금 만지는 값이 몇 개에 걸리는지 — 하나만 고친 줄 알고 카드를 뒤엎지 않게 먼저 알린다. */}
      {bulk && (
        <p className="rounded-lg bg-primary-100/70 px-2 py-1.5 text-[11px] font-semibold leading-relaxed text-primary-800">
          {t('photoCard.bulkEditHint', { count: selected.length })}
        </p>
      )}

      {/* ── 정렬 ── 두 개 이상 골랐을 때만 의미가 있다 */}
      <Section title={t('photoCard.alignObjects')} hint={count < 2 ? t('photoCard.alignNeedsTwo') : undefined}>
        {ALIGN_ROWS.map((row, index) => (
          <div key={index} className="flex gap-1">
            {row.map((item) => (
              <button
                key={item.mode}
                type="button"
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                disabled={count < 2}
                onClick={() => runAlign(item.mode)}
                className={alignButton}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d={item.icon} />
                </svg>
              </button>
            ))}
          </div>
        ))}
        <div className="flex gap-1">
          <button type="button" disabled={count < 2} onClick={() => runAlign('baseline')}
            className={`${alignButton} px-2 text-[11px] font-bold`}>
            {t('photoCard.alignBaseline')}
          </button>
          <button type="button" disabled={count < 3} onClick={() => runDistribute('x')}
            className={`${alignButton} px-2 text-[11px] font-bold`}>
            {t('photoCard.distributeX')}
          </button>
          <button type="button" disabled={count < 3} onClick={() => runDistribute('y')}
            className={`${alignButton} px-2 text-[11px] font-bold`}>
            {t('photoCard.distributeY')}
          </button>
        </div>
      </Section>

      {!uniform && (
        <p className="text-[11px] font-medium leading-relaxed text-neutral-500">{t('photoCard.multiSelectHint')}</p>
      )}

      {uniform?.type === 'TEXT' && (
        <Section title={t('photoCard.tabText')}>
          {/* 자동 채움과 글 내용은 요소마다 다른 값이라 하나만 골랐을 때만 고친다 —
              여럿에 같은 글을 덮어쓰면 카드에 같은 줄이 여러 개 남는다. */}
          {layer && (
            <>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-neutral-500">{t('photoCard.binding')}</span>
                <select
                  value={layer.binding ?? 'NONE'}
                  onChange={(event) => patchOne({ binding: event.target.value as PhotoCardBinding, overridden: false })}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs"
                >
                  {PHOTO_CARD_BINDINGS.map((binding) => (
                    <option key={binding} value={binding}>{t(`photoCard.binding_${binding}`, binding)}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-neutral-500">
                  {t('photoCard.content')}
                  {layer.overridden && <span className="ml-1 font-bold text-primary-700">· {t('photoCard.overridden')}</span>}
                </span>
                <AutoGrowTextarea
                  rows={2}
                  maxLength={PHOTO_CARD_MAX_TEXT_LENGTH}
                  value={layer.overridden || !layer.binding || layer.binding === 'NONE'
                    ? (layer.text ?? '')
                    : resolveLayerText(layer, editor.dataContext)}
                  onChange={(event) => patchOne({ text: event.target.value, overridden: true }, `text:${layer.id}`)}
                  onBlur={editor.endGesture}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs"
                />
                {layer.overridden && layer.binding !== 'NONE' && (
                  <button
                    type="button"
                    onClick={() => patchOne({ overridden: false })}
                    className="mt-1 text-[11px] font-semibold text-primary-700 hover:underline"
                  >
                    {t('photoCard.resetOverride')}
                  </button>
                )}
              </label>
            </>
          )}

          <div>
            <span className="mb-1 block text-[11px] font-medium text-neutral-500">{t('photoCard.fontLabel')}</span>
            <FontPicker
              value={uniform.fontKey}
              onChange={(fontKey) => patch({ fontKey })}
              sample={resolveLayerText(uniform, editor.dataContext)}
            />
          </div>

          <SliderField
            label={t('photoCard.fontSize')}
            min={5} max={300} scale={10} digits={1} suffix="%"
            defaultValue={0.04 * 1000}
            value={Math.round((uniform.fontSizeRatio ?? 0.04) * 1000)}
            onChange={(value) => patch({ fontSizeRatio: value / 1000 }, `fontSize:${uniform.id}`)}
            onCommit={editor.endGesture}
          />

          {/* 문단 정렬 — 글자 덩어리 <b>안에서</b> 줄을 어느 쪽에 붙일지다.
              요소끼리 자리를 맞추는 위쪽 '정렬'과는 다른 것이라 따로 둔다. */}
          <SegmentedField<PhotoCardTextAlign>
            label={t('photoCard.textAlign')}
            value={uniform.textAlign ?? 'CENTER'}
            defaultValue="CENTER"
            options={[
              { value: 'LEFT', label: t('photoCard.textAlignLeft') },
              { value: 'CENTER', label: t('photoCard.textAlignCenter') },
              { value: 'RIGHT', label: t('photoCard.textAlignRight') },
            ]}
            onChange={(textAlign) => patch({ textAlign })}
          />

          <SliderField
            label={t('photoCard.letterSpacing')}
            min={-50} max={100} suffix="%"
            defaultValue={0}
            value={Math.round((uniform.letterSpacing ?? 0) * 100)}
            onChange={(value) => patch({ letterSpacing: value / 100 }, `letterSpacing:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.lineHeight')}
            min={50} max={300} scale={100} digits={2}
            defaultValue={1.25 * 100}
            value={Math.round((uniform.lineHeight ?? 1.25) * 100)}
            onChange={(value) => patch({ lineHeight: value / 100 }, `lineHeight:${uniform.id}`)}
            onCommit={editor.endGesture}
          />

          <SliderField
            label={t('photoCard.textBoxWidth')}
            min={5} max={100} suffix="%"
            defaultValue={1 * 100}
            value={Math.round((uniform.widthRatio ?? 1) * 100)}
            onChange={(value) => patch({ widthRatio: value / 100 }, `textWidth:${uniform.id}`)}
            onCommit={editor.endGesture}
          />

          <div className="grid grid-cols-2 gap-2">
            <ColorField label={t('photoCard.textColor')} value={uniform.color ?? '#ffffff'}
              onChange={(color) => patch({ color })} />
            <ColorField label={t('photoCard.outline')} value={uniform.outlineColor ?? '#000000'}
              defaultValue="#000000"
              onChange={(outlineColor) => patch({ outlineColor, outlineEnabled: true })} />
          </div>
          <SliderField
            label={t('photoCard.outlineWidth')}
            min={0} max={50} scale={10} digits={2} suffix="%"
            defaultValue={0}
            value={Math.round((uniform.outlineWidthRatio ?? 0) * 1000)}
            onChange={(value) => patch({
              outlineWidthRatio: value / 1000, outlineEnabled: value > 0,
            }, `outline:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
        </Section>
      )}

      {uniform?.type === 'IMAGE' && (
        // 출처는 얹을 때 정해진다(직접 올린 그림 / 증류소 로고). 여기서는 크기·투명도만 만진다 —
        // 골라 둔 그림을 나중에 다른 출처로 바꾸면 가리킬 대상이 사라져 빈 자리만 남는다.
        <Section
          title={t('photoCard.addImage')}
          hint={uniform.source?.startsWith('REVIEW_AROMA_')
            ? t('photoCard.reviewAromaImageHint')
            : uniform.source === 'UPLOAD' ? undefined : t('photoCard.imageEditLogoHint')}
        >
          {/* 편집은 내가 올린 그림만. 생산자 로고는 여러 카드가 함께 쓰는 자산이라
              한 카드에서 고치면 다른 곳까지 바뀐다 — 로고는 관리자에서 고친다.
              여럿을 골랐을 때는 어느 그림을 여는지 알 수 없으므로 하나일 때만 연다. */}
          {layer?.source === 'UPLOAD' && (
            <PanelButton disabled={editingImage} onClick={() => setEditingImage(true)}>
              {t('photoCard.imageEdit')}
            </PanelButton>
          )}
          <SliderField
            label={t('photoCard.imageWidth')}
            min={1} max={100} suffix="%"
            defaultValue={0.15 * 100}
            value={Math.round((uniform.widthRatio ?? 0.15) * 100)}
            onChange={(value) => patch({ widthRatio: value / 100 }, `width:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.opacity')}
            min={0} max={100} suffix="%"
            defaultValue={1 * 100}
            value={Math.round((uniform.opacity ?? 1) * 100)}
            onChange={(value) => patch({ opacity: value / 100 }, `opacity:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
        </Section>
      )}

      {editingImage && layer?.type === 'IMAGE' && layer.uploadUrl && (
        <Suspense fallback={null}>
          <ImageEditorModal
            open
            imageSrc={layer.uploadUrl}
            isSaving={savingImage}
            onClose={() => setEditingImage(false)}
            onSave={async (edited) => {
              setSavingImage(true)
              try {
                // 고친 그림은 새 파일로 올린다. 같은 주소를 덮어쓰면 이 그림을 쓰는
                // 다른 카드·템플릿까지 함께 바뀐다.
                const uploaded = await photoCardApi.uploadImage(edited)
                if (uploaded?.imageUrl) patchOne({ uploadUrl: uploaded.imageUrl })
                setEditingImage(false)
              } finally {
                setSavingImage(false)
              }
            }}
          />
        </Suspense>
      )}

      {uniform?.type === 'ICON' && (
        <Section title={t('photoCard.iconSection')}>
          <SliderField
            label={t('photoCard.iconSize')}
            min={5} max={500} scale={10} digits={1} suffix="%"
            defaultValue={0.06 * 1000}
            value={Math.round((uniform.widthRatio ?? 0.06) * 1000)}
            onChange={(value) => patch({ widthRatio: value / 1000 }, `width:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
          <ColorField label={t('photoCard.textColor')} value={uniform.fill ?? '#111111'}
            onChange={(fill) => patch({ fill })} />
          <SliderField
            label={t('photoCard.opacity')}
            min={0} max={100} suffix="%"
            defaultValue={1 * 100}
            value={Math.round((uniform.opacity ?? 1) * 100)}
            onChange={(value) => patch({ opacity: value / 100 }, `opacity:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
        </Section>
      )}

      {uniform?.type === 'DIVIDER' && (
        <Section title={t('photoCard.addDivider')}>
          <SliderField
            label={t('photoCard.dividerWidth')}
            min={1} max={100} suffix="%"
            defaultValue={0.8 * 100}
            value={Math.round((uniform.widthRatio ?? 0.8) * 100)}
            onChange={(value) => patch({ widthRatio: value / 100 }, `width:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.dividerThickness')}
            min={5} max={500} scale={100} digits={2} suffix="%"
            defaultValue={0.002 * 10000}
            value={Math.round((uniform.thicknessRatio ?? 0.002) * 10000)}
            onChange={(value) => patch({ thicknessRatio: value / 10000 }, `thickness:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
          <ColorField label={t('photoCard.textColor')} value={uniform.fill ?? '#dddddd'}
            onChange={(fill) => patch({ fill })} />
        </Section>
      )}

      {uniform?.type === 'BOX' && (
        <Section title={t('photoCard.addBox')} hint={t('photoCard.boxHint')}>
          <SliderField
            label={t('photoCard.boxWidth')}
            min={1} max={100} suffix="%"
            defaultValue={0.5 * 100}
            value={Math.round((uniform.widthRatio ?? 0.5) * 100)}
            onChange={(value) => patch({ widthRatio: value / 100 }, `width:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.boxHeight')}
            min={1} max={100} suffix="%"
            defaultValue={0.2 * 100}
            value={Math.round((uniform.heightRatio ?? 0.2) * 100)}
            onChange={(value) => patch({ heightRatio: value / 100 }, `height:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.boxRadius')}
            min={0} max={200} scale={10} digits={1} suffix="%"
            defaultValue={0}
            value={Math.round((uniform.radius ?? 0) * 1000)}
            onChange={(value) => patch({ radius: value / 1000 }, `radius:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
          <ColorField label={t('photoCard.boxFill')} value={uniform.fill ?? '#000000'}
            onChange={(fill) => patch({ fill })} />
          <ColorField label={t('photoCard.boxStroke')} value={uniform.strokeColor ?? '#111111'}
            onChange={(strokeColor) => patch({ strokeColor })} />
          <SliderField
            label={t('photoCard.boxStrokeWidth')}
            min={0} max={50} scale={10} digits={2} suffix="%"
            defaultValue={0}
            value={Math.round((uniform.strokeWidthRatio ?? 0) * 1000)}
            onChange={(value) => patch({ strokeWidthRatio: value / 1000 }, `stroke:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.opacity')}
            min={0} max={100} suffix="%"
            defaultValue={1 * 100}
            value={Math.round((uniform.opacity ?? 1) * 100)}
            onChange={(value) => patch({ opacity: value / 100 }, `opacity:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
        </Section>
      )}

      {uniform && (
        <Section title={t('photoCard.placement')}>
          {/* 자리는 하나씩만 잡는다 — 여럿에 같은 좌표를 주면 전부 한 점에 포개진다.
              여럿을 나란히 놓는 것은 위쪽 정렬·분배가 맡는다. */}
          {layer && (
            <div className="grid grid-cols-2 gap-2">
              <SliderField
                label={t('photoCard.positionX')}
                min={0} max={1000} scale={10} suffix="%"
                defaultValue={0.5 * 1000}
                value={Math.round(layer.position.x * 1000)}
                onChange={(value) => patchOne({
                  position: { ...layer.position, x: value / 1000 },
                }, `position:${layer.id}`)}
                onCommit={editor.endGesture}
              />
              <SliderField
                label={t('photoCard.positionY')}
                min={0} max={1000} scale={10} suffix="%"
                defaultValue={0.5 * 1000}
                value={Math.round(layer.position.y * 1000)}
                onChange={(value) => patchOne({
                  position: { ...layer.position, y: value / 1000 },
                }, `position:${layer.id}`)}
                onCommit={editor.endGesture}
              />
            </div>
          )}
          <SliderField
            label={t('photoCard.rotation')}
            min={-180} max={180} suffix="°"
            defaultValue={0}
            value={Math.round(uniform.rotation ?? 0)}
            onChange={(rotation) => patch({ rotation }, `rotation:${uniform.id}`)}
            onCommit={editor.endGesture}
          />
          {/* 직각은 한 번에. 손잡이로 돌리면 5도 안에서 붙지만, 정확히 맞추는 길도 남겨 둔다. */}
          <div className="flex gap-1">
            {[-90, 90, 180].map((degrees) => (
              <button
                key={degrees}
                type="button"
                onClick={() => {
                  patch({ rotation: degrees })
                  editor.endGesture()
                }}
                className={`${alignButton} px-2 text-[11px] font-bold`}
              >
                {degrees > 0 ? `+${degrees}°` : `${degrees}°`}
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
