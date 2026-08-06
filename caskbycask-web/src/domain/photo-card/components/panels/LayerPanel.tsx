import { useTranslation } from 'react-i18next'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import type { PhotoCardLayer } from '../../types/photoCard.types'
import { describeLayer } from '../../utils/layerLabel'
import { getDrawableLayers, resolveLayerText } from '../../utils/resolveBindings'
import { Section } from './controls'

const iconButton = 'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-neutral-200 bg-white text-[11px] font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-800 disabled:opacity-30'

/**
 * 레이어 목록.
 *
 * 배열의 <b>뒤쪽이 위에 그려진다</b>. 목록은 뒤집어 보여 준다 —
 * 화면에서 위에 있는 것이 목록에서도 위에 있어야 순서를 바꿀 때 헷갈리지 않는다.
 */
interface Props {
  editor: PhotoCardEditor
  /** 더블클릭하면 그 요소를 다루는 도구로 옮겨 간다 */
  onEditLayer: (layer: PhotoCardLayer) => void
}

export default function LayerPanel({ editor, onEditLayer }: Props) {
  const { t } = useTranslation()

  /**
   * 목록에 보일 이름.
   *
   * 자동 채움 텍스트는 아직 값이 없으면(주류를 안 골랐거나 EXIF 가 없으면) 빈 문자열이라
   * 예전에는 전부 "내용"으로만 보였다 — 처음 들어와서 목록에 뭐가 왜 있는지 알 수 없었다.
   * 값이 없을 때는 <b>무엇이 들어올 자리인지</b>(주류명·조리개 …)를 대신 보여 준다.
   */
  const labelOf = (layer: PhotoCardLayer) =>
    resolveLayerText(layer, editor.dataContext) || describeLayer(layer, t)

  const ordered = editor.layout.layers.slice().reverse()
  // 실제로 카드에 그려지는 것들. 값이 빈 자동 텍스트는 여기서 빠진다.
  const drawnIds = new Set(
    getDrawableLayers(editor.layout.layers, editor.dataContext).map((layer) => layer.id),
  )

  return (
    <div className="space-y-5">
      <Section title={t('photoCard.layerSection')} hint={`${t('photoCard.layerOrderHint')} ${t('photoCard.layerEditHint')}`}>
        <ul className="overflow-hidden rounded-lg border border-neutral-200">
          {ordered.map((layer) => {
            const index = editor.layout.layers.findIndex((item) => item.id === layer.id)
            const selected = editor.selectedLayerIds.includes(layer.id)
            const locked = editor.lockedIds.has(layer.id)
            return (
              <li
                key={layer.id}
                className={`flex items-center gap-1 border-b border-neutral-100 px-2 py-1.5 text-xs last:border-b-0 ${
                  selected ? 'bg-primary-50 shadow-[inset_3px_0_0_var(--color-primary-600)]' : ''
                }`}
              >
                <button
                  type="button"
                  title={t('photoCard.layerEditHint')}
                  onClick={(event) => editor.selectLayer(layer.id, event.shiftKey)}
                  onDoubleClick={() => {
                    editor.selectLayer(layer.id)
                    onEditLayer(layer)
                  }}
                  className={`flex min-w-0 flex-1 items-center gap-1 truncate text-left font-semibold ${
                    layer.visible === false ? 'text-neutral-300 line-through' : 'text-neutral-700'
                  }`}
                >
                  <span className="truncate">{labelOf(layer)}</span>
                  {/* 아직 값이 없어 카드에 그려지지 않는 자리 — 목록에만 있고 화면에는 없는 이유를 알려 준다 */}
                  {!drawnIds.has(layer.id) && layer.visible !== false && (
                    <span className="shrink-0 rounded bg-neutral-100 px-1 py-0.5 text-[9px] font-bold text-neutral-500">
                      {t('photoCard.layerNotDrawn')}
                    </span>
                  )}
                </button>

                <button type="button" className={iconButton} title={t('photoCard.moveUp')}
                  disabled={index === editor.layout.layers.length - 1}
                  onClick={() => editor.reorderLayer(layer.id, 'up')}>↑</button>
                <button type="button" className={iconButton} title={t('photoCard.moveDown')}
                  disabled={index === 0}
                  onClick={() => editor.reorderLayer(layer.id, 'down')}>↓</button>
                <button type="button" className={iconButton} title={t('photoCard.duplicate')}
                  onClick={() => editor.duplicateLayer(layer.id)}>⧉</button>
                <button type="button" className={iconButton} title={locked ? t('photoCard.unlock') : t('photoCard.lock')}
                  onClick={() => editor.toggleLock(layer.id)}>{locked ? '🔒' : '🔓'}</button>
                <button type="button" className={iconButton} title={t('photoCard.toggleVisible')}
                  onClick={() => editor.patchLayer(layer.id, { visible: layer.visible === false })}>
                  {layer.visible === false ? '🚫' : '👁'}
                </button>
                <button
                  type="button"
                  aria-label={t('photoCard.removeLayer')}
                  title={t('photoCard.removeLayer')}
                  onClick={() => editor.removeLayer(layer.id)}
                  className={`${iconButton} hover:border-red-200 hover:text-red-600`}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
        {ordered.length === 0 && (
          <p className="py-6 text-center text-xs text-neutral-500">{t('photoCard.layerEmpty')}</p>
        )}
      </Section>
    </div>
  )
}
