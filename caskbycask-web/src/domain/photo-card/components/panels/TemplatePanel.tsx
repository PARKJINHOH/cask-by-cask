import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { photoCardApi } from '../../api/photoCardApi'
import { BUILTIN_LAYOUTS } from '../../constants/builtinLayouts'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import type { PhotoCardLayout, PhotoCardTemplateScope } from '../../types/photoCard.types'
import { describeLayer } from '../../utils/layerLabel'
import { PanelButton, Section } from './controls'

interface Props {
  editor: PhotoCardEditor
  scope: PhotoCardTemplateScope
  onScopeChange: (scope: PhotoCardTemplateScope) => void
  isLoggedIn: boolean
  busy: boolean
  onSaveAsTemplate: () => void
  /** 마지막으로 적용한 템플릿. 도구를 옮겨 다녀도 유지돼야 해서 페이지가 들고 있다. */
  appliedKey: string | null
  onApplied: (key: string) => void
}

/**
 * 테두리로 지금 어느 템플릿을 쓰고 있는지 보여 준다.
 *
 * relative 인 것은 적용 버튼이 카드 전체를 덮는 투명 판이기 때문이다 —
 * 이름 줄만 버튼이면 오른쪽 여백이나 '포함' 칩을 눌렀을 때 아무 일도 일어나지 않고,
 * 눌린 자리(버튼)와 색이 변하는 자리(카드)가 어긋나 터치 표시가 둘로 보인다.
 */
const itemClass = (selected: boolean) => [
  'relative rounded-lg border px-3 py-2.5 transition-colors',
  selected
    ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-300'
    : 'border-neutral-200 hover:border-primary-400 hover:bg-primary-50/30',
].join(' ')

/** 카드 전체를 덮는 적용 버튼. 내용은 이 위에 얹히고, 눌린 표시는 카드 하나로만 나온다. */
const overlayButtonClass = 'absolute inset-0 z-0 rounded-lg active:bg-primary-100/40'

/** 템플릿 도구 — 공식·내 것·공개된 것을 고르고, 지금 배치를 내 템플릿으로 저장한다. */
export default function TemplatePanel({
  editor, scope, onScopeChange, isLoggedIn, busy, onSaveAsTemplate, appliedKey, onApplied,
}: Props) {
  const { t } = useTranslation()

  const { data, refetch } = useQuery({
    queryKey: ['photoCardTemplates', scope],
    queryFn: () => photoCardApi.getTemplates(scope),
    enabled: scope !== 'MINE' || isLoggedIn,
    staleTime: 60_000,
  })
  const templates = data ?? []

  // 관리자가 공식 템플릿을 등록하기 전까지는 코드에 든 기본 5종을 보여 준다.
  // 등록 뒤에도 둘 다 그리면 같은 템플릿이 두 번 나온다.
  const showBuiltins = scope === 'OFFICIAL' && templates.length === 0

  const use = (key: string, layout: PhotoCardLayout, id?: number) => {
    editor.applyLayout(layout)
    onApplied(key)
    if (id) void photoCardApi.markUsed(id).catch(() => {})
  }

  /**
   * 이 템플릿을 고르면 카드에 무엇이 얹히는지 미리 보여 준다.
   *
   * 템플릿은 이름만 봐서는 무엇이 들어오는지 알 수 없다 — 고르고 나서야
   * 레이어 목록에서 확인하게 되는데, 그때는 이미 기존 배치가 갈아 끼워진 뒤다.
   */
  const Includes = ({ layout }: { layout: PhotoCardLayout }) => {
    const layers = (layout.layers ?? []).filter((layer) => layer.visible !== false)
    if (layers.length === 0) return null
    return (
      <div className="mt-2 border-t border-neutral-100 pt-2">
        <span className="text-[11px] font-medium text-neutral-500">
          {t('photoCard.templateIncludes', { count: layers.length })}
        </span>
        <div className="mt-1 flex flex-wrap gap-1">
          {layers.map((layer) => (
            <span
              key={layer.id}
              className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600"
            >
              {describeLayer(layer, t)}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex overflow-hidden rounded-lg border border-neutral-300">
        {([
          ['OFFICIAL', t('photoCard.templateOfficial')],
          ['MINE', t('photoCard.templateMine')],
          ['PUBLIC', t('photoCard.templatePublic')],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onScopeChange(key)}
            className={`flex-1 border-r border-neutral-200 py-2 text-xs font-semibold transition-colors last:border-r-0 ${
              scope === key ? 'bg-primary-600 text-white' : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showBuiltins && (
        <ul className="space-y-2">
          {BUILTIN_LAYOUTS.map((builtin) => (
            <li key={builtin.key} className={itemClass(appliedKey === `builtin:${builtin.key}`)}>
              <button
                type="button"
                aria-pressed={appliedKey === `builtin:${builtin.key}`}
                aria-label={t(builtin.nameKey)}
                onClick={() => use(`builtin:${builtin.key}`, builtin.layout)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className={overlayButtonClass}
              />
              <div className="pointer-events-none relative z-10">
                <span className="flex items-center gap-1.5 text-sm font-bold text-neutral-800">
                  {t(builtin.nameKey)}
                  <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[9px] font-bold text-primary-700">
                    {t('photoCard.officialBadge')}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] font-medium leading-relaxed text-neutral-500">
                  {t(builtin.descriptionKey)}
                </span>
                <Includes layout={builtin.layout} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ul className="space-y-2">
        {templates.map((template) => (
          <li key={template.id} className={itemClass(appliedKey === `id:${template.id}`)}>
            <button
              type="button"
              aria-pressed={appliedKey === `id:${template.id}`}
              aria-label={template.name}
              onClick={() => use(`id:${template.id}`, template.layout, template.id)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={overlayButtonClass}
            />
            <div className="pointer-events-none relative z-10">
              <span className="flex items-center gap-1.5 text-sm font-bold text-neutral-800">
                {template.name}
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                  template.templateType === 'OFFICIAL' ? 'bg-primary-100 text-primary-700'
                    : template.isPublic ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                }`}>
                  {template.templateType === 'OFFICIAL' ? t('photoCard.officialBadge')
                    : template.isPublic ? t('photoCard.publicBadge') : t('photoCard.privateBadge')}
                </span>
              </span>
              {template.description && (
                <span className="mt-0.5 block text-[11px] font-medium text-neutral-500">{template.description}</span>
              )}
              <Includes layout={template.layout} />
            </div>
            {/* 공개 전환·삭제는 카드 적용과 다른 동작이다 — 덮개 버튼 위로 올려 따로 눌리게 한다. */}
            {template.isMine && (
              <div className="relative z-10 mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await photoCardApi.togglePublic(template.id, !template.isPublic)
                    await refetch()
                  }}
                  className="text-[11px] font-semibold text-primary-700 hover:underline"
                >
                  {template.isPublic ? t('photoCard.makePrivate') : t('photoCard.makePublic')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(t('photoCard.deleteTemplateConfirm'))) return
                    await photoCardApi.deleteTemplate(template.id)
                    await refetch()
                  }}
                  className="text-[11px] font-semibold text-neutral-500 hover:text-red-600"
                >
                  {t('photoCard.deleteTemplate')}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {templates.length === 0 && scope !== 'OFFICIAL' && (
        <p className="py-6 text-center text-xs text-neutral-500">
          {scope === 'PUBLIC' ? t('photoCard.templateEmptyPublic') : t('photoCard.templateEmpty')}
        </p>
      )}

      {/* 비회원도 누를 수 있게 둔다 — 페이지가 임시저장 후 로그인으로 안내한다.
          눌리지 않는 버튼만 두면 왜 안 되는지 알 길이 없다. */}
      <Section title={t('photoCard.saveAsTemplate')} hint={t('photoCard.saveTemplateHint')}>
        <PanelButton disabled={busy} onClick={onSaveAsTemplate}>
          {t('photoCard.saveAsTemplate')}
        </PanelButton>
      </Section>
    </div>
  )
}
