import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ImageEditorModal from '@/shared/components/ImageEditorModal'
import type { ReviewImageItem, ReviewImagePlanItem } from '../types/review.types'

const MAX_IMAGES = 3
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface ReviewImageDraft {
  key: string
  previewUrl: string
  existingId?: number
  file?: File
}

export function existingReviewImageDrafts(images?: ReviewImageItem[]): ReviewImageDraft[] {
  return (images ?? []).map((image) => ({
    key: `existing-${image.id}`,
    previewUrl: image.imageUrl,
    existingId: image.id,
  }))
}

export function reviewImageSubmission(drafts: ReviewImageDraft[]) {
  const files: File[] = []
  const imagePlan: ReviewImagePlanItem[] = drafts.map((draft) => {
    if (draft.existingId != null && !draft.file) return { imageId: draft.existingId }
    const fileIndex = files.length
    if (!draft.file) throw new Error('Review image draft is missing its file.')
    files.push(draft.file)
    return { fileIndex }
  })
  return { files, imagePlan }
}

interface Props {
  value: ReviewImageDraft[]
  onChange: (next: ReviewImageDraft[]) => void
  disabled?: boolean
}

export default function ReviewImageField({ value, onChange, disabled = false }: Props) {
  const { t } = useTranslation()
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const localUrls = useRef(new Set<string>())

  useEffect(() => () => {
    localUrls.current.forEach((url) => URL.revokeObjectURL(url))
    localUrls.current.clear()
  }, [])

  const replace = (key: string, update: (draft: ReviewImageDraft) => ReviewImageDraft) => {
    onChange(value.map((draft) => draft.key === key ? update(draft) : draft))
  }

  const addFiles = (files: File[]) => {
    setError('')
    const room = MAX_IMAGES - value.length
    if (files.length > room) setError(t('review.images.limit'))
    const accepted = files.slice(0, Math.max(0, room)).filter((file) => {
      if (!ACCEPTED_TYPES.has(file.type)) {
        setError(t('review.images.format'))
        return false
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(t('review.images.size'))
        return false
      }
      return true
    })
    const additions = accepted.map((file) => {
      const previewUrl = URL.createObjectURL(file)
      localUrls.current.add(previewUrl)
      return { key: `new-${crypto.randomUUID()}`, previewUrl, file }
    })
    onChange([...value, ...additions])
  }

  const remove = (draft: ReviewImageDraft) => {
    if (localUrls.current.delete(draft.previewUrl)) URL.revokeObjectURL(draft.previewUrl)
    onChange(value.filter((item) => item.key !== draft.key))
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const editing = value.find((draft) => draft.key === editingKey)

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-neutral-800">{t('review.images.title')}</p>
          <span className="text-xs tabular-nums text-neutral-400">{value.length}/{MAX_IMAGES}</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-neutral-500">{t('review.images.help')}</p>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((draft, index) => (
            <div key={draft.key} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <img
                src={draft.previewUrl}
                alt={t('review.images.previewAlt', { number: index + 1 })}
                className="aspect-[4/5] w-full object-cover"
              />
              <div className="grid grid-cols-2 gap-1 border-t border-neutral-100 p-1.5">
                <button type="button" disabled={disabled} onClick={() => setEditingKey(draft.key)}
                  className="rounded-md px-1 py-1 text-[11px] font-semibold text-primary-800 hover:bg-primary-50 disabled:opacity-40">
                  {t('common.edit')}
                </button>
                <button type="button" disabled={disabled} onClick={() => remove(draft)}
                  className="rounded-md px-1 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40">
                  {t('common.delete')}
                </button>
                <button type="button" disabled={disabled || index === 0} onClick={() => move(index, -1)}
                  aria-label={t('review.images.movePrevious')}
                  className="rounded-md border border-neutral-200 py-1 text-xs text-neutral-500 disabled:opacity-30">
                  ←
                </button>
                <button type="button" disabled={disabled || index === value.length - 1} onClick={() => move(index, 1)}
                  aria-label={t('review.images.moveNext')}
                  className="rounded-md border border-neutral-200 py-1 text-xs text-neutral-500 disabled:opacity-30">
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length < MAX_IMAGES && (
        <label className={`flex min-h-20 cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white px-4 text-center text-xs font-semibold text-neutral-500 hover:border-primary-300 hover:text-primary-800 ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
          {t('review.images.add')}
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only"
            disabled={disabled}
            onChange={(event) => {
              addFiles(Array.from(event.currentTarget.files ?? []))
              event.currentTarget.value = ''
            }} />
        </label>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-[11px] leading-5 text-neutral-400">{t('review.images.publicNotice')}</p>

      {editing && (
        <ImageEditorModal
          open
          onClose={() => setEditingKey(null)}
          imageSrc={editing.previewUrl}
          initialCropRatio="4:5"
          initialMode="crop"
          fitOutputSize={{ width: 1080, height: 1350 }}
          showInstagramCropPreset
          isSaving={false}
          onSave={async (file) => {
            const previewUrl = URL.createObjectURL(file)
            localUrls.current.add(previewUrl)
            if (localUrls.current.delete(editing.previewUrl)) URL.revokeObjectURL(editing.previewUrl)
            replace(editing.key, () => ({ key: editing.key, previewUrl, file }))
            setEditingKey(null)
          }}
        />
      )}
    </section>
  )
}
