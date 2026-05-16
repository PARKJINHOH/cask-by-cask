import { Fragment, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'
import { useAdminRequests, useCreateSpirit } from '@/domain/admin/hooks/useAdminSpirits'
import type { RequestStatus, CreateSpiritPayload } from '@/domain/admin/types/admin.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import SpiritOptionalFields from '@/domain/admin/components/SpiritOptionalFields'
import AdminDistillerySelector from '@/domain/distillery/components/AdminDistillerySelector'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import SpiritCommonDetailSection, {
  type CommonDetailForm,
  DEFAULT_COMMON_DETAIL,
} from '@/domain/admin/components/SpiritCommonDetailSection'
import WhiskyDetailSection, { type WhiskyDetailForm, DEFAULT_WHISKY } from '@/domain/admin/components/WhiskyDetailSection'
import WineDetailSection, { type WineDetailForm, DEFAULT_WINE } from '@/domain/admin/components/WineDetailSection'
import CognacDetailSection, { type CognacDetailForm, DEFAULT_COGNAC } from '@/domain/admin/components/CognacDetailSection'
const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER']

const CATEGORY_LABEL: Record<string, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', OTHER: '기타',
}

const STATUS_OPTIONS: Array<{ value: RequestStatus; label: string }> = [
  { value: 'PENDING',  label: '대기 중' },
  { value: 'APPROVED', label: '승인됨' },
  { value: 'REJECTED', label: '반려됨' },
]

// ── 직접 등록 모달 ────────────────────────────────────────────────

interface CreateSpiritModalProps {
  open: boolean
  onClose: () => void
}

const DATE_RE = /^\d{4}(-\d{2})?$/

function CreateSpiritModal({ open, onClose }: CreateSpiritModalProps) {
  const navigate = useNavigate()
  const createSpirit = useCreateSpirit()
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countryNameKo, setCountryNameKo] = useState('')
  const [regionNameKo, setRegionNameKo] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [catErrors, setCatErrors] = useState<Record<string, string>>({})

  // 상세 폼 상태
  const [commonDetail, setCommonDetail] = useState<CommonDetailForm>(DEFAULT_COMMON_DETAIL)
  const [whiskyDetail, setWhiskyDetail] = useState<WhiskyDetailForm>(DEFAULT_WHISKY)
  const [wineDetail, setWineDetail] = useState<WineDetailForm>(DEFAULT_WINE)
  const [cognacDetail, setCognacDetail] = useState<CognacDetailForm>(DEFAULT_COGNAC)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateSpiritPayload>()
  const selectedCategory = watch('category') as SpiritCategory | undefined
  const watchedAbv = watch('abv')

  useEffect(() => {
    if (typeof watchedAbv !== 'number') return
    if (watchedAbv > 100) setValue('abv', 100, { shouldValidate: true })
    else if (watchedAbv < 0) setValue('abv', 0, { shouldValidate: true })
  }, [watchedAbv, setValue])

  // 카테고리 변경 시 카테고리별 상태 초기화 + 연관 선택 옵션 값 초기화
  useEffect(() => {
    setWhiskyDetail(DEFAULT_WHISKY)
    setWineDetail(DEFAULT_WINE)
    setCognacDetail(DEFAULT_COGNAC)
    setCatErrors({})
    setValue('distilleryId', undefined)
    setValue('bottler', undefined)
  }, [selectedCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  // 위스키 병입구분 변경 시 반대 필드 초기화
  const handleWhiskyChange = (u: Partial<WhiskyDetailForm>) => {
    setWhiskyDetail(prev => {
      if (u.bottlingType !== undefined && u.bottlingType !== prev.bottlingType) {
        if (u.bottlingType === 'IB')  setValue('distilleryId', undefined)
        else if (u.bottlingType === 'OB') setValue('bottler', undefined)
        else { setValue('distilleryId', undefined); setValue('bottler', undefined) }
      }
      return { ...prev, ...u }
    })
  }

  // 위스키: 증류소·병입업체는 bottlingSlot, 국가는 countrySlot에서 처리 → 옵션 피커에서 모두 제외
  const pinnedFields: ('distilleryId' | 'countryRegion' | 'bottler' | 'bottledYear' | 'vintageYear' | 'abv' | 'volumeMl')[] = []
  const extraHidden: typeof pinnedFields = ['abv', 'volumeMl']
  if (selectedCategory === 'WHISKY') {
    extraHidden.push('distilleryId', 'bottledYear', 'bottler', 'countryRegion')
  }

  const resetAll = () => {
    reset()
    setCountryCode(null)
    setCountryNameKo('')
    setRegionNameKo('')
    setErrorMsg('')
    setCatErrors({})
    setCommonDetail(DEFAULT_COMMON_DETAIL)
    setWhiskyDetail(DEFAULT_WHISKY)
    setWineDetail(DEFAULT_WINE)
    setCognacDetail(DEFAULT_COGNAC)
  }

  const handleClose = () => { resetAll(); onClose() }

  const buildCategoryPayload = (): Partial<CreateSpiritPayload> => {
    switch (selectedCategory) {
      case 'WHISKY': return {
        whiskyDetail: {
          style: whiskyDetail.style || null,
          bottlingType: whiskyDetail.bottlingType || null,
          caskType: whiskyDetail.caskType || null,
          maturationStyle: whiskyDetail.maturationStyle || null,
          finishCaskType: whiskyDetail.maturationStyle === 'FINISH' ? (whiskyDetail.finishCaskType || null) : null,
          finishCaskDetail: whiskyDetail.maturationStyle === 'FINISH' ? (whiskyDetail.finishCaskDetail || null) : null,
          isNonChillFiltered: whiskyDetail.isNonChillFiltered || null,
          isNaturalColour: whiskyDetail.isNaturalColour || null,
          isSingleCask: whiskyDetail.isSingleCask || null,
          isCaskStrength: whiskyDetail.isCaskStrength || null,
          isPeated: whiskyDetail.isPeated || null,
          phenolPpm: whiskyDetail.isPeated && whiskyDetail.phenolPpm ? Number(whiskyDetail.phenolPpm) : null,
          caskNo: whiskyDetail.caskNo || null,
        },
      }
      case 'WINE': return {
        wineDetail: {
          wineType: wineDetail.wineType || null,
          vintage: wineDetail.vintage ? Number(wineDetail.vintage) : null,
          isOakAged: wineDetail.isOakAged || null,
          isNaturalWine: wineDetail.isNaturalWine || null,
          certification: wineDetail.certification || null,
          grapeVarieties: wineDetail.grapeVarieties.filter((g) => g.name).map((g) => ({
            name: g.name, percentage: g.percentage ? Number(g.percentage) : null,
          })),
          appellationDesignation: wineDetail.appellationDesignation || null,
          soilType: wineDetail.soilType || null,
          altitudeM: wineDetail.altitudeM ? Number(wineDetail.altitudeM) : null,
          harvestMethod: wineDetail.harvestMethod || null,
          fermentationVessel: wineDetail.fermentationVessel || null,
          oakType: wineDetail.isOakAged ? (wineDetail.oakType || null) : null,
          oakAgedMonths: wineDetail.isOakAged && wineDetail.oakAgedMonths ? Number(wineDetail.oakAgedMonths) : null,
        },
      }
      case 'COGNAC': return {
        cognacDetail: {
          grade: cognacDetail.grade || null,
          cru: cognacDetail.cru || null,
          isFineChampagne: cognacDetail.isFineChampagne || null,
          blendDetail: cognacDetail.blendDetail || null,
        },
      }
      default: return {}
    }
  }

  const onSubmit = (data: CreateSpiritPayload) => {
    const errs: Record<string, string> = {}
    if (selectedCategory === 'COGNAC' && !cognacDetail.grade) errs.grade = '등급을 선택해주세요.'
    if (selectedCategory === 'WINE' && !wineDetail.wineType) errs.wineType = '와인 종류를 선택해주세요.'
    if (selectedCategory === 'WHISKY' && !countryNameKo) errs.countryRegion = '국가/지역은 필수입니다.'
    if (commonDetail.distilledDate && !DATE_RE.test(commonDetail.distilledDate)) errs.distilledDate = '형식: YYYY 또는 YYYY-MM'
    if (commonDetail.bottledDate && !DATE_RE.test(commonDetail.bottledDate)) errs.bottledDate = '형식: YYYY 또는 YYYY-MM'
    if (Object.keys(errs).length > 0) { setCatErrors(errs); return }

    setErrorMsg('')
    const payload: CreateSpiritPayload = {
      ...data,
      country: countryNameKo || null,
      region:  regionNameKo  || null,
      bottledYear: data.bottledYear != null && !isNaN(Number(data.bottledYear)) ? Number(data.bottledYear) : null,
      vintageYear: data.vintageYear != null && !isNaN(Number(data.vintageYear)) ? Number(data.vintageYear) : null,
      commonDetail: {
        isNas: commonDetail.isNas,
        ageStatement: commonDetail.isNas ? null : (commonDetail.ageStatement ?? null),
        distilledDate: commonDetail.distilledDate || null,
        bottledDate: commonDetail.bottledDate || null,
        releaseDate: commonDetail.releaseDate || null,
        abv: data.abv ?? null,
        volumeMl: data.volumeMl ?? null,
        bottleNo: commonDetail.bottleNo || null,
        batchNo: commonDetail.batchNo || null,
        totalBottles: commonDetail.totalBottles ? Number(commonDetail.totalBottles) : null,
      },
      ...buildCategoryPayload(),
    }
    createSpirit.mutate(payload, {
      onSuccess: (res) => {
        const created = res.data.data
        handleClose()
        if (created?.id) navigate(`/admin/spirits/${created.id}`)
      },
      onError: () => setErrorMsg('술 등록 중 오류가 발생했습니다.'),
    })
  }

  const hasCategorySection = selectedCategory && ['WHISKY', 'COGNAC', 'WINE'].includes(selectedCategory)

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 flex-shrink-0">
                <DialogTitle className="text-lg font-bold text-neutral-900">술 직접 등록</DialogTitle>
                <button
                  onClick={handleClose}
                  className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md transition-colors"
                  aria-label="닫기"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-5 overflow-y-auto">

                {/* 카테고리 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-600">카테고리 *</label>
                  <select
                    {...register('category', { required: true })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
                      focus:ring-2 focus:ring-primary-400 bg-white ${errors.category ? 'border-red-400' : 'border-neutral-200'}`}
                  >
                    <option value="">카테고리 선택</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_LABEL[cat]}</option>
                    ))}
                  </select>
                  {errors.category && <p className="text-xs text-red-500">카테고리를 선택해주세요.</p>}
                </div>

                {/* 영문명 / 한글명 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-600">영어 이름 *</label>
                    <input
                      {...register('nameEn', { required: true })}
                      placeholder="Balvenie 12Y DoubleWood"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
                        focus:ring-2 focus:ring-primary-400 ${errors.nameEn ? 'border-red-400' : 'border-neutral-200'}`}
                    />
                    {errors.nameEn && <p className="text-xs text-red-500">영어 이름을 입력해주세요.</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-600">한국어 이름 *</label>
                    <input
                      {...register('nameKo', { required: true })}
                      placeholder="예) 발베니 12년 더블우드"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
                        focus:ring-2 focus:ring-primary-400 ${errors.nameKo ? 'border-red-400' : 'border-neutral-200'}`}
                    />
                    {errors.nameKo && <p className="text-xs text-red-500">한국어 이름을 입력해주세요.</p>}
                  </div>
                </div>

                {/* 카테고리 선택 후에만 나머지 필드 표시 */}
                {selectedCategory && <>

                {/* 공통 필수 정보 */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                  <p className="text-xs font-semibold text-amber-700">공통 필수 정보</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-neutral-600">
                        알코올 도수 <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number" step="0.1"
                          {...register('abv', {
                            required: '알코올 도수는 필수입니다.',
                            valueAsNumber: true,
                            min: { value: 0, message: '도수는 0~100 사이여야 합니다.' },
                            max: { value: 100, message: '도수는 0~100 사이여야 합니다.' },
                          })}
                          className={`w-full px-3 py-2 pr-8 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 ${errors.abv ? 'border-red-400' : 'border-neutral-200'}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
                      </div>
                      {errors.abv && <p className="text-xs text-red-500">{errors.abv.message as string}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-neutral-600">
                        용량 <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number" min="1" max="100000"
                          {...register('volumeMl', { required: '용량은 필수입니다.', valueAsNumber: true })}
                          className={`w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 ${errors.volumeMl ? 'border-red-400' : 'border-neutral-200'}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">ml</span>
                      </div>
                      {errors.volumeMl && <p className="text-xs text-red-500">{errors.volumeMl.message as string}</p>}
                    </div>
                  </div>
                </div>

                {/* 카테고리 전용 필드 */}
                {hasCategorySection && (
                  <div className="border-t border-neutral-100 pt-4 space-y-4">
                    <p className="text-xs font-semibold text-neutral-600">
                      카테고리 전용 —{' '}
                      <span className="text-amber-600">{CATEGORY_LABEL[selectedCategory!]}</span>
                    </p>
                    {selectedCategory === 'WHISKY' && (
                      <WhiskyDetailSection
                        value={whiskyDetail}
                        onChange={handleWhiskyChange}
                        countrySlot={
                          <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-neutral-600">
                              국가 / 지역 <span className="text-red-400">*</span>
                            </label>
                            <CountryRegionSelector
                              countryCode={countryCode}
                              regionNameKo={regionNameKo}
                              onCountryChange={(code, nameKo) => { setCountryCode(code); setCountryNameKo(nameKo) }}
                              onRegionChange={(nameKo) => setRegionNameKo(nameKo)}
                            />
                            {catErrors.countryRegion && (
                              <p className="text-xs text-red-500">{catErrors.countryRegion}</p>
                            )}
                          </div>
                        }
                        bottlingSlot={
                          whiskyDetail.bottlingType === 'OB' ? (
                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-neutral-600">증류소</label>
                              <AdminDistillerySelector
                                value={watch('distilleryId') ?? null}
                                onChange={(id) => setValue('distilleryId', id ?? undefined)}
                              />
                            </div>
                          ) : whiskyDetail.bottlingType === 'IB' ? (
                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-neutral-600">병입업체명</label>
                              <input
                                {...register('bottler')}
                                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                              />
                            </div>
                          ) : null
                        }
                      />
                    )}
                    {selectedCategory === 'COGNAC' && (
                      <CognacDetailSection
                        value={cognacDetail}
                        onChange={(u) => setCognacDetail((prev) => ({ ...prev, ...u }))}
                        errors={catErrors}
                      />
                    )}
                    {selectedCategory === 'WINE' && (
                      <WineDetailSection
                        value={wineDetail}
                        onChange={(u) => setWineDetail((prev) => ({ ...prev, ...u }))}
                        errors={catErrors}
                      />
                    )}
                  </div>
                )}

                {/* 공통 선택 정보 */}
                <div className="border-t border-neutral-100 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-neutral-500">공통 상세 정보 (선택)</p>
                  <SpiritCommonDetailSection
                    value={commonDetail}
                    onChange={(u) => setCommonDetail((prev) => ({ ...prev, ...u }))}
                    dateErrors={{
                      distilledDate: catErrors.distilledDate,
                      bottledDate: catErrors.bottledDate,
                    }}
                  />
                </div>

                {/* 선택 옵션 (증류소, 국가, 병입업체 등) */}
                <div className="border-t border-neutral-100 pt-4">
                  <p className="text-xs font-medium text-neutral-500 mb-4">기타 선택 옵션</p>
                  <SpiritOptionalFields
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    countryCode={countryCode}
                    countryNameKo={countryNameKo}
                    regionNameKo={regionNameKo}
                    onCountryChange={(code, nameKo) => { setCountryCode(code); setCountryNameKo(nameKo) }}
                    onRegionChange={(nameKo) => setRegionNameKo(nameKo)}
                    category={selectedCategory}
                    hiddenFields={extraHidden}
                    pinnedFields={pinnedFields}
                    adminSelector
                  />
                </div>

                </>}

                {errorMsg && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" type="button" onClick={handleClose}>
                    취소
                  </Button>
                  <Button size="sm" type="submit" isLoading={createSpirit.isPending}>
                    등록
                  </Button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────

export default function AdminRequestPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<RequestStatus>('PENDING')
  const [page, setPage]     = useState(0)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useAdminRequests(status, page)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">등록 요청</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + 술 직접 등록
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex items-end gap-3 p-4 bg-white rounded-xl shadow-sm">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">상태</label>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setStatus(value); setPage(0) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  status === value
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-16">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">한글명</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">영문명</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">카테고리</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신청일</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/spirits/requests/${req.id}`)}
                    >
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{req.id}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{req.nameKo}</td>
                      <td className="px-4 py-3 text-neutral-500">{req.nameEn}</td>
                      <td className="px-4 py-3">
                        <Badge variant={req.category} size="sm">
                          {CATEGORY_LABEL[req.category] ?? req.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={req.status} size="sm">
                          {STATUS_OPTIONS.find((s) => s.value === req.status)?.label ?? req.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs tabular-nums">
                        {formatDate(req.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-primary-600 font-medium">상세 보기 →</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <CreateSpiritModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
