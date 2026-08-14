import { useEffect, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { communityApi } from '@/domain/community/api/communityApi'
import PhotoCardSpiritPicker from './PhotoCardSpiritPicker'
import type { PhotoCardSpiritInfo } from '../types/photoCard.types'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

interface Props {
  open: boolean
  onClose: () => void
  previewUrl: string | null
  /** 완성된 포토카드 이미지 파일 */
  file: File | null
  /** 편집기에서 이미 고른 주류가 있으면 기본 태그로 쓴다 */
  spirit: PhotoCardSpiritInfo | null
}

const MAX_TITLE = 50

/**
 * 만든 포토카드를 이미지 갤러리(커뮤니티 PHOTO 게시판)에 올린다.
 *
 * 갤러리 목록은 게시글의 첫 이미지를 썸네일로 쓰므로, 본문 맨 앞에 이미지를 넣는다.
 * 포토카드에서 고른 주류는 그대로 게시글 태그가 되어 주류 상세와 연결된다.
 */
export default function PhotoCardPublishDialog({ open, onClose, previewUrl, file, spirit }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 게시 시점에 태그할 주류를 고른다. 편집기에서 이미 고른 게 있으면 그대로 이어받는다.
  // 필수는 아니다 — 주류를 정하지 않은 사진도 갤러리에 올릴 수 있다.
  const [tagSpirit, setTagSpirit] = useState<PhotoCardSpiritInfo | null>(spirit)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => { setTagSpirit(spirit) }, [spirit])

  const submit = async () => {
    if (!file || submitting) return
    if (!title.trim()) {
      setError(t('photoCard.titleRequired'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const uploaded = (await communityApi.uploadPostImage(file)).data.data
      if (!uploaded) throw new Error('image upload failed')
      const escaped = caption
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .split('\n').map((line) => `<p>${line || '<br>'}</p>`).join('')
      const created = (await communityApi.createPost({
        boardType: 'PHOTO',
        title: title.trim(),
        content: `<p><img src="${uploaded.imageUrl}" alt=""></p>${escaped}`,
        spiritTagIds: tagSpirit?.spiritId ? [tagSpirit.spiritId] : undefined,
      })).data.data
      if (!created) throw new Error('post creation failed')
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
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-neutral-200 px-5 py-4">
            <DialogTitle className="text-base font-bold text-neutral-900">
              {t('photoCard.publishToGallery')}
            </DialogTitle>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
            <div className="rounded-xl bg-neutral-100 p-3">
              {previewUrl && (
                <img src={previewUrl} alt="" className="mx-auto max-h-[46vh] w-auto rounded-lg shadow" />
              )}
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="photo-card-title" className="text-xs font-semibold text-neutral-500">
                    {t('photoCard.postTitle')}
                  </label>
                  <span className="font-mono text-[10px] text-neutral-400">{title.length}/{MAX_TITLE}</span>
                </div>
                <input
                  id="photo-card-title"
                  value={title}
                  maxLength={MAX_TITLE}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('photoCard.postTitlePlaceholder')}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="photo-card-caption" className="mb-1.5 block text-xs font-semibold text-neutral-500">
                  {t('photoCard.postCaption')}
                </label>
                <AutoGrowTextarea
                  id="photo-card-caption"
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
              {t('common.cancel', '취소')}
            </button>
            <button
              type="button"
              onClick={() => { void submit() }}
              disabled={submitting || !file}
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
    </Dialog>
  )
}
