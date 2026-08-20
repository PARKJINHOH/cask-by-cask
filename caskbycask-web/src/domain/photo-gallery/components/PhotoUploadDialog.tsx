import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, DragEvent } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { communityApi } from '@/domain/community/api/communityApi'
import PhotoCardSpiritPicker from '@/domain/photo-card/components/PhotoCardSpiritPicker'
import type { PhotoCardSpiritInfo } from '@/domain/photo-card/types/photoCard.types'
import ImageEditorModal from '@/shared/components/ImageEditorModal'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'
import Modal from '@/shared/components/Modal'
import { resolveUploadErrorReason } from '@/shared/utils/uploadError'
import { UPLOAD_MAX_EDGE, downscaleImageFile } from '../utils/downscaleImage'

interface Props {
  open: boolean
  onClose: () => void
}

interface PhotoDraft {
  key: string
  previewUrl: string
  file: File
}

interface UploadProgress {
  current: number
  total: number
  percent: number
}

const MAX_IMAGES = 3
const MAX_TITLE = 50
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * 이미지 갤러리에 사진을 그대로 올린다 — 포토카드 편집기를 거치지 않는 짧은 길.
 *
 * 사진은 최대 3장까지 올릴 수 있고, 상세 화면(PhotoPostView)이 여러 장을 슬라이드로 넘긴다.
 * 각 사진은 올리기 전에 이미지 편집기(자르기·회전·모자이크·텍스트)로 손볼 수 있다.
 *
 * 갤러리 목록은 게시글의 첫 이미지를 썸네일로 쓰고, 상세는 본문에서 연결된 첨부(post.images)를
 * 순서대로 보여 준다. 그래서 본문 맨 앞에 고른 순서대로 <img> 를 넣고, 업로드도 순차로 돌린다
 * (첨부 순서가 업로드 순서를 따른다).
 *
 * 고른 사진은 **담는 시점에 바로 축소**한다(downscaleImage). 그래야
 *   - 폰 원본(수십 MB)이 용량 제한에 걸려 되튕기지 않고,
 *   - 미리보기·편집기·업로드가 모두 가벼운 파일 하나를 공유한다.
 */
export default function PhotoUploadDialog({ open, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [drafts, setDrafts] = useState<PhotoDraft[]>([])
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [tagSpirit, setTagSpirit] = useState<PhotoCardSpiritInfo | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const localUrls = useRef(new Set<string>())

  const busy = submitting || preparing

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
    setDeletingKey(null)
    setTitle('')
    setCaption('')
    setTagSpirit(null)
    setProgress(null)
    setDropActive(false)
    setDraggingKey(null)
    setError(null)
  }, [open])

  const addFiles = async (files: File[]) => {
    setError(null)
    const room = MAX_IMAGES - drafts.length
    if (room <= 0) {
      setError(t('photoGallery.upload.limit', { max: MAX_IMAGES }))
      return
    }
    if (files.length > room) setError(t('photoGallery.upload.limit', { max: MAX_IMAGES }))

    // 형식은 여기서 거르지 않는다 — file.type 은 확장자에서 추측한 값이라 실제 내용과 다를 수 있다.
    // 축소할 수 없는 파일은 원본 그대로 두고, 서버가 Magic Bytes 로 최종 형식을 판정한다.
    const candidates = files.slice(0, room)
    if (candidates.length === 0) return

    setPreparing(true)
    try {
      const additions: PhotoDraft[] = []
      for (const candidate of candidates) {
        // 용량 검사보다 축소를 먼저 한다 — 폰 원본은 대부분 10MB 를 넘지만 줄이면 통과한다.
        const prepared = await downscaleImageFile(candidate)
        if (prepared.size > MAX_FILE_SIZE) {
          setError(t('photoGallery.upload.size', { max: MAX_FILE_SIZE / 1024 / 1024 }))
          continue
        }
        const previewUrl = URL.createObjectURL(prepared)
        localUrls.current.add(previewUrl)
        additions.push({ key: `photo-${crypto.randomUUID()}`, previewUrl, file: prepared })
      }
      // 담는 동안 다른 경로로 사진이 늘었을 수 있어 상한은 여기서 한 번 더 건다.
      if (additions.length > 0) {
        setDrafts((current) => [...current, ...additions].slice(0, MAX_IMAGES))
      }
    } finally {
      setPreparing(false)
    }
  }

  const remove = (draft: PhotoDraft) => {
    if (localUrls.current.delete(draft.previewUrl)) URL.revokeObjectURL(draft.previewUrl)
    setDrafts((current) => current.filter((item) => item.key !== draft.key))
  }

  /** 사진을 fromIndex 에서 뽑아 toIndex 자리에 꽂는다. 화살표 버튼과 끌어 놓기가 함께 쓴다. */
  const moveTo = (fromIndex: number, toIndex: number) => {
    setDrafts((current) => {
      if (fromIndex === toIndex) return current
      if (fromIndex < 0 || fromIndex >= current.length) return current
      if (toIndex < 0 || toIndex >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const handleFileDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDropActive(false)
    // 썸네일 순서 바꾸기 드래그는 파일이 없다 — 그때는 여기서 아무것도 하지 않는다.
    const files = Array.from(event.dataTransfer?.files ?? [])
    if (files.length > 0) void addFiles(files)
  }

  const handlePaste = (event: ClipboardEvent<HTMLElement>) => {
    const files = Array.from(event.clipboardData?.files ?? [])
    if (files.length === 0) return // 글자 붙여넣기는 입력칸이 그대로 처리해야 한다
    event.preventDefault()
    void addFiles(files)
  }

  const editing = drafts.find((draft) => draft.key === editingKey)
  const deleting = drafts.find((draft) => draft.key === deletingKey)

  const submit = async () => {
    if (busy) return
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
      for (let index = 0; index < drafts.length; index += 1) {
        setProgress({ current: index + 1, total: drafts.length, percent: 0 })
        const uploaded = (await communityApi.uploadPostImage(
          drafts[index].file,
          (percent) => setProgress({ current: index + 1, total: drafts.length, percent }),
        )).data.data
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
    } catch (error: unknown) {
      setError(resolveUploadErrorReason(error, {
        network: t('common.uploadReason.network'),
        auth: t('common.uploadReason.auth'),
        tooLarge: t('common.uploadReason.tooLarge'),
        rateLimited: t('common.uploadReason.rateLimited'),
        server: t('common.uploadReason.server'),
      }))
    } finally {
      setSubmitting(false)
      setProgress(null)
    }
  }

  return (
    <Dialog open={open} onClose={busy ? () => {} : onClose} className="relative z-50">
      <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4">
        <DialogPanel
          onPaste={handlePaste}
          className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
        >
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
                    <div
                      key={draft.key}
                      // 끌어 놓기로 순서를 바꾼다. 모바일·키보드 사용자를 위해 ←→ 버튼도 그대로 남긴다.
                      draggable={!busy}
                      onDragStart={() => setDraggingKey(draft.key)}
                      onDragEnd={() => setDraggingKey(null)}
                      onDragOver={(event) => {
                        if (draggingKey && draggingKey !== draft.key) event.preventDefault()
                      }}
                      onDrop={(event) => {
                        if (!draggingKey) return
                        event.preventDefault()
                        event.stopPropagation()
                        moveTo(drafts.findIndex((item) => item.key === draggingKey), index)
                        setDraggingKey(null)
                      }}
                      title={t('photoGallery.upload.dragToReorder')}
                      className={`overflow-hidden rounded-xl border bg-white transition-opacity ${
                        draggingKey === draft.key
                          ? 'border-primary-400 opacity-50'
                          : 'border-neutral-200'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={draft.previewUrl}
                          alt={t('photoGallery.upload.previewAlt', { number: index + 1 })}
                          // 이미지 자체가 끌리면 부모의 순서 바꾸기 드래그가 시작되지 않는다.
                          draggable={false}
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
                          disabled={busy}
                          onClick={() => setDeletingKey(draft.key)}
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
                          disabled={busy || index === 0}
                          onClick={() => moveTo(index, index - 1)}
                          aria-label={t('photoGallery.upload.movePrevious')}
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setEditingKey(draft.key)}
                          className="min-h-9 flex-1 rounded-lg px-1 text-xs font-semibold text-primary-800 hover:bg-primary-50 disabled:opacity-40"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          disabled={busy || index === drafts.length - 1}
                          onClick={() => moveTo(index, index + 1)}
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
                  onDragOver={(event) => {
                    if (draggingKey) return // 순서 바꾸기 중에는 파일 드롭존을 켜지 않는다
                    event.preventDefault()
                    setDropActive(true)
                  }}
                  onDragLeave={() => setDropActive(false)}
                  onDrop={handleFileDrop}
                  className={`flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl
                    border border-dashed px-4 py-3 text-center text-xs font-semibold leading-5
                    ${dropActive
                      ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-primary-400 hover:text-primary-800'}
                    ${busy ? 'pointer-events-none opacity-40' : ''}`}
                >
                  <span>
                    {dropActive
                      ? t('photoGallery.upload.dropActive')
                      : t('photoGallery.upload.add')}
                  </span>
                  {!dropActive && (
                    <span className="text-[10px] font-normal text-neutral-400">
                      {t('photoGallery.upload.dropHint')}
                    </span>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    disabled={busy}
                    onChange={(event) => {
                      void addFiles(Array.from(event.currentTarget.files ?? []))
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
              )}

              {preparing && (
                <p className="text-[11px] text-neutral-500">{t('photoGallery.upload.preparing')}</p>
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

          {/* 업로드 진행률 — 사진이 크면 몇 초씩 걸려서, 멈춘 것처럼 보이지 않게 한다 */}
          {progress && (
            <div className="border-t border-neutral-200 px-5 py-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-neutral-500">
                <span>
                  {t('photoGallery.upload.progress', {
                    current: progress.current,
                    total: progress.total,
                    percent: progress.percent,
                  })}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-primary-600 transition-[width] duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void submit() }}
              disabled={busy || drafts.length === 0}
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

      <Modal
        open={!!deleting}
        onClose={() => setDeletingKey(null)}
        title={t('photoGallery.upload.deleteTitle')}
        size="sm"
      >
        <p className="text-sm leading-relaxed text-neutral-600">
          {t('photoGallery.upload.deleteConfirm')}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeletingKey(null)}
            className="h-10 rounded-xl border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (deleting) remove(deleting)
              setDeletingKey(null)
            }}
            className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
          >
            {t('common.delete')}
          </button>
        </div>
      </Modal>

      {editing && (
        <ImageEditorModal
          open
          onClose={() => setEditingKey(null)}
          imageSrc={editing.previewUrl}
          fitOutputSize={{ width: UPLOAD_MAX_EDGE, height: UPLOAD_MAX_EDGE }}
          // 사진에는 투명도가 없다. 기본값(PNG)으로 두면 편집한 사진이 원본 JPEG 보다 커진다.
          outputFormat="image/jpeg"
          outputQuality={0.92}
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
