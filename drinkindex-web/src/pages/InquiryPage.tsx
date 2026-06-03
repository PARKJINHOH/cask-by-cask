import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { submitInquiry } from '@/domain/inquiry/api/inquiryApi'
import type { InquiryCategory } from '@/domain/inquiry/types/inquiry.types'
import SeoMeta from '@/shared/components/SeoMeta'

const CATEGORIES: InquiryCategory[] = ['BUG_REPORT', 'FEATURE_REQUEST', 'ACCOUNT_INQUIRY', 'OTHER']
const MAX_IMAGES = 3
const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface ImagePreview {
  file: File
  url: string
}

export default function InquiryPage() {
  const { t } = useTranslation()

  const [category, setCategory] = useState<InquiryCategory | ''>('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [images, setImages] = useState<ImagePreview[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!category) errs.category = t('inquiry.form.categoryPlaceholder')
    if (!title.trim()) errs.title = t('common.required')
    if (!body.trim()) errs.body = t('common.required')
    if (!senderEmail.trim()) errs.senderEmail = t('common.required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) errs.senderEmail = t('inquiry.form.senderEmailInvalid')
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
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`${file.name}: JPG, PNG, WEBP, GIF 형식만 가능합니다.`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name}: 파일 크기가 2MB를 초과합니다.`)
        continue
      }
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
    setSubmitting(true)
    setSubmitError('')
    try {
      await submitInquiry(
        { category: category as InquiryCategory, title, body, senderEmail },
        images.map((i) => i.file),
      )
      setSubmitted(true)
      images.forEach((i) => URL.revokeObjectURL(i.url))
    } catch {
      setSubmitError(t('inquiry.form.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">{t('inquiry.form.success')}</h2>
        <a href="/" className="mt-6 inline-block text-sm text-primary-800 hover:underline">
          {t('nav.home')} →
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <SeoMeta title={t('inquiry.title')} description={t('inquiry.subtitle')} noindex />
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">{t('inquiry.title')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('inquiry.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 문의 유형 + 이메일 (PC 2열) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {t('inquiry.form.category')} <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as InquiryCategory)}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
                errors.category ? 'border-red-400' : 'border-neutral-200'
              }`}
            >
              <option value="">{t('inquiry.form.categoryPlaceholder')}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`inquiry.category.${c}`)}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              {t('inquiry.form.senderEmail')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              maxLength={200}
              placeholder="이메일 입력"
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
                errors.senderEmail ? 'border-red-400' : 'border-neutral-200'
              }`}
            />
            {errors.senderEmail && <p className="mt-1 text-xs text-red-500">{errors.senderEmail}</p>}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('inquiry.form.title')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder={t('inquiry.form.titlePlaceholder')}
            className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
              errors.title ? 'border-red-400' : 'border-neutral-200'
            }`}
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('inquiry.form.body')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={8}
            placeholder={t('inquiry.form.bodyPlaceholder')}
            className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors resize-none ${
              errors.body ? 'border-red-400' : 'border-neutral-200'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.body ? (
              <p className="text-xs text-red-500">{errors.body}</p>
            ) : <span />}
            <p className="text-xs text-neutral-400">{body.length} / 5,000</p>
          </div>
        </div>

        {/* 이미지 첨부 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('inquiry.form.images')}
            <span className="ml-1.5 text-xs font-normal text-neutral-400">
              {t('inquiry.form.imagesHint')}
            </span>
          </label>

          {/* 이미지 미리보기 */}
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
                  <p className="text-xs text-neutral-400 mt-1 truncate max-w-[96px]">
                    {img.file.name}
                  </p>
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
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                {t('inquiry.form.addImage')} ({images.length}/{MAX_IMAGES})
              </button>
            </>
          )}
        </div>

        {/* 에러 메시지 */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {submitError}
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-primary-800 text-white text-sm font-semibold rounded-xl
            hover:bg-primary-900 active:bg-primary-800 transition-colors disabled:opacity-50
            disabled:cursor-not-allowed"
        >
          {submitting ? t('inquiry.form.submitting') : t('inquiry.form.submit')}
        </button>
      </form>
    </div>
  )
}
