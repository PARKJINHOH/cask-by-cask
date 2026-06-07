import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'
import {
  useCreateFeedback,
  useFeedbackDetail,
  useUpdateFeedback,
} from '@/domain/feedback/hooks/useFeedback'
import { FEEDBACK_TYPES, type FeedbackType } from '@/domain/feedback/types/feedback.types'

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
  const { id } = useParams()
  const isEdit = !!id
  const feedbackId = Number(id)

  const { data: detail } = useFeedbackDetail(isEdit ? feedbackId : 0)
  const createMutation = useCreateFeedback()
  const updateMutation = useUpdateFeedback(feedbackId)

  const [type, setType] = useState<FeedbackType | ''>('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
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
    }
  }, [isEdit, detail])

  const submitting = createMutation.isPending || updateMutation.isPending

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!type) errs.type = t('feedback.form.typePlaceholder')
    if (!title.trim()) errs.title = t('common.required')
    if (!content.trim()) errs.content = t('common.required')
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
        await updateMutation.mutateAsync({ type: type as FeedbackType, title, content })
        navigate(`/request/feedback/${feedbackId}`)
      } else {
        const newId = await createMutation.mutateAsync({
          data: { type: type as FeedbackType, title, content },
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
              errors.type ? 'border-red-400' : 'border-neutral-200'
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
              errors.title ? 'border-red-400' : 'border-neutral-200'
            }`}
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('feedback.form.content')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={8}
            placeholder={t('feedback.form.contentPlaceholder')}
            className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors resize-none ${
              errors.content ? 'border-red-400' : 'border-neutral-200'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.content ? <p className="text-xs text-red-500">{errors.content}</p> : <span />}
            <p className="text-xs text-neutral-400">{content.length} / 5,000</p>
          </div>
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
