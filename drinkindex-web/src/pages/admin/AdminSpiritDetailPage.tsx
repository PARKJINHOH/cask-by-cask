import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import ImageLightbox from '@/shared/components/ImageLightbox'
import { formatDate } from '@/shared/utils/format'
import {
  useAdminSpiritDetail,
  useUpdateSpirit,
  useDeleteSpirit,
  useUploadSpiritImage,
  useDeleteSpiritImage,
  useSetPrimarySpiritImage,
} from '@/domain/admin/hooks/useAdminSpirits'
import type { AdminSpiritImageItem, UpdateSpiritPayload } from '@/domain/admin/types/admin.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import SpiritOptionalFields from '@/domain/admin/components/SpiritOptionalFields'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'

// ── 상수 ────────────────────────────────────────────────────────

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER']
const CATEGORY_LABEL: Record<string, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', OTHER: '기타',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '공개', HIDDEN: '숨김', PENDING: '대기',
}

// ── 공통 행 ─────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-24 text-sm text-neutral-400 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-sm text-neutral-800">{children}</div>
    </div>
  )
}

// ── 이미지 섹션 ──────────────────────────────────────────────────

function SpiritImageSection({ spiritId, images }: { spiritId: number; images: AdminSpiritImageItem[] }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = useUploadSpiritImage()
  const deleteImg = useDeleteSpiritImage()
  const setPrimary = useSetPrimarySpiritImage()
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  const imageUrls = images.map((img) => img.imageUrl)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    upload.mutate({ id: spiritId, file })
    e.target.value = ''
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

      {images.length === 0 ? (
        <p className="text-xs text-neutral-400">등록된 이미지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              onClick={() => setLightboxIndex(idx)}
              className="relative group aspect-square rounded-xl overflow-hidden border border-neutral-200
                cursor-zoom-in"
            >
              <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
              {img.isPrimary && (
                <span className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                  대표
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                transition-opacity flex flex-col items-center justify-center gap-1.5">
                {!img.isPrimary && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setPrimary.mutate({ id: spiritId, imageId: img.id }) }}
                    disabled={setPrimary.isPending}
                    className="text-white text-xs font-semibold px-2 py-1 bg-amber-500/80 rounded
                      hover:bg-amber-500 disabled:opacity-50"
                  >
                    대표 설정
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('이미지를 삭제하시겠습니까?'))
                      deleteImg.mutate({ id: spiritId, imageId: img.id })
                  }}
                  disabled={deleteImg.isPending}
                  className="text-white text-xs font-semibold px-2 py-1 bg-red-500/80 rounded
                    hover:bg-red-500 disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageLightbox
        images={imageUrls}
        initialIndex={lightboxIndex >= 0 ? lightboxIndex : 0}
        open={lightboxIndex >= 0}
        onClose={() => setLightboxIndex(-1)}
      />
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminSpiritDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const spiritId = Number(id)

  const { data: spirit, isLoading } = useAdminSpiritDetail(spiritId)
  const updateSpirit = useUpdateSpirit()
  const deleteSpirit = useDeleteSpirit()

  const [savedMsg, setSavedMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countryNameKo, setCountryNameKo] = useState('')
  const [regionNameKo, setRegionNameKo] = useState('')

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UpdateSpiritPayload>()

  const [initialized, setInitialized] = useState(false)
  if (spirit && !initialized) {
    setValue('nameKo', spirit.nameKo)
    setValue('nameEn', spirit.nameEn)
    setValue('category', spirit.category)
    setValue('distilleryId', spirit.distilleryId ?? undefined)
    setValue('bottler', spirit.bottler ?? undefined)
    setValue('bottledYear', spirit.bottledYear ?? undefined)
    setValue('vintageYear', spirit.vintageYear ?? undefined)
    setValue('abv', spirit.abv ?? undefined)
    setValue('volumeMl', spirit.volumeMl ?? undefined)
    const matched = ISO3166_COUNTRIES.find((c) => c.nameKo === spirit.country)
    setCountryCode(matched?.code ?? null)
    setCountryNameKo(spirit.country ?? '')
    setRegionNameKo(spirit.region ?? '')
    setInitialized(true)
  }

  const onSave = (data: UpdateSpiritPayload) => {
    setSaveError('')
    updateSpirit.mutate(
      { id: spiritId, data: { ...data, country: countryNameKo || null, region: regionNameKo || null } },
      {
        onSuccess: () => {
          setSavedMsg('저장되었습니다.')
          setTimeout(() => setSavedMsg(''), 3000)
        },
        onError: () => setSaveError('저장 중 오류가 발생했습니다.'),
      },
    )
  }

  const handleDelete = async () => {
    if (!spirit || !confirm(`"${spirit.nameKo}"을(를) 숨김 처리하시겠습니까?`)) return
    await deleteSpirit.mutateAsync(spiritId)
    navigate('/admin/spirits')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Spinner size="lg" className="text-primary-800" />
      </div>
    )
  }

  if (!spirit) {
    return <div className="p-6"><p className="text-neutral-500">데이터를 찾을 수 없습니다.</p></div>
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/spirits')}
          className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          ← 목록으로
        </button>
        <h1 className="text-xl font-bold text-neutral-900">술 상세 / 수정</h1>
        <Badge variant={spirit.status} size="md">{STATUS_LABEL[spirit.status]}</Badge>
      </div>

      {/* 메타 정보 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <Row label="ID">{spirit.id}</Row>
        <Row label="평점">{spirit.avgScore != null ? Number(spirit.avgScore).toFixed(1) : '-'}</Row>
        <Row label="리뷰 수">{spirit.reviewCount}</Row>
        <Row label="등록일">{formatDate(spirit.createdAt)}</Row>
        <Row label="수정일">{formatDate(spirit.updatedAt)}</Row>
      </div>

      {/* 수정 링크 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            카테고리 상세 정보(위스키/와인 등)를 포함한 전체 수정은 아래 버튼을 사용하세요.
          </p>
          <Button size="sm" onClick={() => navigate(`/admin/spirits/${spiritId}/edit`)}>
            상세 수정 (3단계 폼)
          </Button>
        </div>
      </div>

      {/* 수정 폼 (기본 정보 빠른 수정) */}
      <form onSubmit={handleSubmit(onSave)} noValidate>
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-5">
          <h2 className="text-sm font-semibold text-neutral-700 border-b border-neutral-100 pb-3">
            기본 정보 수정
          </h2>

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

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-neutral-600">카테고리 *</label>
            <select
              {...register('category', { required: true })}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABEL[cat]}</option>
              ))}
            </select>
          </div>

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
              defaultDistilleryName={spirit.distilleryNameKo ?? undefined}
              initialValues={spirit}
              dataReady={initialized}
              category={watch('category') as SpiritCategory}
            />
          </div>

          {savedMsg && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{savedMsg}</p>
          )}
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          <div className="flex justify-end">
            <Button type="submit" size="sm" isLoading={updateSpirit.isPending}>
              변경사항 저장
            </Button>
          </div>
        </div>
      </form>

      {/* 이미지 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <SpiritImageSection spiritId={spiritId} images={spirit.images} />
      </div>

      {/* 관리 액션 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-neutral-700 mb-4">관리</h2>
        <div className="flex justify-end">
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            isLoading={deleteSpirit.isPending}
          >
            숨김 처리
          </Button>
        </div>
      </div>
    </div>
  )
}
