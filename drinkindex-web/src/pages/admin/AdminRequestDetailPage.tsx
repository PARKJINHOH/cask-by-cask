import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import { formatDate } from '@/shared/utils/format'
import {
  useAdminRequestDetail,
  useUpdateRequest,
  useUploadRequestImage,
  useRemoveRequestImage,
  useApproveRequest,
  useRejectRequest,
} from '@/domain/admin/hooks/useAdminSpirits'
import type { UpdateRequestBody } from '@/domain/admin/types/admin.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'
import SpiritOptionalFields from '@/domain/admin/components/SpiritOptionalFields'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'

// ── 상수 ────────────────────────────────────────────────────────

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER']
const CATEGORY_LABEL: Record<string, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', OTHER: '기타',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기 중', APPROVED: '승인됨', REJECTED: '반려됨',
}

// ── 필드 행 ─────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-24 text-sm text-neutral-400 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-sm text-neutral-800">{children}</div>
    </div>
  )
}

// ── 이미지 섹션 ──────────────────────────────────────────────────

interface ImageSectionProps {
  requestId: number
  imageUrls: string[]
}

function ImageSection({ requestId, imageUrls }: ImageSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = useUploadRequestImage()
  const remove = useRemoveRequestImage()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    upload.mutate({ id: requestId, file })
    e.target.value = ''
  }

  const handleRemove = (url: string) => {
    if (!confirm('이미지를 삭제하시겠습니까?')) return
    remove.mutate({ id: requestId, imageUrl: url })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">이미지</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileRef.current?.click()}
          isLoading={upload.isPending}
        >
          + 이미지 추가
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {imageUrls.length === 0 ? (
        <p className="text-xs text-neutral-400">등록된 이미지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {imageUrls.map((url) => (
            <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-neutral-200">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => handleRemove(url)}
                disabled={remove.isPending}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                  transition-opacity flex items-center justify-center text-white text-xs font-semibold"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const requestId = Number(id)

  const { data: req, isLoading } = useAdminRequestDetail(requestId)
  const updateRequest = useUpdateRequest()
  const approve = useApproveRequest()
  const reject = useRejectRequest()

  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countryNameKo, setCountryNameKo] = useState('')
  const [regionNameKo, setRegionNameKo] = useState('')

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UpdateRequestBody>()

  // 데이터 로드 후 폼 초기화 (req가 바뀔 때만)
  const [initialized, setInitialized] = useState(false)
  if (req && !initialized) {
    setValue('nameKo', req.nameKo)
    setValue('nameEn', req.nameEn)
    setValue('category', req.category)
    setValue('distilleryId', req.distilleryId ?? undefined)
    setValue('bottler', req.bottler ?? undefined)
    setValue('bottledYear', req.bottledYear ?? undefined)
    setValue('vintageYear', req.vintageYear ?? undefined)
    setValue('abv', req.abv ?? undefined)
    setValue('volumeMl', req.volumeMl ?? undefined)
    const matched = ISO3166_COUNTRIES.find((c) => c.nameKo === req.country)
    setCountryCode(matched?.code ?? null)
    setCountryNameKo(req.country ?? '')
    setRegionNameKo(req.region ?? '')
    setInitialized(true)
  }

  const onSave = (data: UpdateRequestBody) => {
    setActionError('')
    updateRequest.mutate(
      { id: requestId, data: { ...data, country: countryNameKo || null, region: regionNameKo || null } },
      {
        onSuccess: () => {
          setSavedMsg('저장되었습니다.')
          setTimeout(() => setSavedMsg(''), 3000)
        },
        onError: () => setActionError('저장 중 오류가 발생했습니다.'),
      },
    )
  }

  const handleApprove = async () => {
    setActionError('')
    try {
      await approve.mutateAsync(requestId)
      navigate('/admin/spirits/requests')
    } catch {
      setActionError('승인 처리 중 오류가 발생했습니다.')
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { setActionError('반려 사유를 입력해주세요.'); return }
    setActionError('')
    try {
      await reject.mutateAsync({ id: requestId, reason: rejectReason.trim() })
      navigate('/admin/spirits/requests')
    } catch {
      setActionError('반려 처리 중 오류가 발생했습니다.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Spinner size="lg" className="text-primary-800" />
      </div>
    )
  }

  if (!req) {
    return (
      <div className="p-6">
        <p className="text-neutral-500">요청 데이터를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const isPending = req.status === 'PENDING'

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/spirits/requests')}
          className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          ← 목록으로
        </button>
        <h1 className="text-xl font-bold text-neutral-900">등록 요청 상세</h1>
        <Badge variant={req.status} size="md">{STATUS_LABEL[req.status]}</Badge>
      </div>

      {/* 요청 메타 정보 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <Row label="신청자">{req.requesterNickname}</Row>
        <Row label="신청일">{formatDate(req.createdAt)}</Row>
        {req.reviewedAt && <Row label="처리일">{formatDate(req.reviewedAt)}</Row>}
        {req.rejectReason && (
          <Row label="반려 사유">
            <span className="text-red-600">{req.rejectReason}</span>
          </Row>
        )}
      </div>

      {/* 수정 폼 */}
      <form onSubmit={handleSubmit(onSave)} noValidate>
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-5">
          <h2 className="text-sm font-semibold text-neutral-700 border-b border-neutral-100 pb-3">기본 정보 수정</h2>

          {/* nameEn / nameKo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-600">영어 이름 *</label>
              <input
                {...register('nameEn', { required: true })}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-primary-400 ${errors.nameEn ? 'border-red-400' : 'border-neutral-200'}`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-600">한국어 이름 *</label>
              <input
                {...register('nameKo', { required: true })}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-primary-400 ${errors.nameKo ? 'border-red-400' : 'border-neutral-200'}`}
              />
            </div>
          </div>

          {/* category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-neutral-600">카테고리 *</label>
            <select
              {...register('category', { required: true })}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABEL[cat]}</option>
              ))}
            </select>
          </div>

          {/* 필수 정보 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
            <p className="text-xs font-semibold text-amber-700">필수 정보</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-600">
                  도수 (%) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number" step="0.1" min="0" max="100"
                    {...register('abv', { valueAsNumber: true })}
                    className={`${INPUT_CLS} pr-8`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-600">
                  용량 (ml) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number" step="1" min="1"
                    {...register('volumeMl', { valueAsNumber: true })}
                    className={`${INPUT_CLS} pr-10`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">ml</span>
                </div>
              </div>
            </div>
          </div>

          {/* 선택 옵션 */}
          <div className="border-t border-neutral-100 pt-4">
            <p className="text-xs font-medium text-neutral-500 mb-4">선택 옵션</p>
            <SpiritOptionalFields
              register={register}
              setValue={setValue}
              watch={watch}
              countryCode={countryCode}
              countryNameKo={countryNameKo}
              regionNameKo={regionNameKo}
              onCountryChange={(code, nameKo) => { setCountryCode(code); setCountryNameKo(nameKo) }}
              onRegionChange={(nameKo) => setRegionNameKo(nameKo)}
              defaultDistilleryName={req.distilleryNameKo ?? undefined}
              initialValues={req}
              dataReady={initialized}
              category={watch('category') as SpiritCategory}
              hiddenFields={['abv', 'volumeMl']}
            />
          </div>

          {savedMsg && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{savedMsg}</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" size="sm" isLoading={updateRequest.isPending}>
              변경사항 저장
            </Button>
          </div>
        </div>
      </form>

      {/* 이미지 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <ImageSection requestId={requestId} imageUrls={req.imageUrls} />
      </div>

      {/* 승인 / 반려 */}
      {isPending && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-700">처리</h2>

          {rejectMode ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-neutral-700">반려 사유</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="반려 사유를 입력하세요..."
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none
                  focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <p className="text-xs text-neutral-400 text-right">{rejectReason.length}/500</p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setRejectMode(false); setRejectReason('') }}>
                  취소
                </Button>
                <Button variant="danger" size="sm" onClick={handleReject} isLoading={reject.isPending}>
                  반려 확인
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <Button variant="danger" size="sm" onClick={() => setRejectMode(true)}>
                반려
              </Button>
              <Button size="sm" onClick={handleApprove} isLoading={approve.isPending}>
                승인
              </Button>
            </div>
          )}

          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
        </div>
      )}
    </div>
  )
}
