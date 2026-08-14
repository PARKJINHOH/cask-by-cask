import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { photoCardApi } from '../../api/photoCardApi'
import { BUILTIN_LAYOUTS } from '../../constants/builtinLayouts'
import { REVIEW_SHARE_SYSTEM_TEMPLATE_APPLIED_KEY } from '../../constants/systemTemplates'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import type {
  PhotoCardLayout, PhotoCardTemplate, PhotoCardTemplateScope,
} from '../../types/photoCard.types'
import { describeLayer } from '../../utils/layerLabel'
import { PanelButton, Section } from './controls'

interface Props {
  editor: PhotoCardEditor
  scope: PhotoCardTemplateScope
  onScopeChange: (scope: PhotoCardTemplateScope) => void
  isLoggedIn: boolean
  busy: boolean
  onSaveAsTemplate: () => void
  onOverwrite: (template: PhotoCardTemplate) => void
  /** 마지막으로 적용한 템플릿. 도구를 옮겨 다녀도 유지돼야 해서 페이지가 들고 있다. */
  appliedKey: string | null
  onApplied: (key: string) => void
  /** 요소 채우기를 다시 연다 — 도중에 닫았거나, 값을 고치러 돌아올 때. */
  onStartFill: () => void
  /** 리뷰 공유에서 넘어온 데이터로 만든 동적 공식 템플릿. 리뷰가 없으면 안내용 항목만 보인다. */
  reviewOfficialLayout: PhotoCardLayout | null
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
  editor, scope, onScopeChange, isLoggedIn, busy, onSaveAsTemplate, onOverwrite,
  appliedKey, onApplied, onStartFill, reviewOfficialLayout,
}: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  /** 채울 자리(글자 요소)가 하나라도 있어야 '요소 입력'이 뜻을 갖는다. */
  const hasTextSlots = editor.layout.layers.some(
    (layer) => layer.type === 'TEXT' && layer.visible !== false,
  )

  const { data } = useQuery({
    queryKey: ['photoCardTemplates', scope],
    queryFn: () => photoCardApi.getTemplates(scope),
    enabled: scope !== 'MINE' || isLoggedIn,
    staleTime: 60_000,
  })
  const templates = data ?? []

  const refreshUserTemplates = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['photoCardTemplates', 'MINE'], exact: true }),
    queryClient.invalidateQueries({ queryKey: ['photoCardTemplates', 'PUBLIC'], exact: true }),
  ])

  // 관리자가 공식 템플릿을 등록하기 전까지는 코드에 든 기본 5종을 보여 준다.
  // 등록 뒤에도 둘 다 그리면 같은 템플릿이 두 번 나온다.
  const showBuiltins = scope === 'OFFICIAL' && templates.length === 0

  const use = (key: string, layout: PhotoCardLayout, id?: number) => {
    // 사진이 없으면 작업 영역에는 업로드 버튼만 있다 — 템플릿을 얹어도 카드가 그려지지 않아
    // 무엇을 고른 것인지 볼 수 없다. 먼저 사진을 올리도록 안내하고 여기서 멈춘다.
    if (!editor.photoImage) {
      window.alert(t('photoCard.templateNeedsPhoto'))
      return
    }
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
            onClick={() => {
              onScopeChange(key)
              // staleTime 안에 다시 들어와도 서버의 공개 전환·삭제 결과를 즉시 확인한다.
              void queryClient.invalidateQueries({
                queryKey: ['photoCardTemplates', key], exact: true,
              })
            }}
            className={`flex-1 border-r border-neutral-200 py-2 text-xs font-semibold transition-colors last:border-r-0 ${
              scope === key ? 'bg-primary-600 text-white' : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {scope === 'OFFICIAL' && hasTextSlots && (
        <PanelButton tone="primary" onClick={onStartFill}>
          {t('photoCard.fillReopen')}
        </PanelButton>
      )}

      {scope === 'OFFICIAL' && (
        <ul className="space-y-2">
          <li className={itemClass(appliedKey === REVIEW_SHARE_SYSTEM_TEMPLATE_APPLIED_KEY)}>
            <button
              type="button"
              aria-pressed={appliedKey === REVIEW_SHARE_SYSTEM_TEMPLATE_APPLIED_KEY}
              aria-label={t('photoCard.builtinReviewShare')}
              onClick={() => {
                if (!reviewOfficialLayout) {
                  window.alert(t('photoCard.reviewTemplateNeedsReview'))
                  return
                }
                use(REVIEW_SHARE_SYSTEM_TEMPLATE_APPLIED_KEY, reviewOfficialLayout)
              }}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className={overlayButtonClass}
            />
            <div className="pointer-events-none relative z-10">
              <span className="flex items-center gap-1.5 text-sm font-bold text-neutral-800">
                {t('photoCard.builtinReviewShare')}
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                  {t('photoCard.officialBadge')}
                </span>
              </span>
              <span className="mt-0.5 block text-[11px] font-medium leading-relaxed text-neutral-500">
                {reviewOfficialLayout
                  ? t('photoCard.builtinReviewShareDesc')
                  : t('photoCard.reviewTemplateNeedsReview')}
              </span>
              {reviewOfficialLayout && <Includes layout={reviewOfficialLayout} />}
            </div>
          </li>
        </ul>
      )}

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
            {scope === 'MINE' && template.isMine && (
              <div className="relative z-10 mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onOverwrite(template)}
                  className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {t('photoCard.overwriteTemplate')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    await photoCardApi.togglePublic(template.id, !template.isPublic)
                    await refreshUserTemplates()
                  }}
                  className="rounded-md border border-primary-600 bg-primary-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {template.isPublic ? t('photoCard.makePrivate') : t('photoCard.makePublic')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm(t('photoCard.deleteTemplateConfirm'))) return
                    await photoCardApi.deleteTemplate(template.id)
                    await refreshUserTemplates()
                  }}
                  className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
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
