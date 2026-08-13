import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { communityApi } from '@/domain/community/api/communityApi'
import PhotoCardSpiritPicker from '@/domain/photo-card/components/PhotoCardSpiritPicker'
import type { PhotoCardSpiritInfo } from '@/domain/photo-card/types/photoCard.types'
import ImageEditorModal from '@/shared/components/ImageEditorModal'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

interface Props {
  open: boolean
  onClose: () => void
}

interface PhotoDraft {
  key: string
  previewUrl: string
  file: File
}

const MAX_IMAGES = 3
const MAX_TITLE = 50
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * 이미지 갤러리에 사진을 그대로 올린다 — 포토카드 편집기를 거치지 않는 짧은 길.
 *
 * 사진은 최대 3장까지 올릴 수 있고, 상세 화면(PhotoPostView)이 여러 장을 슬라이드로 넘긴다.
 * 각 사진은 올리기 전에 이미지 편집기(자르기·회전·모자이크·텍스트)로 손볼 수 있다.
 *
 * 갤러리 목록은 게시글의 첫 이미지를 썸네일로 쓰고, 상세는 본문에서 연결된 첨부(post.images)를
 * 순서대로 보여 준다. 그래서 본문 맨 앞에 고른 순서대로 <img> 를 넣고, 업로드도 순차로 돌린다
 * (첨부 순서가 업로드 순서를 따른다).
 */
export default function PhotoUploadDialog({ open, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [drafts, setDrafts] = useState<PhotoDraft[]>([])
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [tagSpirit, setTagSpirit] = useState<PhotoCardSpiritInfo | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const localUrls = useRef(new Set<string>())

  const releaseUrls = () => {
    localUrls.current.forEach((url) => URL.revokeObjectURL(url))
    localUrls.current.clear()
  }

  useEffect(() => () => releaseUrls(), [])

  // 닫았다 다시 열면 빈 화면에서 시작한다 — 지난번 사진이 남아 있으면 실수로 다시 올리게 된다.
  useEffect(() => {
    if (open) return
    releaseUrls()
    setDrafts([])
    setEditingKey(null)
    setTitle('')
    setCaption('')
    setTagSpirit(null)
    setError(null)
  }, [open])

  const addFiles = (files: File[]) => {
    setError(null)
    const room = MAX_IMAGES - drafts.length
    if (files.length > room) setError(t('photoGallery.upload.limit', { max: MAX_IMAGES }))
    const accepted = files.slice(0, Math.max(0, room)).filter((file) => {
      if (!ACCEPTED_TYPES.has(file.type)) {
        setError(t('photoGallery.upload.format'))
        return false
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(t('photoGallery.upload.size', { max: MAX_FILE_SIZE / 1024 / 1024 }))
        return false
      }
      return true
    })
    const additions = accepted.map((file) => {
      const previewUrl = URL.createObjectURL(file)
      localUrls.current.add(previewUrl)
      return { key: `photo-${crypto.randomUUID()}`, previewUrl, file }
    })
    if (additions.length > 0) setDrafts((current) => [...current, ...additions])
  }

  const remove = (draft: PhotoDraft) => {
    if (localUrls.current.delete(draft.previewUrl)) URL.revokeObjectURL(draft.previewUrl)
    setDrafts((current) => current.filter((item) => item.key !== draft.key))
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    setDrafts((current) => {
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const editing = drafts.find((draft) => draft.key === editingKey)

  const submit = async () => {
    if (submitting) return
    if (drafts.length === 0) {
      setError(t('photoGallery.upload.imagesRequired'))
      return
    }
    if (!title.trim()) {
      setError(t('photoCard.titleRequired'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // 순차 업로드 — 첨부(post.images)가 저장 순서대로 쌓여야 상세의 슬라이드 순서가 맞는다.
      const imageUrls: string[] = []
      for (const draft of drafts) {
        const uploaded = (await communityApi.uploadPostImage(draft.file)).data.data
        if (!uploaded) throw new Error('image upload failed')
        imageUrls.push(uploaded.imageUrl)
      }
      const escapedCaption = caption
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .split('\n').map((line) => `<p>${line || '<br>'}</p>`).join('')
      const created = (await communityApi.createPost({
        boardType: 'PHOTO',
        title: title.trim(),
        content: `${imageUrls.map((url) => `<p><img src="${url}" alt=""></p>`).join('')}${escapedCaption}`,
        spiritTagIds: tagSpirit?.spiritId ? [tagSpirit.spiritId] : undefined,
      })).data.data
      if (!created) throw new Error('post creation failed')
      void queryClient.invalidateQueries({ queryKey: ['photoGalleryPosts'] })
      navigate(`/community/photo/${created.id}`)
    } catch {
      setError(t('photoCard.publishFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? () => {} : onClose} className="relative z-50">
      <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4">
        <DialogPanel className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-neutral-200 px-5 py-4">
            <DialogTitle className="text-base font-bold text-neutral-900">
              {t('photoGallery.upload.title')}
            </DialogTitle>
            <p className="mt-1 text-xs text-neutral-500">
              {t('photoGallery.upload.help', { max: MAX_IMAGES })}
            </p>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500">
                  {t('photoGallery.upload.images')}
                </span>
                <span className="font-mono text-[10px] text-neutral-400">
                  {drafts.length}/{MAX_IMAGES}
                </span>
              </div>

              {drafts.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {drafts.map((draft, index) => (
                    <div key={draft.key} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                      <div className="relative">
                        <img
                          src={draft.previewUrl}
                          alt={t('photoGallery.upload.previewAlt', { number: index + 1 })}
                          className="aspect-[4/5] w-full object-cover"
                        />
                        {/* 첫 장이 목록 썸네일이 된다 — 순서 버튼이 무엇을 위한 것인지 이 배지가 설명한다 */}
                        {index === 0 && (
                          <span className="absolute left-1.5 top-1.5 rounded-md bg-primary-800/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {t('photoGallery.upload.primary')}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => {
                            if (window.confirm(t('photoGallery.upload.deleteConfirm'))) remove(draft)
                          }}
                          aria-label={t('common.delete')}
                          className="absolute right-1.5 top-1.5 flex size-9 items-center justify-center rounded-full
                            bg-neutral-900/60 text-white transition-colors hover:bg-neutral-900/80 disabled:opacity-40"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-stretch gap-1 border-t border-neutral-100 p-1">
                        <button
                          type="button"
                          disabled={submitting || index === 0}
                          onClick={() => move(index, -1)}
                          aria-label={t('photoGallery.upload.movePrevious')}
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setEditingKey(draft.key)}
                          className="min-h-9 flex-1 rounded-lg px-1 text-xs font-semibold text-primary-800 hover:bg-primary-50 disabled:opacity-40"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          disabled={submitting || index === drafts.length - 1}
                          onClick={() => move(index, 1)}
                          aria-label={t('photoGallery.upload.moveNext')}
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 disabled:opacity-30"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {drafts.length < MAX_IMAGES && (
                <label
                  className={`flex min-h-20 cursor-pointer items-center justify-center rounded-xl border border-dashed
                    border-neutral-300 bg-neutral-50 px-4 py-3 text-center text-xs font-semibold leading-5 text-neutral-500
                    hover:border-primary-400 hover:text-primary-800 ${submitting ? 'pointer-events-none opacity-40' : ''}`}
                >
                  {t('photoGallery.upload.add')}
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={submitting}
                    onChange={(event) => {
                      addFiles(Array.from(event.currentTarget.files ?? []))
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="photo-upload-title" className="text-xs font-semibold text-neutral-500">
                    {t('photoCard.postTitle')}
                  </label>
                  <span className="font-mono text-[10px] text-neutral-400">{title.length}/{MAX_TITLE}</span>
                </div>
                <input
                  id="photo-upload-title"
                  value={title}
                  maxLength={MAX_TITLE}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('photoCard.postTitlePlaceholder')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="photo-upload-caption" className="mb-1.5 block text-xs font-semibold text-neutral-500">
                  {t('photoCard.postCaption')}
                </label>
                <AutoGrowTextarea
                  id="photo-upload-caption"
                  rows={6}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder={t('photoCard.postCaptionPlaceholder')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-neutral-500">{t('photoCard.spiritTag')}</span>
                  <span className="text-[10px] text-neutral-400">{t('photoCard.spiritTagOptional')}</span>
                </div>
                {tagSpirit?.spiritId ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-neutral-900">
                      {tagSpirit.nameKo}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="shrink-0 text-[11px] font-semibold text-primary-700 hover:underline"
                    >
                      {t('photoCard.changeSpirit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTagSpirit(null)}
                      className="shrink-0 text-[11px] font-semibold text-neutral-400 hover:text-red-600"
                    >
                      {t('photoCard.clearSpirit')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="w-full rounded-lg border border-dashed border-neutral-300 px-3 py-2.5 text-sm font-semibold text-neutral-500 hover:border-primary-400 hover:text-primary-700"
                  >
                    ＋ {t('photoCard.searchSpirit')}
                  </button>
                )}
                <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">
                  {t('photoCard.spiritHint')}
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void submit() }}
              disabled={submitting || drafts.length === 0}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-bold text-white hover:bg-primary-500 disabled:opacity-50"
            >
              {submitting ? t('photoCard.publishing') : t('photoCard.publish')}
            </button>
          </div>
        </DialogPanel>
      </div>

      <PhotoCardSpiritPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(info) => setTagSpirit(info)}
      />

      {editing && (
        <ImageEditorModal
          open
          onClose={() => setEditingKey(null)}
          imageSrc={editing.previewUrl}
          fitOutputSize={{ width: 2048, height: 2048 }}
          showInstagramCropPreset
          isSaving={false}
          onSave={async (file) => {
            const previewUrl = URL.createObjectURL(file)
            localUrls.current.add(previewUrl)
            if (localUrls.current.delete(editing.previewUrl)) URL.revokeObjectURL(editing.previewUrl)
            setDrafts((current) => current.map((draft) => (
              draft.key === editing.key ? { ...draft, previewUrl, file } : draft
            )))
            setEditingKey(null)
          }}
        />
      )}
    </Dialog>
  )
}
