import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import ImageEditorModal from '@/shared/components/ImageEditorModal'
import { socialApi } from '../api/socialApi'
import type {
  SocialPlatform,
  SocialPublication,
  SocialPublishSelection,
  SocialSourceType,
} from '../types/social.types'

interface Props {
  kind: 'review' | 'news'
  selection: SocialPublishSelection
  onChange: (selection: SocialPublishSelection) => void
  source?: { type: SocialSourceType; id: number }
  editing?: boolean
  retryIds?: number[]
  onRetryIdsChange?: (ids: number[]) => void
  reviewSpiritId?: number
  allowFirstPublishOnEdit?: boolean
}

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  INSTAGRAM: 'Instagram',
  THREADS: 'Threads',
}

export default function SocialPublishFields({
  kind,
  selection,
  onChange,
  source,
  editing = false,
  retryIds = [],
  onRetryIdsChange,
  reviewSpiritId,
  allowFirstPublishOnEdit = false,
}: Props) {
  const { t, i18n } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [editingUpload, setEditingUpload] = useState<string | null>(null)
  const { data: capabilities } = useQuery({
    queryKey: ['social', 'capabilities', reviewSpiritId],
    queryFn: () => socialApi.capabilities(reviewSpiritId),
    staleTime: 60_000,
  })
  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ['social', 'source', source?.type, source?.id],
    queryFn: () => socialApi.sourceStates(source!.type, source!.id),
    enabled: Boolean(editing && source),
  })

  const anySelected = selection.instagram || selection.threads
  const newPublishSelected = anySelected && (!editing || allowFirstPublishOnEdit)

  useEffect(() => {
    const source = editingUpload
    return () => {
      if (source) URL.revokeObjectURL(source)
    }
  }, [editingUpload])

  const saveEditedDirectImage = async (file: File) => {
    setUploading(true)
    setUploadError('')
    try {
      const uploaded = await socialApi.uploadDirect(file)
      onChange({
        ...selection,
        mediaMode: 'DIRECT_UPLOAD',
        directImageUrl: uploaded.imageUrl,
      })
      setEditingUpload(null)
    } catch {
      setUploadError(t('social.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  const stateFor = (platform: SocialPlatform) =>
    states.find((state) => state.platform === platform)
  const availability = (platform: SocialPlatform) =>
    platform === 'INSTAGRAM'
      ? capabilities?.instagramAvailable === true
      : capabilities?.threadsAvailable === true

  const togglePlatform = (platform: SocialPlatform, checked: boolean) => {
    if (editing) {
      const state = stateFor(platform)
      if (!state && allowFirstPublishOnEdit) {
        onChange({
          ...selection,
          [platform === 'INSTAGRAM' ? 'instagram' : 'threads']: checked,
          locale: i18n.language === 'en' ? 'en' : 'ko',
          consentVersion: capabilities?.consentVersion,
          mediaMode: kind === 'review'
            ? 'REVIEW_IMAGE'
            : selection.mediaMode ?? 'TEMPLATE',
          templateId: kind === 'news'
            ? selection.templateId ?? capabilities?.templates[0]?.id
            : selection.templateId,
        })
        return
      }
      if (!state?.canRetry) return
      const next = checked
        ? [...retryIds.filter((id) => id !== state.id), state.id]
        : retryIds.filter((id) => id !== state.id)
      onRetryIdsChange?.(next)
      return
    }
    onChange({
      ...selection,
      [platform === 'INSTAGRAM' ? 'instagram' : 'threads']: checked,
      locale: i18n.language === 'en' ? 'en' : 'ko',
      consentVersion: capabilities?.consentVersion,
      mediaMode: kind === 'review'
        ? 'REVIEW_IMAGE'
        : selection.mediaMode ?? 'TEMPLATE',
      templateId: kind === 'news'
        ? selection.templateId ?? capabilities?.templates[0]?.id
        : selection.templateId,
    })
  }

  const platformRow = (platform: SocialPlatform) => {
    const state = stateFor(platform)
    const failedRetry = Boolean(state?.canRetry && retryIds.includes(state.id))
    const checked = editing
      ? state
        ? Boolean(state.canRetry ? failedRetry : state.status !== 'CANCELED')
        : platform === 'INSTAGRAM' ? selection.instagram : selection.threads
      : platform === 'INSTAGRAM' ? selection.instagram : selection.threads
    const imageUnavailable = kind === 'review' && capabilities?.reviewImageAvailable === false
    const canFirstPublish = editing && allowFirstPublishOnEdit && !state
    const disabled = editing
      ? statesLoading || (canFirstPublish
        ? !availability(platform) || imageUnavailable
        : !state?.canRetry)
      : !availability(platform) || imageUnavailable
    return (
      <div key={platform} className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
        <label className={`flex items-center gap-2 text-sm font-semibold ${disabled ? 'text-neutral-400' : 'text-neutral-700'}`}>
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => togglePlatform(platform, event.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 accent-primary-800"
          />
          {PLATFORM_LABEL[platform]}
        </label>
        {editing && state && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(state)}`}>
            {t(`social.status.${state.status}`)}
          </span>
        )}
        {editing && !state && (
          <span className={`text-xs ${allowFirstPublishOnEdit ? 'text-emerald-700' : 'text-neutral-400'}`}>
            {allowFirstPublishOnEdit
              ? t(kind === 'news' ? 'social.newsFirstPublishAvailable' : 'social.legacyReviewAvailable')
              : t('social.notRequestedAtCreation')}
          </span>
        )}
        {state?.permalink && (
          <a href={state.permalink} target="_blank" rel="noopener noreferrer"
            className="ml-auto text-xs font-semibold text-primary-800 underline">
            {t('social.openPost')}
          </a>
        )}
        {state?.lastError && <p className="w-full text-xs text-red-600">{state.lastError}</p>}
      </div>
    )
  }

  return (
    <section className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <div>
        <p className="text-sm font-bold text-neutral-800">{t('social.publishTitle')}</p>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          {editing
            ? allowFirstPublishOnEdit
              ? t(kind === 'news' ? 'social.editPublishedNewsHelp' : 'social.editLegacyReviewHelp')
              : t('social.editRetryHelp')
            : t('social.publishHelp')}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {platformRow('INSTAGRAM')}
        {platformRow('THREADS')}
      </div>
      {!editing && capabilities && !capabilities.enabled && (
        <p className="text-xs text-amber-700">{t('social.disabled')}</p>
      )}
      {kind === 'review' && capabilities?.reviewImageAvailable === false && (
        <p className="text-xs text-amber-700">{t('social.reviewImageRequired')}</p>
      )}
      {kind === 'news' && newPublishSelected && (
        <div className="space-y-3 border-t border-neutral-200 pt-3">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            {t('social.imageRecommendedResolution')}
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={(selection.mediaMode ?? 'TEMPLATE') === 'TEMPLATE'}
                onChange={() => onChange({ ...selection, mediaMode: 'TEMPLATE', directImageUrl: undefined })} />
              {t('social.templateMode')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={selection.mediaMode === 'DIRECT_UPLOAD'}
                onChange={() => onChange({ ...selection, mediaMode: 'DIRECT_UPLOAD', templateId: undefined })} />
              {t('social.directMode')}
            </label>
          </div>
          {(selection.mediaMode ?? 'TEMPLATE') === 'TEMPLATE' ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(capabilities?.templates ?? []).map((template) => (
                  <button key={template.id} type="button"
                    onClick={() => onChange({ ...selection, mediaMode: 'TEMPLATE', templateId: template.id })}
                    className={`overflow-hidden rounded-lg border-2 text-left ${
                      selection.templateId === template.id ? 'border-primary-700' : 'border-transparent'
                    }`}>
                    <img src={template.backgroundImageUrl} alt="" className="aspect-[4/5] w-full object-cover" />
                    <span className="block truncate bg-white px-2 py-1 text-xs">{template.name}</span>
                  </button>
                ))}
              </div>
              <input type="text" maxLength={200} value={selection.thumbnailText ?? ''}
                onChange={(event) => onChange({ ...selection, thumbnailText: event.target.value })}
                placeholder={t('social.thumbnailTextPlaceholder')}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" />
            </>
          ) : (
            <div className="space-y-2">
              <input type="file" accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.currentTarget.value = ''
                  if (!file) return
                  setUploadError('')
                  setEditingUpload(URL.createObjectURL(file))
                }} />
              {selection.directImageUrl && (
                <img src={selection.directImageUrl} alt={t('social.thumbnailPreview')}
                  className="h-40 rounded-lg border border-neutral-200 object-cover" />
              )}
              {uploading && <p className="text-xs text-neutral-500">{t('social.uploading')}</p>}
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
            </div>
          )}
        </div>
      )}
      {editingUpload && (
        <ImageEditorModal
          open
          onClose={() => setEditingUpload(null)}
          imageSrc={editingUpload}
          onSave={saveEditedDirectImage}
          isSaving={uploading}
          fixedRatio="4:5"
          initialMode="crop"
          outputSize={{ width: 1080, height: 1350 }}
          recommendedResolution={t('social.editorRecommendedResolution')}
        />
      )}
      {newPublishSelected && (
        <label className="flex items-start gap-2 border-t border-neutral-200 pt-3 text-xs leading-5 text-neutral-600">
          <input type="checkbox" checked={selection.consentAccepted}
            onChange={(event) => onChange({
              ...selection,
              consentAccepted: event.target.checked,
              consentVersion: capabilities?.consentVersion,
            })}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-primary-800" />
          <span>{t('social.consent')}</span>
        </label>
      )}
    </section>
  )
}

function statusClass(state: SocialPublication) {
  if (state.status === 'PUBLISHED') return 'bg-emerald-100 text-emerald-700'
  if (state.status === 'FAILED' || state.status === 'EXTERNALLY_DELETED') return 'bg-red-100 text-red-700'
  if (state.status === 'VERIFYING') return 'bg-amber-100 text-amber-700'
  return 'bg-blue-100 text-blue-700'
}
