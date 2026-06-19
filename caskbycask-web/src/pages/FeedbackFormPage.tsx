import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'
import Breadcrumb from '@/shared/components/Breadcrumb'
import PostEditor from '@/domain/community/components/PostEditor'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'
import {
  useCreateFeedback,
  useFeedbackDetail,
  useUpdateFeedback,
} from '@/domain/feedback/hooks/useFeedback'
import { FEEDBACK_TYPES, type FeedbackType } from '@/domain/feedback/types/feedback.types'

// 리치 에디터 본문이 비었는지 판정 — 태그만 있고 텍스트·미디어가 없으면 빈 것으로 본다.
const isContentEmpty = (html: string) => {
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  return text.length === 0 && !/<(img|video|iframe)/i.test(html)
}

const MAX_IMAGES = 3
const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface ImagePreview {
  file: File
  url: string
}

export default function FeedbackFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = !!id
  const feedbackId = Number(id)

  const { data: detail } = useFeedbackDetail(isEdit ? feedbackId : 0)
  const createMutation = useCreateFeedback()
  const updateMutation = useUpdateFeedback(feedbackId)

  // 신규 작성 시 쿼리스트링 프리필 (예: 술 상세 → 정보 오류 신고)
  const presetType = searchParams.get('type')
  const [type, setType] = useState<FeedbackType | ''>(
    !isEdit && FEEDBACK_TYPES.includes(presetType as FeedbackType) ? (presetType as FeedbackType) : '',
  )
  const [title, setTitle] = useState(isEdit ? '' : (searchParams.get('title') ?? ''))
  const [content, setContent] = useState(isEdit ? '' : (searchParams.get('content') ?? ''))
  const [isPublic, setIsPublic] = useState(true)
  const [images, setImages] = useState<ImagePreview[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 수정 모드 프리필
  useEffect(() => {
    if (isEdit && detail) {
      setType(detail.type)
      setTitle(detail.title)
      setContent(detail.content)
      setIsPublic(detail.isPublic)
    }
  }, [isEdit, detail])

  const submitting = createMutation.isPending || updateMutation.isPending

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!type) errs.type = t('feedback.form.typePlaceholder')
    if (!title.trim()) errs.title = t('common.required')
    if (isContentEmpty(content)) errs.content = t('common.required')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    const remaining = MAX_IMAGES - images.length
    const toAdd = files.slice(0, remaining)
    const newPreviews: ImagePreview[] = []
    for (const file of toAdd) {
      if (!ALLOWED_TYPES.includes(file.type)) continue
      if (file.size > MAX_FILE_SIZE) continue
      newPreviews.push({ file, url: URL.createObjectURL(file) })
    }
    setImages((prev) => [...prev, ...newPreviews])
  }

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].url)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitError('')
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ type: type as FeedbackType, title, content, isPublic })
        navigate(`/request/feedback/${feedbackId}`)
      } else {
        const newId = await createMutation.mutateAsync({
          data: { type: type as FeedbackType, title, content, isPublic },
          images: images.map((i) => i.file),
        })
        images.forEach((i) => URL.revokeObjectURL(i.url))
        navigate(`/request/feedback/${newId}`)
      }
    } catch {
      setSubmitError(t('feedback.form.error'))
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <SeoMeta title={isEdit ? t('feedback.form.editTitle') : t('feedback.new')} noindex />
      <Toast toasts={toasts} onRemove={removeToast} />

      <Breadcrumb
        className="mb-2"
        items={[
          { label: t('menu.request') },
          { label: t('menu.requestFeedback'), to: '/request/feedback' },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">
          {isEdit ? t('feedback.form.editTitle') : t('feedback.new')}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 유형 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('feedback.form.type')} <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FeedbackType)}
            className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
              errors.type ? 'border-red-400' : 'border-neutral-300'
            }`}
          >
            <option value="">{t('feedback.form.typePlaceholder')}</option>
            {FEEDBACK_TYPES.map((c) => (
              <option key={c} value={c}>
                {t(`feedback.type.${c}`)}
              </option>
            ))}
          </select>
          {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('feedback.form.title')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder={t('feedback.form.titlePlaceholder')}
            className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
              errors.title ? 'border-red-400' : 'border-neutral-300'
            }`}
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('feedback.form.content')} <span className="text-red-500">*</span>
          </label>
          <PostEditor
            value={content}
            onChange={setContent}
            placeholder={t('feedback.form.contentPlaceholder')}
            onImageError={(msg) => showToast(msg, 'error')}
            onVideoError={(msg) => showToast(msg, 'error')}
          />
          {errors.content && <p className="mt-1 text-xs text-red-500">{errors.content}</p>}
        </div>

        {/* 공개 여부 */}
        <div className="flex items-start gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
          <input
            id="feedback-private"
            type="checkbox"
            checked={!isPublic}
            onChange={(e) => setIsPublic(!e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary-700"
          />
          <label htmlFor="feedback-private" className="text-sm text-neutral-700 cursor-pointer">
            <span className="font-medium">{t('feedback.form.isPrivate')}</span>
            <p className="mt-0.5 text-xs text-neutral-400">{t('feedback.form.isPrivateHint')}</p>
          </label>
        </div>

        {/* 이미지 첨부 — 신규 작성 시에만 */}
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {t('feedback.form.images')}
              <span className="ml-1.5 text-xs font-normal text-neutral-400">
                {t('feedback.form.imagesHint')}
              </span>
            </label>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group w-24 h-24">
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover rounded-lg border border-neutral-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                        flex items-center justify-center text-xs opacity-0 group-hover:opacity-100
                        transition-opacity shadow-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length < MAX_IMAGES && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-dashed
                    border-neutral-300 rounded-xl text-neutral-500 hover:border-primary-400
                    hover:text-primary-800 transition-colors"
                >
                  {t('feedback.form.addImage')} ({images.length}/{MAX_IMAGES})
                </button>
              </>
            )}
          </div>
        )}

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {submitError}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/request/feedback/${feedbackId}` : '/request/feedback')}
            className="flex-1 py-3 border border-neutral-200 text-neutral-600 text-sm font-semibold rounded-xl
              hover:bg-neutral-50 transition-colors"
          >
            {t('feedback.form.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 bg-primary-800 text-white text-sm font-semibold rounded-xl
              hover:bg-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit
              ? submitting ? t('feedback.form.updating') : t('feedback.form.update')
              : submitting ? t('feedback.form.submitting') : t('feedback.form.submit')}
          </button>
        </div>
      </form>
    </div>
  )
}
