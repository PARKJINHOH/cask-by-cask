import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAdminPopupDetail, useCreatePopup, useUpdatePopup } from '@/domain/popup/hooks/useAdminPopups'
import { popupApi } from '@/domain/popup/api/popupApi'
import PopupPreviewModal from '@/domain/popup/components/PopupPreviewModal'
import HtmlEditorField from '@/shared/components/HtmlEditorField'
import type { UploadedPopupImage, PopupType, PopupPreviewData } from '@/domain/popup/types/popup.types'
import Button from '@/shared/components/Button'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

// ─── Zod 스키마 ──────────────────────────────────────
const schema = z
  .object({
    adminTitle: z.string().min(1, '관리자 제목을 입력하세요').max(200, '200자 이하여야 합니다'),
    popupType: z.enum(['IMAGE', 'HTML'] as const),
    language: z.enum(['KO', 'EN'] as const),
    content: z.string().optional(),
    linkUrl: z.string().optional(),
    linkTargetBlank: z.boolean(),
    isVisible: z.boolean(),
    sortOrder: z.number().min(0, '0 이상이어야 합니다'),
    closeOnOverlay: z.boolean(),
    isAlwaysVisible: z.boolean(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.popupType === 'HTML') {
      const text = data.content?.replace(/<[^>]*>/g, '').trim() ?? ''
      if (!text) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: '팝업 내용을 입력하세요', path: ['content'] })
      }
    }
    if (data.linkUrl && data.linkUrl.trim() !== '' && !/^https?:\/\/.+/.test(data.linkUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '올바른 URL 형식이어야 합니다 (https://...)',
        path: ['linkUrl'],
      })
    }
    if (!data.isAlwaysVisible && data.startAt && data.endAt && data.endAt < data.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '종료일시는 시작일시 이후여야 합니다',
        path: ['endAt'],
      })
    }
    // 노출 ON: 상시 노출 또는 게시 기간(시작·종료) 둘 중 하나는 필수
    if (data.isVisible && !data.isAlwaysVisible) {
      if (!data.startAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '노출하려면 상시 노출을 체크하거나 시작일시를 입력하세요',
          path: ['startAt'],
        })
      }
      if (!data.endAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '노출하려면 상시 노출을 체크하거나 종료일시를 입력하세요',
          path: ['endAt'],
        })
      }
    }
  })

type FormValues = z.infer<typeof schema>

// datetime-local 값 ↔ LocalDateTime 변환 유틸
const toInputDt = (iso: string | null | undefined) => (iso ? iso.substring(0, 16) : '')
const toApiDt   = (input: string | undefined)       => (input ? `${input}:00` : null)

// ─── 이미지 업로드 드롭존 ─────────────────────────────
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTS   = ['jpg', 'jpeg', 'png', 'gif', 'webp']
// 비율(가로:세로) 권장 범위. 0.4 ≈ 2:5 (세로 긴 이미지), 2.5 = 5:2 (가로 긴 이미지)
const MIN_RATIO = 0.4
const MAX_RATIO = 2.5

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지 로드 실패')) }
    img.src = url
  })
}

interface ImageDropzoneProps {
  uploadedImage: UploadedPopupImage | null
  existingImageUrl: string | null
  onUpload: (file: File) => Promise<void>
  onRemove: () => void
  isUploading: boolean
  error?: string
}

function ImageDropzone({ uploadedImage, existingImageUrl, onUpload, onRemove, isUploading, error }: ImageDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const displayUrl = uploadedImage?.imageUrl ?? existingImageUrl

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTS.includes(ext)) {
      alert('JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다. (SVG 불가)')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      alert('이미지 크기는 10MB 이하여야 합니다.')
      return
    }
    // 비율 검증: MIN_RATIO ~ MAX_RATIO 범위 밖이면 업로드 거부
    try {
      const { width, height } = await readImageDimensions(file)
      const ratio = width / height
      if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
        alert(
          `이미지 비율(${width}×${height}, ${ratio.toFixed(2)}:1)이 권장 범위를 벗어났습니다.\n` +
          `가로:세로 비율이 ${MIN_RATIO} ~ ${MAX_RATIO} 사이인 이미지만 업로드할 수 있습니다.\n` +
          `권장 비율: 4:5 · 1:1 · 9:16`
        )
        return
      }
    } catch {
      alert('이미지를 분석할 수 없습니다. 다른 파일을 시도해주세요.')
      return
    }
    onUpload(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (displayUrl) {
    return (
      <div className="relative inline-block">
        <img src={displayUrl} alt="팝업 이미지 미리보기" className="max-h-64 rounded-lg border border-neutral-200 block" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs
            flex items-center justify-center hover:bg-red-600 transition-colors shadow"
        >
          ×
        </button>
        {uploadedImage && (
          <p className="mt-1.5 text-xs text-neutral-500">{uploadedImage.originalFileName}</p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={[
          'flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed cursor-pointer',
          'transition-colors',
          isDragging ? 'border-primary-400 bg-primary-50' : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50',
          error ? 'border-red-400' : '',
        ].join(' ')}
      >
        {isUploading ? (
          <p className="text-sm text-neutral-500">업로드 중...</p>
        ) : (
          <>
            <svg className="w-8 h-8 text-neutral-400 mb-2" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="text-sm text-neutral-500">이미지를 드래그하거나 클릭하여 업로드</p>
            <p className="text-xs text-neutral-400 mt-1">JPG · PNG · GIF · WEBP, 최대 10MB</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              권장 비율: 4:5 · 1:1 · 9:16 (가로:세로 {MIN_RATIO} ~ {MAX_RATIO} 사이)
            </p>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}

// ─── Toggle 스위치 ────────────────────────────────────
interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}

function ToggleSwitch({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
      <div>
        <p className="text-sm font-medium text-neutral-700">{label}</p>
        {description && <p className="text-xs text-neutral-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          checked ? 'bg-primary-800' : 'bg-neutral-300',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow',
            'transform transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

// ─── 섹션 래퍼 ────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
      <h2 className="text-base font-semibold text-neutral-800 border-b border-neutral-100 pb-3">
        {title}
      </h2>
      {children}
    </div>
  )
}

// ─── 페이지 ───────────────────────────────────────────
export default function AdminPopupFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit   = id != null
  const popupId  = isEdit ? Number(id) : null
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const { data: existing, isLoading } = useAdminPopupDetail(popupId)
  const createMutation = useCreatePopup()
  const updateMutation = useUpdatePopup()

  // 새로 업로드한 이미지 상태 (IMAGE 타입 전용)
  const [uploadedImage, setUploadedImage]     = useState<UploadedPopupImage | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [isImageUploading, setIsImageUploading] = useState(false)
  const [imageError, setImageError]           = useState<string | undefined>()
  const [previewOpen, setPreviewOpen]         = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      adminTitle: '',
      popupType: 'IMAGE',
      language: 'KO',
      content: '',
      linkUrl: '',
      linkTargetBlank: true,
      isVisible: false,
      sortOrder: 0,
      closeOnOverlay: true,
      isAlwaysVisible: false,
      startAt: '',
      endAt: '',
    },
  })

  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (!existing) return
    reset({
      adminTitle:     existing.adminTitle,
      popupType:      existing.popupType,
      language:       existing.language,
      content:        existing.content ?? '',
      linkUrl:        existing.linkUrl ?? '',
      linkTargetBlank: existing.linkTargetBlank,
      isVisible:      existing.isVisible,
      sortOrder:      existing.sortOrder,
      closeOnOverlay: existing.closeOnOverlay,
      isAlwaysVisible: existing.isAlwaysVisible,
      startAt:        toInputDt(existing.startAt),
      endAt:          toInputDt(existing.endAt),
    })
    setExistingImageUrl(existing.mainImage?.imageUrl ?? null)
    setUploadedImage(null)
  }, [existing, reset])

  const popupType     = watch('popupType')
  const isAlwaysVisible = watch('isAlwaysVisible')
  const isVisible     = watch('isVisible')
  const closeOnOverlay = watch('closeOnOverlay')
  const content       = watch('content')
  const startAt       = watch('startAt')

  // 타입 변경 핸들러 (경고 포함)
  const handleTypeChange = (newType: PopupType) => {
    if (newType === popupType) return
    const hasContent =
      (popupType === 'HTML' && content && content.replace(/<[^>]*>/g, '').trim()) ||
      (popupType === 'IMAGE' && (uploadedImage || existing?.mainImage))
    if (hasContent && !window.confirm('타입을 변경하면 입력한 내용이 초기화됩니다. 계속하시겠습니까?')) {
      return
    }
    setValue('popupType', newType)
    setValue('content', '')
    setValue('linkUrl', '')
    setValue('linkTargetBlank', true)
    setUploadedImage(null)
    setImageError(undefined)
  }

  // 이미지 업로드
  const handleImageUpload = async (file: File) => {
    setIsImageUploading(true)
    setImageError(undefined)
    try {
      const res = await popupApi.uploadPopupImage(file, 'MAIN')
      setUploadedImage(res.data.data!)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const msg =
        status === 429
          ? '이미지 업로드 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.'
          : '이미지 업로드 중 오류가 발생했습니다.'
      setImageError(msg)
      showToast(msg, 'error')
    } finally {
      setIsImageUploading(false)
    }
  }

  // HTML 에디터 이미지 업로드 (팝업 API 사용)
  const handleEditorImageUpload = async (file: File): Promise<string | null> => {
    const res = await popupApi.uploadPopupImage(file, 'CONTENT')
    return res.data.data?.imageUrl ?? null
  }

  // 폼 제출
  const onSubmit = async (values: FormValues) => {
    // IMAGE 타입 이미지 필수 검증
    if (values.popupType === 'IMAGE') {
      const hasImage = uploadedImage || existingImageUrl
      if (!hasImage) {
        setImageError('이미지를 업로드해주세요.')
        showToast('이미지를 업로드해주세요.', 'error')
        return
      }
    }

    const startAtApi = values.isAlwaysVisible ? null : toApiDt(values.startAt)
    const endAtApi   = values.isAlwaysVisible ? null : toApiDt(values.endAt)

    try {
      if (isEdit && popupId != null) {
        const updateData = {
          adminTitle:      values.adminTitle,
          isVisible:       values.isVisible,
          sortOrder:       values.sortOrder,
          closeOnOverlay:  values.closeOnOverlay,
          isAlwaysVisible: values.isAlwaysVisible,
          startAt:         startAtApi,
          endAt:           endAtApi,
          ...(values.popupType === 'HTML'
            ? { content: values.content }
            : {
                ...(uploadedImage ? { popupImageId: uploadedImage.id } : {}),
                linkUrl:        values.linkUrl || null,
                linkTargetBlank: values.linkTargetBlank,
              }),
        }
        await updateMutation.mutateAsync({ id: popupId, data: updateData })
      } else {
        const createData = {
          adminTitle:      values.adminTitle,
          popupType:       values.popupType,
          language:        values.language,
          displayPage:     'MAIN' as const,
          isVisible:       values.isVisible,
          sortOrder:       values.sortOrder,
          closeOnOverlay:  values.closeOnOverlay,
          isAlwaysVisible: values.isAlwaysVisible,
          startAt:         startAtApi,
          endAt:           endAtApi,
          ...(values.popupType === 'HTML'
            ? { content: values.content }
            : {
                popupImageId:    uploadedImage!.id,
                linkUrl:         values.linkUrl || null,
                linkTargetBlank: values.linkTargetBlank,
              }),
        }
        await createMutation.mutateAsync(createData)
      }
      showToast('팝업이 저장되었습니다.', 'success')
      setTimeout(() => navigate('/admin/popups'), 800)
    } catch {
      showToast('저장 중 오류가 발생했습니다.', 'error')
    }
  }

  const isPending  = createMutation.isPending || updateMutation.isPending
  const previewData: PopupPreviewData = {
    popupType,
    content,
    mainImageUrl: uploadedImage?.imageUrl ?? existingImageUrl ?? null,
    linkUrl:      watch('linkUrl') || null,
    linkTargetBlank: watch('linkTargetBlank'),
    closeOnOverlay,
  }

  if (isEdit && isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-neutral-400 text-sm">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => navigate('/admin/popups')}
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="목록으로"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-neutral-900">
          {isEdit ? '팝업 수정' : '팝업 등록'}
        </h1>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">

        {/* ─── 섹션 1: 기본 설정 ─── */}
        <Section title="기본 설정">
          {/* 관리자 제목 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              관리자 제목 <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-neutral-400">(사용자에게 노출되지 않습니다)</span>
            </label>
            <input
              {...register('adminTitle')}
              placeholder="팝업 식별용 내부 제목"
              maxLength={200}
              className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            {errors.adminTitle && (
              <p className="mt-1 text-xs text-red-600">{errors.adminTitle.message}</p>
            )}
          </div>

          {/* 팝업 타입 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              팝업 타입 <span className="text-red-500">*</span>
              {isEdit && <span className="ml-1 text-xs font-normal text-neutral-400">(수정 불가)</span>}
            </label>
            <div className="flex gap-3">
              {(['IMAGE', 'HTML'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={isEdit}
                  onClick={() => !isEdit && handleTypeChange(t)}
                  className={[
                    'flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                    isEdit ? 'cursor-default opacity-75' : 'cursor-pointer',
                    popupType === t
                      ? 'border-primary-500 bg-primary-50 text-primary-900'
                      : 'border-neutral-200 text-neutral-500 hover:border-neutral-300',
                  ].join(' ')}
                >
                  {t === 'IMAGE' ? '🖼 이미지형' : '📝 HTML형'}
                  <p className="text-xs font-normal mt-0.5 text-current opacity-70">
                    {t === 'IMAGE' ? '클릭 가능한 이미지 배너' : 'TipTap 리치 텍스트'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 언어 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              언어 <span className="text-red-500">*</span>
              {isEdit && <span className="ml-1 text-xs font-normal text-neutral-400">(수정 불가)</span>}
            </label>
            <div className="flex gap-3">
              {(['KO', 'EN'] as const).map((l) => (
                <label
                  key={l}
                  className={[
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all',
                    isEdit ? 'cursor-default opacity-75' : '',
                    watch('language') === l
                      ? 'border-primary-500 bg-primary-50 text-primary-900'
                      : 'border-neutral-200 text-neutral-600',
                  ].join(' ')}
                >
                  <Controller
                    name="language"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="radio"
                        checked={field.value === l}
                        onChange={() => !isEdit && field.onChange(l)}
                        disabled={isEdit}
                        className="accent-primary-800"
                      />
                    )}
                  />
                  <span className="text-sm font-medium">{l === 'KO' ? '🇰🇷 한국어' : '🇺🇸 English'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 노출 페이지 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">노출 페이지</label>
            <div className="h-10 px-3 flex items-center text-sm border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-500">
              메인 페이지 (고정)
            </div>
          </div>
        </Section>

        {/* ─── 섹션 2: 콘텐츠 ─── */}
        <Section title="콘텐츠">
          {popupType === 'IMAGE' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  이미지 <span className="text-red-500">*</span>
                </label>
                <ImageDropzone
                  uploadedImage={uploadedImage}
                  existingImageUrl={existingImageUrl}
                  onUpload={handleImageUpload}
                  onRemove={() => {
                    setUploadedImage(null)
                    setExistingImageUrl(null)
                    setImageError(undefined)
                  }}
                  isUploading={isImageUploading}
                  error={imageError}
                />
              </div>

              {/* 캐러셀 운영 안내 */}
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                💡 여러 팝업을 동시에 노출(캐러셀)할 경우, 모든 팝업이 <strong>동일한 비율의 이미지</strong>를 사용하면
                슬라이드 전환 시 컨테이너 크기가 변하지 않아 일관된 UI가 됩니다.
              </p>

              {/* 링크 URL */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  링크 URL <span className="text-xs font-normal text-neutral-400">(선택)</span>
                </label>
                <input
                  {...register('linkUrl')}
                  placeholder="https://example.com"
                  className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg
                    focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
                {errors.linkUrl && (
                  <p className="mt-1 text-xs text-red-600">{errors.linkUrl.message}</p>
                )}
              </div>

              {/* 새 탭 열기 */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Controller
                  name="linkTargetBlank"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 accent-primary-800 rounded"
                    />
                  )}
                />
                <span className="text-sm text-neutral-700">새 탭에서 열기</span>
              </label>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                내용 <span className="text-red-500">*</span>
              </label>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <HtmlEditorField
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onImageUploadError={(msg) => showToast(msg, 'error')}
                    placeholder="팝업 내용을 입력하세요..."
                    uploadImage={handleEditorImageUpload}
                  />
                )}
              />
              {errors.content && (
                <p className="mt-1 text-xs text-red-600">{errors.content.message}</p>
              )}
            </div>
          )}
        </Section>

        {/* ─── 섹션 3: 노출 설정 ─── */}
        <Section title="노출 설정">
          {/* 노출 여부 */}
          <Controller
            name="isVisible"
            control={control}
            render={({ field }) => (
              <ToggleSwitch
                checked={field.value}
                onChange={field.onChange}
                label="팝업 노출"
                description={isVisible ? '사용자에게 팝업이 노출됩니다.' : '저장만 되고 사용자에게 노출되지 않습니다.'}
              />
            )}
          />

          {/* 게시 기간 — 노출 ON일 때만 표시 */}
          {isVisible && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Controller
                  name="isAlwaysVisible"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 accent-primary-800 rounded"
                    />
                  )}
                />
                <span className="text-sm font-medium text-neutral-700">상시 노출</span>
                <span className="text-xs text-neutral-400">(기간 설정 무시)</span>
              </label>

              {!isAlwaysVisible && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  노출하려면 <strong>상시 노출</strong>을 체크하거나 <strong>시작일시·종료일시</strong>를 모두 입력해야 합니다.
                </p>
              )}

              <div className={`grid grid-cols-2 gap-3 ${isAlwaysVisible ? 'opacity-40 pointer-events-none' : ''}`}>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">시작일시</label>
                  <input
                    type="datetime-local"
                    {...register('startAt')}
                    disabled={isAlwaysVisible}
                    className="w-full h-9 px-2 text-sm border border-neutral-300 rounded-lg
                      focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none
                      disabled:bg-neutral-100"
                  />
                  {errors.startAt && (
                    <p className="mt-1 text-xs text-red-600">{errors.startAt.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">종료일시</label>
                  <input
                    type="datetime-local"
                    {...register('endAt')}
                    min={startAt || undefined}
                    disabled={isAlwaysVisible}
                    className="w-full h-9 px-2 text-sm border border-neutral-300 rounded-lg
                      focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none
                      disabled:bg-neutral-100"
                  />
                  {errors.endAt && (
                    <p className="mt-1 text-xs text-red-600">{errors.endAt.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 오버레이 닫기 */}
          <Controller
            name="closeOnOverlay"
            control={control}
            render={({ field }) => (
              <ToggleSwitch
                checked={field.value}
                onChange={field.onChange}
                label="배경 클릭 시 닫기"
                description={!closeOnOverlay ? 'X 버튼으로만 닫을 수 있습니다' : undefined}
              />
            )}
          />

        </Section>

        {/* ─── 섹션 4: 액션 버튼 ─── */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/popups')}
            disabled={isPending}
          >
            취소
          </Button>

          <Button
            variant="secondary"
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={isPending}
          >
            <svg className="w-4 h-4 mr-1 inline-block" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            미리보기
          </Button>

          <div className="flex-1" />

          <Button
            variant="primary"
            isLoading={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            저장
          </Button>
        </div>
      </form>

      {/* 미리보기 모달 */}
      <PopupPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        popupData={previewData}
      />
    </div>
  )
}
