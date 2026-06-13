import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useController, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAdminPopupDetail, useCreatePopup, useUpdatePopup } from '@/domain/popup/hooks/useAdminPopups'
import { popupApi } from '@/domain/popup/api/popupApi'
import PopupPreviewModal from '@/domain/popup/components/PopupPreviewModal'
import HtmlEditorField from '@/shared/components/HtmlEditorField'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import type { UploadedPopupImage, PopupType, PopupPreviewData } from '@/domain/popup/types/popup.types'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'
import {
  toInputDt, toApiDt, promoSuperRefine,
  FormSection, ToggleSwitch, PromoImageDropzone,
  AdminTitleField, PromoTypeField, PromoLanguageField,
  PromoLinkUrlField, NewTabCheckbox, PromoScheduleFields,
  TwoColumnFormLayout, PromoFormActions, PromoFormLoading,
} from '@/domain/admin/components/PromoFormKit'

// ─── Zod 스키마 (공통 규칙은 promoSuperRefine) ────────
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
  .superRefine((data, ctx) =>
    promoSuperRefine(data, ctx, {
      isHtml: data.popupType === 'HTML',
      contentRequiredMessage: '팝업 내용을 입력하세요',
    }),
  )

type FormValues = z.infer<typeof schema>

// ─── 팝업 전용 이미지 비율 검증 ───────────────────────
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

// 비율 검증: MIN_RATIO ~ MAX_RATIO 범위 밖이면 업로드 거부
async function validatePopupImageRatio(file: File): Promise<string | null> {
  try {
    const { width, height } = await readImageDimensions(file)
    const ratio = width / height
    if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
      return (
        `이미지 비율(${width}×${height}, ${ratio.toFixed(2)}:1)이 권장 범위를 벗어났습니다.\n` +
        `가로:세로 비율이 ${MIN_RATIO} ~ ${MAX_RATIO} 사이인 이미지만 업로드할 수 있습니다.\n` +
        `권장 비율: 4:5 · 1:1 · 9:16`
      )
    }
    return null
  } catch {
    return '이미지를 분석할 수 없습니다. 다른 파일을 시도해주세요.'
  }
}

// ─── 인라인 미리보기 (우측 패널, 실제 노출 형태 축소) ──
function InlinePopupPreview({ data }: { data: PopupPreviewData }) {
  const hasHtml = !!data.content?.replace(/<[^>]*>/g, '').trim()
  return (
    <div>
      {/* 오버레이 배경 위 팝업 카드 */}
      <div className="rounded-lg bg-neutral-800/90 p-4 flex items-center justify-center min-h-[220px]">
        <div className="relative w-full max-w-[260px] bg-white rounded-xl shadow-2xl overflow-hidden">
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center
              rounded-full bg-black/30 text-white text-xs leading-none"
          >
            ×
          </span>

          {data.popupType === 'IMAGE' ? (
            data.mainImageUrl ? (
              <img
                src={data.mainImageUrl}
                alt="팝업 미리보기"
                className="block w-full h-auto max-h-56 object-contain"
              />
            ) : (
              <div className="h-40 flex flex-col items-center justify-center bg-neutral-100">
                <svg className="w-8 h-8 text-neutral-300 mb-1.5" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <p className="text-xs text-neutral-400">이미지 업로드 시 표시</p>
              </div>
            )
          ) : hasHtml ? (
            <div
              className="notice-editor prose max-w-none text-xs p-4 max-h-56 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.content ?? '') }}
            />
          ) : (
            <p className="text-xs text-neutral-400 text-center py-10">내용을 입력하면 표시됩니다</p>
          )}

          {data.popupType === 'IMAGE' && data.linkUrl && (
            <div className="px-3 py-1.5 bg-neutral-50 border-t border-neutral-100">
              <p className="text-[11px] text-neutral-500 truncate">
                🔗 {data.linkUrl}
                {data.linkTargetBlank && <span className="ml-1 text-neutral-400">(새 탭)</span>}
              </p>
            </div>
          )}

          {data.closeOnOverlay === false && (
            <div className="px-3 py-1.5 bg-neutral-50 border-t border-neutral-100">
              <p className="text-[11px] text-neutral-400 text-center">X 버튼으로만 닫힘</p>
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
        실제 노출 시 화면 중앙에 표시됩니다. 정확한 크기는 아래 ‘실제 크기로 보기’로 확인하세요.
      </p>
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
  const closeOnOverlay = watch('closeOnOverlay')
  const content       = watch('content')
  const startAt       = watch('startAt')

  const { field: visibleField } = useController({ name: 'isVisible', control })
  const { field: alwaysVisibleField } = useController({ name: 'isAlwaysVisible', control })

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
    return <PromoFormLoading />
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl lg:max-w-6xl mx-auto">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 헤더 */}
      <AdminPageHeader
        breadcrumbs={[
          { label: '팝업', to: '/admin/popups' },
          { label: isEdit ? '팝업 수정' : '팝업 등록' },
        ]}
        backTo="/admin/popups"
        backLabel="팝업 목록"
        title={isEdit ? '팝업 수정' : '팝업 등록'}
      />

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        <TwoColumnFormLayout
          left={
            <>
              {/* ─── 섹션 1: 기본 설정 ─── */}
              <FormSection title="기본 설정">
                <AdminTitleField
                  inputProps={register('adminTitle')}
                  placeholder="팝업 식별용 내부 제목"
                  error={errors.adminTitle?.message}
                />

                <PromoTypeField
                  label="팝업 타입"
                  isEdit={isEdit}
                  value={popupType}
                  onChange={handleTypeChange}
                />

                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <PromoLanguageField isEdit={isEdit} value={field.value} onChange={field.onChange} />
                  )}
                />

                {/* 노출 페이지 */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">노출 페이지</label>
                  <div className="h-10 px-3 flex items-center text-sm border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-500">
                    메인 페이지 (고정)
                  </div>
                </div>
              </FormSection>

              {/* ─── 섹션 2: 콘텐츠 ─── */}
              <FormSection title="콘텐츠">
                {popupType === 'IMAGE' ? (
                  <div className="space-y-4">
                    <PromoImageDropzone
                      label="이미지"
                      required
                      alt="팝업 이미지 미리보기"
                      dropHints={[
                        'JPG · PNG · GIF · WEBP, 최대 10MB',
                        `권장 비율: 4:5 · 1:1 · 9:16 (가로:세로 ${MIN_RATIO} ~ ${MAX_RATIO} 사이)`,
                      ]}
                      validateFile={validatePopupImageRatio}
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

                    {/* 캐러셀 운영 안내 */}
                    <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                      💡 여러 팝업을 동시에 노출(캐러셀)할 경우, 모든 팝업이 <strong>동일한 비율의 이미지</strong>를 사용하면
                      슬라이드 전환 시 컨테이너 크기가 변하지 않아 일관된 UI가 됩니다.
                    </p>

                    <PromoLinkUrlField inputProps={register('linkUrl')} error={errors.linkUrl?.message} />

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
              </FormSection>
            </>
          }
          right={
            <>
              {/* ─── 미리보기 ─── */}
              <FormSection title="미리보기">
                <InlinePopupPreview data={previewData} />
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="w-full mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-2
                    text-xs font-medium rounded-lg border border-neutral-300 text-neutral-600
                    hover:bg-neutral-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  실제 크기로 보기
                </button>
              </FormSection>

              {/* ─── 섹션 3: 노출 설정 ─── */}
              <FormSection title="노출 설정">
                <PromoScheduleFields
                  visibleLabel="팝업 노출"
                  visibleOnDescription="사용자에게 팝업이 노출됩니다."
                  visibleOffDescription="저장만 되고 사용자에게 노출되지 않습니다."
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
              </FormSection>
            </>
          }
        />

        {/* ─── 섹션 4: 액션 버튼 ─── */}
        <PromoFormActions
          onCancel={() => navigate('/admin/popups')}
          onSave={handleSubmit(onSubmit)}
          isPending={isPending}
        />
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
