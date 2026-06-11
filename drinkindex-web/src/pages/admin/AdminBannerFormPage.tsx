import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useController, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAdminBannerDetail, useCreateBanner, useUpdateBanner } from '@/domain/banner/hooks/useAdminBanners'
import { bannerApi } from '@/domain/banner/api/bannerApi'
import HtmlEditorField from '@/shared/components/HtmlEditorField'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import type { UploadedBannerImage, BannerType } from '@/domain/banner/types/banner.types'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'
import {
  toInputDt, toApiDt, promoSuperRefine,
  FormSection, PromoImageDropzone,
  AdminTitleField, PromoTypeField, PromoLanguageField,
  PromoLinkUrlField, NewTabCheckbox, PromoScheduleFields,
  TwoColumnFormLayout, PromoFormActions, PromoFormLoading,
} from '@/domain/admin/components/PromoFormKit'

// ─── Zod 스키마 (공통 규칙은 promoSuperRefine) ────────
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
  .superRefine((data, ctx) =>
    promoSuperRefine(data, ctx, {
      isHtml: data.bannerType === 'HTML',
      contentRequiredMessage: '배너 내용을 입력하세요',
    }),
  )

type FormValues = z.infer<typeof schema>

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

  const bannerType = watch('bannerType')
  const content    = watch('content')
  const linkUrl    = watch('linkUrl')
  const startAt    = watch('startAt')

  const { field: visibleField } = useController({ name: 'isVisible', control })
  const { field: alwaysVisibleField } = useController({ name: 'isAlwaysVisible', control })

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
    return <PromoFormLoading />
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
        <TwoColumnFormLayout
          left={
            <>
              {/* 기본 설정 */}
              <FormSection title="기본 설정">
                <AdminTitleField
                  inputProps={register('adminTitle')}
                  placeholder="배너 식별용 내부 제목"
                  error={errors.adminTitle?.message}
                />

                <PromoTypeField
                  label="배너 타입"
                  isEdit={isEdit}
                  value={bannerType}
                  onChange={handleTypeChange}
                />

                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <PromoLanguageField isEdit={isEdit} value={field.value} onChange={field.onChange} />
                  )}
                />
              </FormSection>

              {/* 콘텐츠 */}
              <FormSection title="콘텐츠">
                {bannerType === 'IMAGE' ? (
                  <div className="space-y-5">
                    {/* PC 이미지 */}
                    <PromoImageDropzone
                      label="PC 이미지"
                      hint="(권장 비율 21:5 — 가로형 와이드)"
                      required
                      alt="배너 미리보기"
                      heightClass="h-36"
                      previewClass="max-h-40"
                      dropText="드래그하거나 클릭하여 업로드"
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
                    <PromoImageDropzone
                      label="모바일 이미지"
                      hint="(권장 비율 4:3 — 미등록 시 PC 이미지로 대체)"
                      alt="배너 미리보기"
                      heightClass="h-36"
                      previewClass="max-h-40"
                      dropText="드래그하거나 클릭하여 업로드"
                      uploadedImage={uploadedMoImage}
                      existingImageUrl={existingMoImageUrl}
                      onUpload={handleMoUpload}
                      onRemove={() => { setUploadedMoImage(null); setExistingMoImageUrl(null); setMoImageError(undefined) }}
                      isUploading={isMoUploading}
                      error={moImageError}
                    />

                    {/* 링크 */}
                    <div className="border-t border-neutral-100 pt-1">
                      <PromoLinkUrlField inputProps={register('linkUrl')} error={errors.linkUrl?.message} />
                    </div>
                    <Controller
                      name="linkTargetBlank"
                      control={control}
                      render={({ field }) => (
                        <NewTabCheckbox checked={field.value} onChange={field.onChange} />
                      )}
                    />
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
              </FormSection>
            </>
          }
          right={
            <>
              {/* 미리보기 */}
              <FormSection title="미리보기">
                <BannerPreview
                  bannerType={bannerType}
                  pcImageUrl={pcPreviewUrl}
                  moImageUrl={moPreviewUrl}
                  content={content}
                  linkUrl={linkUrl || undefined}
                />
              </FormSection>

              {/* 노출 설정 */}
              <FormSection title="노출 설정">
                <PromoScheduleFields
                  visibleLabel="배너 노출"
                  visibleOnDescription="사용자에게 배너가 노출됩니다."
                  visibleOffDescription="저장만 되고 노출되지 않습니다."
                  isVisible={visibleField.value}
                  onVisibleChange={visibleField.onChange}
                  isAlwaysVisible={alwaysVisibleField.value}
                  onAlwaysVisibleChange={alwaysVisibleField.onChange}
                  startAtProps={register('startAt')}
                  endAtProps={register('endAt')}
                  startAt={startAt}
                  startAtError={errors.startAt?.message}
                  endAtError={errors.endAt?.message}
                />
              </FormSection>
            </>
          }
        />

        {/* 액션 */}
        <PromoFormActions
          onCancel={() => navigate('/admin/banners')}
          onSave={handleSubmit(onSubmit)}
          isPending={isPending}
        />
      </form>
    </div>
  )
}
