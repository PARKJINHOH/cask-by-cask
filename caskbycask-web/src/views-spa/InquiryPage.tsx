import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { submitInquiry } from '@/domain/inquiry/api/inquiryApi'
import type { InquiryCategory } from '@/domain/inquiry/types/inquiry.types'
import SeoMeta from '@/shared/components/SeoMeta'
import RichTextEditor from '@/shared/tiptap/RichTextEditor'

const CATEGORIES: InquiryCategory[] = [
  'BUG_REPORT',
  'FEATURE_REQUEST',
  'ACCOUNT_INQUIRY',
  'PARTNERSHIP_INQUIRY',
  'OTHER',
]
const MAX_ATTACHMENTS = 3
const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_TOTAL_SIZE = 15 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif',
  'pdf', 'txt', 'csv', 'docx', 'xlsx', 'pptx', 'hwp', 'hwpx',
])
const FILE_ACCEPT = [...ALLOWED_EXTENSIONS].map((extension) => `.${extension}`).join(',')

const hasTextContent = (html: string) => {
  const container = document.createElement('div')
  container.innerHTML = html
  return Boolean(container.textContent?.trim())
}

const templateToHtml = (template: string) => template
  .split('\n')
  .map((line) => {
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return /^\[.+\]$/.test(line) ? `<h3>${escaped}</h3>` : `<p>${escaped || '<br>'}</p>`
  })
  .join('')

const formatFileSize = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`

export default function InquiryPage() {
  const { t } = useTranslation()

  const [category, setCategory] = useState<InquiryCategory | ''>('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [bodyEdited, setBodyEdited] = useState(false)
  const [senderEmail, setSenderEmail] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!category) errs.category = t('inquiry.form.categoryPlaceholder')
    if (!title.trim()) errs.title = t('common.required')
    if (!hasTextContent(body)) errs.body = t('common.required')
    if (!senderEmail.trim()) errs.senderEmail = t('common.required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) errs.senderEmail = t('inquiry.form.senderEmailInvalid')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCategoryChange = (nextCategory: InquiryCategory | '') => {
    if (nextCategory === category) return

    if (!nextCategory) {
      setCategory('')
      return
    }

    if (hasTextContent(body) && bodyEdited && !window.confirm(t('inquiry.form.templateReplaceConfirm'))) {
      return
    }

    setCategory(nextCategory)
    setBody(templateToHtml(t(`inquiry.template.${nextCategory}`)))
    setBodyEdited(false)
    setErrors((prev) => {
      const next = { ...prev }
      delete next.category
      delete next.body
      return next
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''

    const remaining = MAX_ATTACHMENTS - attachments.length
    if (files.length > remaining) {
      alert(t('inquiry.form.tooManyAttachments', { count: MAX_ATTACHMENTS }))
    }

    const toAdd = files.slice(0, remaining)
    const validFiles: File[] = []
    for (const file of toAdd) {
      const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : ''
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        alert(t('inquiry.form.invalidAttachmentType', { name: file.name }))
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(t('inquiry.form.attachmentTooLarge', { name: file.name }))
        continue
      }
      validFiles.push(file)
    }

    const nextTotalSize = [...attachments, ...validFiles].reduce((sum, file) => sum + file.size, 0)
    if (nextTotalSize > MAX_TOTAL_SIZE) {
      alert(t('inquiry.form.totalAttachmentSizeExceeded'))
      return
    }
    setAttachments((prev) => [...prev, ...validFiles])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await submitInquiry(
        { category: category as InquiryCategory, title, body, senderEmail },
        attachments,
      )
      setSubmitted(true)
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
              onChange={(e) => handleCategoryChange(e.target.value as InquiryCategory | '')}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
                errors.category ? 'border-red-400' : 'border-neutral-300'
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
              placeholder={t('inquiry.form.senderEmailPlaceholder')}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${
                errors.senderEmail ? 'border-red-400' : 'border-neutral-300'
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
              errors.title ? 'border-red-400' : 'border-neutral-300'
            }`}
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
        </div>

        {/* 내용 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('inquiry.form.body')} <span className="text-red-500">*</span>
          </label>
          <RichTextEditor
            value={body}
            onChange={(html) => {
              setBody(html)
              setBodyEdited(true)
            }}
            placeholder={t('inquiry.form.bodyPlaceholder')}
            maxChars={5000}
            enableSpiritEmbed={false}
            enableReviewEmbed={false}
            enableVideoEmbed={false}
            enableImages={false}
            compactHeight
          />
          {errors.body && <p className="mt-1 text-xs text-red-500">{errors.body}</p>}
        </div>

        {/* 파일 첨부 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t('inquiry.form.attachments')}
            <span className="ml-1.5 text-xs font-normal text-neutral-400">
              {t('inquiry.form.attachmentsHint')}
            </span>
          </label>
          <p className="mb-2 text-xs text-neutral-400">{t('inquiry.form.attachmentsFormats')}</p>

          {attachments.length > 0 && (
            <div className="space-y-2 mb-3">
              {attachments.map((file, idx) => (
                <div key={`${file.name}-${file.lastModified}-${idx}`} className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-500 border border-neutral-200">📎</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-700">{file.name}</p>
                    <p className="text-xs text-neutral-400">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    aria-label={t('inquiry.form.removeAttachmentAria', { name: file.name })}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {attachments.length < MAX_ATTACHMENTS && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={FILE_ACCEPT}
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
                {t('inquiry.form.addAttachment')} ({attachments.length}/{MAX_ATTACHMENTS})
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
