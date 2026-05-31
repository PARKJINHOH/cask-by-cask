import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAdminBannerDetail, useCreateBanner, useUpdateBanner } from '@/domain/banner/hooks/useAdminBanners'
import { bannerApi } from '@/domain/banner/api/bannerApi'
import HtmlEditorField from '@/shared/components/HtmlEditorField'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import type { UploadedBannerImage, BannerType } from '@/domain/banner/types/banner.types'
import Button from '@/shared/components/Button'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

const schema = z
  .object({
    adminTitle:      z.string().min(1, '관리자 제목을 입력하세요').max(200),
    bannerType:      z.enum(['IMAGE', 'HTML'] as const),
    language:        z.enum(['KO', 'EN'] as const),
    content:         z.string().optional(),
    linkUrl:         z.string().optional(),
    linkTargetBlank: z.boolean(),
    isVisible:       z.boolean(),
    isAlwaysVisible: z.boolean(),
    startAt:         z.string().optional(),
    endAt:           z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.bannerType === 'HTML') {
      const text = data.content?.replace(/<[^>]*>/g, '').trim() ?? ''
      if (!text) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: '배너 내용을 입력하세요', path: ['content'] })
      }
    }
    if (data.linkUrl?.trim() && !/^https?:\/\/.+/.test(data.linkUrl)) {
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

const toInputDt = (iso: string | null | undefined) => (iso ? iso.substring(0, 16) : '')
const toApiDt   = (input: string | undefined)       => (input ? `${input}:00` : null)

const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTS   = ['jpg', 'jpeg', 'png', 'gif', 'webp']

interface ImageDropzoneProps {
  label: string
  hint?: string
  uploadedImage: UploadedBannerImage | null
  existingImageUrl: string | null
  onUpload: (file: File) => Promise<void>
  onRemove: () => void
  isUploading: boolean
  error?: string
  required?: boolean
}

function ImageDropzone({
  label, hint, uploadedImage, existingImageUrl, onUpload, onRemove, isUploading, error, required,
}: ImageDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const displayUrl = uploadedImage?.imageUrl ?? existingImageUrl

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTS.includes(ext)) {
      alert('JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      alert('이미지 크기는 10MB 이하여야 합니다.')
      return
    }
    onUpload(file)
  }

  return (
    <div>
      <p className="text-sm font-medium text-neutral-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-1 text-xs font-normal text-neutral-400">{hint}</span>}
      </p>

      {displayUrl ? (
        <div className="relative inline-block">
          <img src={displayUrl} alt="배너 미리보기" className="max-h-40 rounded-lg border border-neutral-200 block" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs
              flex items-center justify-center hover:bg-red-600 transition-colors shadow"
          >
            ×
          </button>
          {uploadedImage && (
            <p className="mt-1 text-xs text-neutral-500">{uploadedImage.originalFileName}</p>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setIsDragging(false)
            const f = e.dataTransfer.files[0]; if (f) handleFile(f)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={[
            'flex flex-col items-center justify-center h-36 rounded-lg border-2 border-dashed',
            'cursor-pointer transition-colors',
            isDragging ? 'border-primary-400 bg-primary-50' : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50',
            error ? 'border-red-400' : '',
          ].join(' ')}
        >
          {isUploading ? (
            <p className="text-sm text-neutral-500">업로드 중...</p>
          ) : (
            <>
              <svg className="w-7 h-7 text-neutral-400 mb-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="text-sm text-neutral-500">드래그하거나 클릭하여 업로드</p>
              <p className="text-xs text-neutral-400 mt-1">JPG · PNG · GIF · WEBP, 최대 10MB</p>
            </>
          )}
        </div>
      )}

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

function ToggleSwitch({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string
}) {
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

function BannerPreview({
  bannerType,
  pcImageUrl,
  moImageUrl,
  content,
  linkUrl,
}: {
  bannerType: BannerType
  pcImageUrl: string | null
  moImageUrl: string | null
  content?: string
  linkUrl?: string
}) {
  const mobileUrl = moImageUrl ?? pcImageUrl
  const isMobileFallback = !moImageUrl && !!pcImageUrl

  const renderImageSlot = (imageUrl: string | null, label: string) => {
    if (bannerType === 'HTML') {
      const hasContent = content?.replace(/<[^>]*>/g, '').trim()
      if (!hasContent) {
        return (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-xs text-neutral-500 text-center px-4">
              내용을 입력하면<br />미리보기가 표시됩니다
            </p>
          </div>
        )
      }
      return (
        <div
          className="w-full h-full overflow-hidden prose max-w-none p-4 text-white"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content ?? '') }}
        />
      )
    }

    if (!imageUrl) {
      return (
        <div className="w-full h-full bg-gradient-to-r from-amber-900 to-amber-700 flex flex-col items-center justify-center gap-2">
          <svg className="w-7 h-7 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="text-xs text-white/50 text-center px-3">{label} 이미지를<br />업로드하면 표시됩니다</p>
        </div>
      )
    }

    return <img src={imageUrl} alt="배너 미리보기" className="w-full h-full object-cover" draggable={false} />
  }

  return (
    <div className="space-y-5">
      {/* PC 미리보기 */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-neutral-600">💻 PC</span>
          <span className="text-xs text-neutral-400">· 21:5 비율</span>
          {linkUrl && (
            <span className="ml-auto text-xs text-primary-800 flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              링크 연결됨
            </span>
          )}
        </div>
        <div className="w-full aspect-[21/5] rounded-lg overflow-hidden bg-neutral-800 border border-neutral-200 relative">
          {renderImageSlot(pcImageUrl, 'PC')}
          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* MO 미리보기 */}
      <div className="flex items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-neutral-600">📱 모바일</span>
            <span className="text-xs text-neutral-400">· 3:4 비율</span>
            {isMobileFallback && (
              <span className="text-xs text-amber-500">· PC 이미지로 대체</span>
            )}
          </div>
          <div
            className="overflow-hidden rounded-lg bg-neutral-800 border border-neutral-200 relative"
            style={{ width: 160, aspectRatio: '3/4' }}
          >
            {renderImageSlot(mobileUrl, '모바일')}
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
          </div>
        </div>
        <div className="pt-6 text-xs text-neutral-400 leading-relaxed">
          <p>· 모바일 이미지 미등록 시</p>
          <p className="ml-2">PC 이미지로 자동 대체됩니다.</p>
          <p className="mt-2">· 실제 노출 크기와 비율이</p>
          <p className="ml-2">다를 수 있습니다.</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminBannerFormPage() {
  const { id }   = useParams<{ id: string }>()
  const isEdit   = id != null
  const bannerId = isEdit ? Number(id) : null
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const { data: existing, isLoading } = useAdminBannerDetail(bannerId)
  const createMutation = useCreateBanner()
  const updateMutation = useUpdateBanner()

  // PC 이미지 상태
  const [uploadedPcImage,    setUploadedPcImage]    = useState<UploadedBannerImage | null>(null)
  const [existingPcImageUrl, setExistingPcImageUrl] = useState<string | null>(null)
  const [isPcUploading,      setIsPcUploading]      = useState(false)
  const [pcImageError,       setPcImageError]       = useState<string | undefined>()

  // MO 이미지 상태
  const [uploadedMoImage,    setUploadedMoImage]    = useState<UploadedBannerImage | null>(null)
  const [existingMoImageUrl, setExistingMoImageUrl] = useState<string | null>(null)
  const [isMoUploading,      setIsMoUploading]      = useState(false)
  const [moImageError,       setMoImageError]       = useState<string | undefined>()

  const {
    register, handleSubmit, control, reset, watch, setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      adminTitle: '', bannerType: 'IMAGE', language: 'KO',
      content: '', linkUrl: '', linkTargetBlank: true,
      isVisible: false, isAlwaysVisible: false,
      startAt: '', endAt: '',
    },
  })

  useEffect(() => {
    if (!existing) return
    reset({
      adminTitle:      existing.adminTitle,
      bannerType:      existing.bannerType,
      language:        existing.language,
      content:         existing.content ?? '',
      linkUrl:         existing.linkUrl ?? '',
      linkTargetBlank: existing.linkTargetBlank,
      isVisible:       existing.isVisible,
      isAlwaysVisible: existing.isAlwaysVisible,
      startAt:         toInputDt(existing.startAt),
      endAt:           toInputDt(existing.endAt),
    })
    setExistingPcImageUrl(existing.pcImage?.imageUrl ?? null)
    setExistingMoImageUrl(existing.moImage?.imageUrl ?? null)
    setUploadedPcImage(null)
    setUploadedMoImage(null)
  }, [existing, reset])

  const bannerType      = watch('bannerType')
  const isAlwaysVisible = watch('isAlwaysVisible')
  const isVisible       = watch('isVisible')
  const content         = watch('content')
  const linkUrl         = watch('linkUrl')
  const startAt         = watch('startAt')

  const pcPreviewUrl = uploadedPcImage?.imageUrl ?? existingPcImageUrl
  const moPreviewUrl = uploadedMoImage?.imageUrl ?? existingMoImageUrl

  const handleTypeChange = (newType: BannerType) => {
    if (newType === bannerType) return
    const hasContent =
      (bannerType === 'HTML' && content?.replace(/<[^>]*>/g, '').trim()) ||
      (bannerType === 'IMAGE' && (uploadedPcImage || existing?.pcImage))
    if (hasContent && !window.confirm('타입을 변경하면 입력한 내용이 초기화됩니다. 계속하시겠습니까?')) return
    setValue('bannerType', newType)
    setValue('content', '')
    setValue('linkUrl', '')
    setUploadedPcImage(null); setExistingPcImageUrl(null); setPcImageError(undefined)
    setUploadedMoImage(null); setExistingMoImageUrl(null); setMoImageError(undefined)
  }

  const handlePcUpload = async (file: File) => {
    setIsPcUploading(true); setPcImageError(undefined)
    try {
      const res = await bannerApi.uploadBannerImage(file, 'PC')
      setUploadedPcImage(res.data.data!)
    } catch {
      const msg = 'PC 이미지 업로드 중 오류가 발생했습니다.'
      setPcImageError(msg); showToast(msg, 'error')
    } finally {
      setIsPcUploading(false)
    }
  }

  const handleMoUpload = async (file: File) => {
    setIsMoUploading(true); setMoImageError(undefined)
    try {
      const res = await bannerApi.uploadBannerImage(file, 'MO')
      setUploadedMoImage(res.data.data!)
    } catch {
      const msg = '모바일 이미지 업로드 중 오류가 발생했습니다.'
      setMoImageError(msg); showToast(msg, 'error')
    } finally {
      setIsMoUploading(false)
    }
  }

  const onSubmit = async (values: FormValues) => {
    if (values.bannerType === 'IMAGE') {
      const hasPcImage = uploadedPcImage || existingPcImageUrl
      if (!hasPcImage) {
        setPcImageError('PC 이미지를 업로드해주세요.')
        showToast('PC 이미지를 업로드해주세요.', 'error')
        return
      }
    }

    const startAtApi = values.isAlwaysVisible ? null : toApiDt(values.startAt)
    const endAtApi   = values.isAlwaysVisible ? null : toApiDt(values.endAt)

    try {
      if (isEdit && bannerId != null) {
        // MO 이미지가 기존에 있었는데 제거된 경우
        const moRemoved = existingMoImageUrl === null && !uploadedMoImage && existing?.moImage != null

        await updateMutation.mutateAsync({
          id: bannerId,
          data: {
            adminTitle:      values.adminTitle,
            isVisible:       values.isVisible,
            isAlwaysVisible: values.isAlwaysVisible,
            startAt:         startAtApi,
            endAt:           endAtApi,
            ...(values.bannerType === 'HTML'
              ? { content: values.content }
              : {
                  ...(uploadedPcImage ? { bannerPcImageId: uploadedPcImage.id } : {}),
                  ...(uploadedMoImage ? { bannerMoImageId: uploadedMoImage.id } : {}),
                  ...(moRemoved       ? { removeMoImage: true } : {}),
                  linkUrl:         values.linkUrl || null,
                  linkTargetBlank: values.linkTargetBlank,
                }),
          },
        })
      } else {
        await createMutation.mutateAsync({
          adminTitle:      values.adminTitle,
          bannerType:      values.bannerType,
          language:        values.language,
          isVisible:       values.isVisible,
          sortOrder:       0,
          isAlwaysVisible: values.isAlwaysVisible,
          startAt:         startAtApi,
          endAt:           endAtApi,
          ...(values.bannerType === 'HTML'
            ? { content: values.content }
            : {
                bannerPcImageId: uploadedPcImage!.id,
                ...(uploadedMoImage ? { bannerMoImageId: uploadedMoImage.id } : {}),
                linkUrl:         values.linkUrl || null,
                linkTargetBlank: values.linkTargetBlank,
              }),
        })
      }
      showToast('배너가 저장되었습니다.', 'success')
      setTimeout(() => navigate('/admin/banners'), 800)
    } catch {
      showToast('저장 중 오류가 발생했습니다.', 'error')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEdit && isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-neutral-400 text-sm">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl lg:max-w-6xl mx-auto">
      <Toast toasts={toasts} onRemove={removeToast} />

      <AdminPageHeader
        breadcrumbs={[
          { label: '배너', to: '/admin/banners' },
          { label: isEdit ? '배너 수정' : '배너 등록' },
        ]}
        backTo="/admin/banners"
        backLabel="배너 목록"
        title={isEdit ? '배너 수정' : '배너 등록'}
      />

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start">
          {/* ── 좌측: 입력 ── */}
          <div className="space-y-5">

        {/* 기본 설정 */}
        <Section title="기본 설정">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              관리자 제목 <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-neutral-400">(사용자에게 노출되지 않습니다)</span>
            </label>
            <input
              {...register('adminTitle')}
              placeholder="배너 식별용 내부 제목"
              maxLength={200}
              className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            {errors.adminTitle && <p className="mt-1 text-xs text-red-600">{errors.adminTitle.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              배너 타입 <span className="text-red-500">*</span>
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
                    bannerType === t
                      ? 'border-primary-500 bg-primary-50 text-primary-900'
                      : 'border-neutral-200 text-neutral-500 hover:border-neutral-300',
                  ].join(' ')}
                >
                  {t === 'IMAGE' ? '🖼 이미지형' : '📝 HTML형'}
                  <p className="text-xs font-normal mt-0.5 opacity-70">
                    {t === 'IMAGE' ? '클릭 가능한 이미지 배너' : 'TipTap 리치 텍스트'}
                  </p>
                </button>
              ))}
            </div>
          </div>

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
        </Section>

        {/* 콘텐츠 */}
        <Section title="콘텐츠">
          {bannerType === 'IMAGE' ? (
            <div className="space-y-5">
              {/* PC 이미지 */}
              <ImageDropzone
                label="PC 이미지"
                hint="(권장 비율 21:5 — 가로형 와이드)"
                required
                uploadedImage={uploadedPcImage}
                existingImageUrl={existingPcImageUrl}
                onUpload={handlePcUpload}
                onRemove={() => { setUploadedPcImage(null); setExistingPcImageUrl(null); setPcImageError(undefined) }}
                isUploading={isPcUploading}
                error={pcImageError}
              />

              {/* 구분선 */}
              <div className="border-t border-neutral-100" />

              {/* MO 이미지 */}
              <ImageDropzone
                label="모바일 이미지"
                hint="(권장 비율 4:3 — 미등록 시 PC 이미지로 대체)"
                uploadedImage={uploadedMoImage}
                existingImageUrl={existingMoImageUrl}
                onUpload={handleMoUpload}
                onRemove={() => { setUploadedMoImage(null); setExistingMoImageUrl(null); setMoImageError(undefined) }}
                isUploading={isMoUploading}
                error={moImageError}
              />

              {/* 링크 */}
              <div className="border-t border-neutral-100 pt-1">
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  링크 URL <span className="text-xs font-normal text-neutral-400">(선택)</span>
                </label>
                <input
                  {...register('linkUrl')}
                  placeholder="https://example.com"
                  className="w-full h-10 px-3 text-sm border border-neutral-300 rounded-lg
                    focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
                {errors.linkUrl && <p className="mt-1 text-xs text-red-600">{errors.linkUrl.message}</p>}
              </div>
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
                    placeholder="배너 내용을 입력하세요..."
                  />
                )}
              />
              {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content.message}</p>}
            </div>
          )}
        </Section>

          </div>

          {/* ── 우측: 미리보기 · 노출 설정 (PC에서 우측 고정) ── */}
          <div className="space-y-5 lg:sticky lg:top-6">

        {/* 미리보기 */}
        <Section title="미리보기">
          <BannerPreview
            bannerType={bannerType}
            pcImageUrl={pcPreviewUrl}
            moImageUrl={moPreviewUrl}
            content={content}
            linkUrl={linkUrl || undefined}
          />
        </Section>

        {/* 노출 설정 */}
        <Section title="노출 설정">
          <Controller
            name="isVisible"
            control={control}
            render={({ field }) => (
              <ToggleSwitch
                checked={field.value}
                onChange={field.onChange}
                label="배너 노출"
                description={isVisible ? '사용자에게 배너가 노출됩니다.' : '저장만 되고 노출되지 않습니다.'}
              />
            )}
          />
          {/* 노출 ON일 때만 상시 노출 / 게시 기간 설정 표시 */}
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
                      focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-neutral-100"
                  />
                  {errors.startAt && <p className="mt-1 text-xs text-red-600">{errors.startAt.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">종료일시</label>
                  <input
                    type="datetime-local"
                    {...register('endAt')}
                    min={startAt || undefined}
                    disabled={isAlwaysVisible}
                    className="w-full h-9 px-2 text-sm border border-neutral-300 rounded-lg
                      focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-neutral-100"
                  />
                  {errors.endAt && <p className="mt-1 text-xs text-red-600">{errors.endAt.message}</p>}
                </div>
              </div>
            </div>
          )}
        </Section>

          </div>
        </div>

        {/* 액션 */}
        <div className="flex items-center gap-3 pt-1">
          <Button variant="secondary" onClick={() => navigate('/admin/banners')} disabled={isPending}>
            취소
          </Button>
          <div className="flex-1" />
          <Button variant="primary" isLoading={isPending} onClick={handleSubmit(onSubmit)}>
            저장
          </Button>
        </div>
      </form>
    </div>
  )
}
