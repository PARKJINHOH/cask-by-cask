import { lazy, Suspense, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { photoCardApi } from '../../api/photoCardApi'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import type { PhotoCardBinding } from '../../types/photoCard.types'
import { PHOTO_CARD_BINDINGS, PHOTO_CARD_MAX_TEXT_LENGTH } from '../../utils/layoutSchema'
import { frameSizeOf } from '../../utils/photoCardRender'
import { PHOTO_CARD_MAX_EDGE } from '../../constants/photoCardRatios'
import { alignLayers, distributeLayers, type AlignMode } from '../../utils/photoCardSnap'
import { resolveLayerText } from '../../utils/resolveBindings'
import { ColorField, PanelButton, Section, SliderField } from './controls'
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
 * "고쳤는데 어디서 고치는지 모르겠다"가 없다. 여럿을 고르면 서로 다른 속성을 한 폼에 담을 수 없으므로
 * 정렬·분배만 보여 준다.
 */
export default function SelectionInspector({ editor, canvasRef }: Props) {
  const { t } = useTranslation()
  const [editingImage, setEditingImage] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const layer = editor.selectedLayer
  const count = editor.selectedLayerIds.length
  if (count === 0) return null

  const size = frameSizeOf(editor.layout.frame, PHOTO_CARD_MAX_EDGE)
  const patch = (values: Parameters<typeof editor.patchLayer>[1], gesture?: string) => {
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

  return (
    <div className="space-y-4 rounded-xl border border-primary-200 bg-primary-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-primary-700">
          {count > 1 ? t('photoCard.selectedCount', { count }) : t('photoCard.selectedLayer')}
        </span>
        {layer && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => editor.toggleLock(layer.id)}
              className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              {editor.lockedIds.has(layer.id) ? t('photoCard.unlock') : t('photoCard.lock')}
            </button>
            <button
              type="button"
              onClick={() => editor.duplicateLayer(layer.id)}
              className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              {t('photoCard.duplicate')}
            </button>
          </div>
        )}
      </div>

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

      {!layer && (
        <p className="text-[11px] font-medium leading-relaxed text-neutral-500">{t('photoCard.multiSelectHint')}</p>
      )}

      {layer?.type === 'TEXT' && (
        <Section title={t('photoCard.tabText')}>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-neutral-500">{t('photoCard.binding')}</span>
            <select
              value={layer.binding ?? 'NONE'}
              onChange={(event) => patch({ binding: event.target.value as PhotoCardBinding, overridden: false })}
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
              onChange={(event) => patch({ text: event.target.value, overridden: true }, `text:${layer.id}`)}
              onBlur={editor.endGesture}
              className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs"
            />
            {layer.overridden && layer.binding !== 'NONE' && (
              <button
                type="button"
                onClick={() => patch({ overridden: false })}
                className="mt-1 text-[11px] font-semibold text-primary-700 hover:underline"
              >
                {t('photoCard.resetOverride')}
              </button>
            )}
          </label>

          <div>
            <span className="mb-1 block text-[11px] font-medium text-neutral-500">{t('photoCard.fontLabel')}</span>
            <FontPicker
              value={layer.fontKey}
              onChange={(fontKey) => patch({ fontKey })}
              sample={resolveLayerText(layer, editor.dataContext)}
            />
          </div>

          <SliderField
            label={t('photoCard.fontSize')}
            display={`${((layer.fontSizeRatio ?? 0.04) * 100).toFixed(1)}%`}
            min={5} max={300}
            value={Math.round((layer.fontSizeRatio ?? 0.04) * 1000)}
            onChange={(value) => patch({ fontSizeRatio: value / 1000 }, `fontSize:${layer.id}`)}
            onCommit={editor.endGesture}
          />

          <SliderField
            label={t('photoCard.letterSpacing')}
            display={`${((layer.letterSpacing ?? 0) * 100).toFixed(0)}%`}
            min={-50} max={100}
            value={Math.round((layer.letterSpacing ?? 0) * 100)}
            onChange={(value) => patch({ letterSpacing: value / 100 }, `letterSpacing:${layer.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.lineHeight')}
            display={`${(layer.lineHeight ?? 1.25).toFixed(2)}`}
            min={50} max={300}
            value={Math.round((layer.lineHeight ?? 1.25) * 100)}
            onChange={(value) => patch({ lineHeight: value / 100 }, `lineHeight:${layer.id}`)}
            onCommit={editor.endGesture}
          />

          <div className="grid grid-cols-2 gap-2">
            <ColorField label={t('photoCard.textColor')} value={layer.color ?? '#ffffff'}
              onChange={(color) => patch({ color })} />
            <ColorField label={t('photoCard.outline')} value={layer.outlineColor ?? '#000000'}
              onChange={(outlineColor) => patch({ outlineColor, outlineEnabled: true })} />
          </div>
          <SliderField
            label={t('photoCard.outlineWidth')}
            display={`${((layer.outlineWidthRatio ?? 0) * 100).toFixed(2)}%`}
            min={0} max={50}
            value={Math.round((layer.outlineWidthRatio ?? 0) * 1000)}
            onChange={(value) => patch({
              outlineWidthRatio: value / 1000, outlineEnabled: value > 0,
            }, `outline:${layer.id}`)}
            onCommit={editor.endGesture}
          />
        </Section>
      )}

      {layer?.type === 'IMAGE' && (
        // 출처는 얹을 때 정해진다(직접 올린 그림 / 증류소 로고). 여기서는 크기·투명도만 만진다 —
        // 골라 둔 그림을 나중에 다른 출처로 바꾸면 가리킬 대상이 사라져 빈 자리만 남는다.
        <Section
          title={t('photoCard.addImage')}
          hint={layer.source === 'UPLOAD' ? undefined : t('photoCard.imageEditLogoHint')}
        >
          {/* 편집은 내가 올린 그림만. 생산자 로고는 여러 카드가 함께 쓰는 자산이라
              한 카드에서 고치면 다른 곳까지 바뀐다 — 로고는 관리자에서 고친다. */}
          {layer.source === 'UPLOAD' && (
            <PanelButton disabled={editingImage} onClick={() => setEditingImage(true)}>
              {t('photoCard.imageEdit')}
            </PanelButton>
          )}
          <SliderField
            label={t('photoCard.imageWidth')}
            display={`${((layer.widthRatio ?? 0.15) * 100).toFixed(0)}%`}
            min={1} max={100}
            value={Math.round((layer.widthRatio ?? 0.15) * 100)}
            onChange={(value) => patch({ widthRatio: value / 100 }, `width:${layer.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.opacity')}
            display={`${Math.round((layer.opacity ?? 1) * 100)}%`}
            min={0} max={100}
            value={Math.round((layer.opacity ?? 1) * 100)}
            onChange={(value) => patch({ opacity: value / 100 }, `opacity:${layer.id}`)}
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
            initialMode="crop"
            onClose={() => setEditingImage(false)}
            onSave={async (edited) => {
              setSavingImage(true)
              try {
                // 고친 그림은 새 파일로 올린다. 같은 주소를 덮어쓰면 이 그림을 쓰는
                // 다른 카드·템플릿까지 함께 바뀐다.
                const uploaded = await photoCardApi.uploadImage(edited)
                if (uploaded?.imageUrl) patch({ uploadUrl: uploaded.imageUrl })
                setEditingImage(false)
              } finally {
                setSavingImage(false)
              }
            }}
          />
        </Suspense>
      )}

      {layer?.type === 'ICON' && (
        <Section title={t('photoCard.iconSection')}>
          <SliderField
            label={t('photoCard.iconSize')}
            display={`${((layer.widthRatio ?? 0.06) * 100).toFixed(1)}%`}
            min={5} max={500}
            value={Math.round((layer.widthRatio ?? 0.06) * 1000)}
            onChange={(value) => patch({ widthRatio: value / 1000 }, `width:${layer.id}`)}
            onCommit={editor.endGesture}
          />
          <ColorField label={t('photoCard.textColor')} value={layer.fill ?? '#111111'}
            onChange={(fill) => patch({ fill })} />
          <SliderField
            label={t('photoCard.opacity')}
            display={`${Math.round((layer.opacity ?? 1) * 100)}%`}
            min={0} max={100}
            value={Math.round((layer.opacity ?? 1) * 100)}
            onChange={(value) => patch({ opacity: value / 100 }, `opacity:${layer.id}`)}
            onCommit={editor.endGesture}
          />
        </Section>
      )}

      {layer?.type === 'DIVIDER' && (
        <Section title={t('photoCard.addDivider')}>
          <SliderField
            label={t('photoCard.dividerWidth')}
            display={`${((layer.widthRatio ?? 0.8) * 100).toFixed(0)}%`}
            min={1} max={100}
            value={Math.round((layer.widthRatio ?? 0.8) * 100)}
            onChange={(value) => patch({ widthRatio: value / 100 }, `width:${layer.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.dividerThickness')}
            display={`${((layer.thicknessRatio ?? 0.002) * 100).toFixed(2)}%`}
            min={5} max={500}
            value={Math.round((layer.thicknessRatio ?? 0.002) * 10000)}
            onChange={(value) => patch({ thicknessRatio: value / 10000 }, `thickness:${layer.id}`)}
            onCommit={editor.endGesture}
          />
          <ColorField label={t('photoCard.textColor')} value={layer.fill ?? '#dddddd'}
            onChange={(fill) => patch({ fill })} />
        </Section>
      )}

      {layer?.type === 'BOX' && (
        <Section title={t('photoCard.addBox')} hint={t('photoCard.boxHint')}>
          <SliderField
            label={t('photoCard.boxWidth')}
            display={`${((layer.widthRatio ?? 0.5) * 100).toFixed(0)}%`}
            min={1} max={100}
            value={Math.round((layer.widthRatio ?? 0.5) * 100)}
            onChange={(value) => patch({ widthRatio: value / 100 }, `width:${layer.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.boxHeight')}
            display={`${((layer.heightRatio ?? 0.2) * 100).toFixed(0)}%`}
            min={1} max={100}
            value={Math.round((layer.heightRatio ?? 0.2) * 100)}
            onChange={(value) => patch({ heightRatio: value / 100 }, `height:${layer.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.boxRadius')}
            display={`${((layer.radius ?? 0) * 100).toFixed(1)}%`}
            min={0} max={200}
            value={Math.round((layer.radius ?? 0) * 1000)}
            onChange={(value) => patch({ radius: value / 1000 }, `radius:${layer.id}`)}
            onCommit={editor.endGesture}
          />
          <ColorField label={t('photoCard.boxFill')} value={layer.fill ?? '#000000'}
            onChange={(fill) => patch({ fill })} />
          <ColorField label={t('photoCard.boxStroke')} value={layer.strokeColor ?? '#111111'}
            onChange={(strokeColor) => patch({ strokeColor })} />
          <SliderField
            label={t('photoCard.boxStrokeWidth')}
            display={`${((layer.strokeWidthRatio ?? 0) * 100).toFixed(2)}%`}
            min={0} max={50}
            value={Math.round((layer.strokeWidthRatio ?? 0) * 1000)}
            onChange={(value) => patch({ strokeWidthRatio: value / 1000 }, `stroke:${layer.id}`)}
            onCommit={editor.endGesture}
          />
          <SliderField
            label={t('photoCard.opacity')}
            display={`${Math.round((layer.opacity ?? 1) * 100)}%`}
            min={0} max={100}
            value={Math.round((layer.opacity ?? 1) * 100)}
            onChange={(value) => patch({ opacity: value / 100 }, `opacity:${layer.id}`)}
            onCommit={editor.endGesture}
          />
        </Section>
      )}

      {layer && (
        <Section title={t('photoCard.placement')}>
          <div className="grid grid-cols-2 gap-2">
            <SliderField
              label={t('photoCard.positionX')}
              display={`${Math.round(layer.position.x * 100)}%`}
              min={0} max={1000}
              value={Math.round(layer.position.x * 1000)}
              onChange={(value) => patch({
                position: { ...layer.position, x: value / 1000 },
              }, `position:${layer.id}`)}
              onCommit={editor.endGesture}
            />
            <SliderField
              label={t('photoCard.positionY')}
              display={`${Math.round(layer.position.y * 100)}%`}
              min={0} max={1000}
              value={Math.round(layer.position.y * 1000)}
              onChange={(value) => patch({
                position: { ...layer.position, y: value / 1000 },
              }, `position:${layer.id}`)}
              onCommit={editor.endGesture}
            />
          </div>
          <SliderField
            label={t('photoCard.rotation')}
            display={`${Math.round(layer.rotation ?? 0)}°`}
            min={-180} max={180}
            value={Math.round(layer.rotation ?? 0)}
            onChange={(rotation) => patch({ rotation }, `rotation:${layer.id}`)}
            onCommit={editor.endGesture}
          />
        </Section>
      )}
    </div>
  )
}
