import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  useMyRequests, useSubmitRequest, useUpdateMyRequest, useDeleteMyRequest,
} from '@/domain/spirit/hooks/useSpiritRequest'
import { spiritRequestApi } from '@/domain/spirit/api/spiritRequestApi'
import type { SpiritRegisterRequestForm, MySpiritRequest, RequestStatus } from '@/domain/spirit/types/spiritRequest.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import ProducerSelector from '@/domain/producer/components/ProducerSelector'
import { useSubmitProducerRequest } from '@/domain/producer/hooks/useProducerRequest'
import { CATEGORY_TO_PRODUCER_TYPE } from '@/domain/producer/types/producer.types'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'
import SeoMeta from '@/shared/components/SeoMeta'

// 카테고리 선택 카드 (관리자 등록 폼과 동일한 UX)
const CATEGORY_CARDS: Array<[SpiritCategory, string]> = [
  ['WHISKY', '🥃'], ['COGNAC', '🍇'], ['WINE', '🍷'], ['OTHER', '🍸'],
]

// 카테고리 핵심값 선택지 (신청자 입력 — 관리자 등록 참고용). 라벨은 spirit.* 번역키 사용
const CATEGORY_CORE_OPTS: Record<SpiritCategory, { field: keyof SpiritRegisterRequestForm; ns: string; values: string[] }> = {
  WHISKY: { field: 'whiskyStyle', ns: 'spirit.whiskyStyle', values: ['SINGLE_MALT', 'BLENDED_MALT', 'BLENDED_WHISKY', 'BOURBON', 'RYE', 'CORN', 'GRAIN', 'POT_STILL', 'OTHER'] },
  WINE:   { field: 'wineType',    ns: 'spirit.wineType',    values: ['RED', 'WHITE', 'ROSE', 'SPARKLING', 'DESSERT', 'ORANGE'] },
  COGNAC: { field: 'cognacGrade', ns: 'spirit.cognacGrade', values: ['VS', 'NAPOLEON', 'VSOP', 'XO', 'XXO', 'HORS_DAGE'] },
  OTHER:  { field: 'otherType',   ns: 'spirit.otherType',   values: ['RUM', 'GIN', 'VODKA', 'TEQUILA', 'MEZCAL', 'BRANDY', 'LIQUEUR', 'SAKE', 'SOJU', 'BAIJIU', 'ABSINTHE', 'BEER', 'OTHER'] },
}

const DATE_RE = /^\d{4}(-\d{2})?$/

const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING:  'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
}

const FIELD_CLS =
  'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors'
const LABEL_CLS = 'block text-xs font-medium text-neutral-600 mb-1.5'

// ── 섹션 타이틀 (단계 배지 + 제목) ───────────────────────────────
function SectionTitle({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold
        flex items-center justify-center">{step}</span>
      <h2 className="text-sm font-bold text-neutral-800">{title}</h2>
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
    </div>
  )
}

// ── 필수 라벨 ────────────────────────────────────────────────────
function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className={LABEL_CLS}>
      {children}<span className="ml-1 text-red-500">*</span>
    </label>
  )
}

function RequestCard({ item, onEdit, onDelete, busy }: {
  item: MySpiritRequest
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  busy: boolean
}) {
  const { t } = useTranslation()
  const locked = item.status === 'APPROVED'
  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-neutral-800 truncate">{item.nameKo}</p>
          <p className="text-sm text-neutral-500 truncate">{item.nameEn}</p>
        </div>
        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[item.status]}`}>
          {t(`spiritRequest.myRequests.status.${item.status}`)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
        <span>{t(`spirit.category.${item.category}`)}</span>
        <span>·</span>
        <span>{t('spiritRequest.myRequests.requestedAt')}: {new Date(item.createdAt).toLocaleDateString()}</span>
        {item.reviewedAt && (
          <>
            <span>·</span>
            <span>{t('spiritRequest.myRequests.reviewedAt')}: {new Date(item.reviewedAt).toLocaleDateString()}</span>
          </>
        )}
      </div>

      {item.status === 'REJECTED' && item.rejectReason && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <span className="font-medium">{t('spiritRequest.myRequests.rejectReason')}: </span>
          {item.rejectReason}
        </div>
      )}

      {locked ? (
        <p className="text-xs text-neutral-300">{t('spiritRequest.myRequests.lockedHint')}</p>
      ) : (
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => onEdit(item.id)}
            disabled={busy}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-200
              text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
          >
            {t('spiritRequest.myRequests.edit')}
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            disabled={busy}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200
              text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {t('spiritRequest.myRequests.delete')}
          </button>
        </div>
      )}
    </div>
  )
}

const EMPTY_FORM: SpiritRegisterRequestForm = {
  nameKo: '', nameEn: '', category: '' as SpiritCategory,
}

export default function SpiritRequestPage() {
  const { t } = useTranslation()
  const [successMsg, setSuccessMsg] = useState('')
  const [loadErr, setLoadErr] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [producerId, setProducerId] = useState<number | null>(null)
  const [producerName, setProducerName] = useState('')
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countryNameKo, setCountryNameKo] = useState('')
  const [regionNameKo, setRegionNameKo] = useState('')
  const { data: myRequests = [], isLoading } = useMyRequests()
  const { mutate: submitRequest, isPending: isSubmitting } = useSubmitRequest()
  const { mutate: updateRequest, isPending: isUpdating } = useUpdateMyRequest()
  const { mutate: deleteRequest, isPending: isDeleting } = useDeleteMyRequest()
  const { mutateAsync: submitProducerRequest } = useSubmitProducerRequest()
  const isPending = isSubmitting || isUpdating

  // 기타 카테고리 — 목록에 없는 생산자 직접 등록 → 생산자 등록요청 큐로 전송 (승인 후 사용)
  const handleCreateProducer = async (data: { nameKo: string; nameEn: string; country: string }) => {
    await submitProducerRequest({ type: 'OTHER', ...data })
    setSuccessMsg(t('producerSelector.createPending'))
    setTimeout(() => setSuccessMsg(''), 5000)
    return null
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SpiritRegisterRequestForm>({ defaultValues: EMPTY_FORM, shouldUnregister: true })

  const selectedCategory = watch('category')
  const isNas = watch('isNas')
  const whiskyStyle = watch('whiskyStyle')

  const resetAll = () => {
    reset(EMPTY_FORM)
    setProducerId(null)
    setProducerName('')
    setCountryCode(null)
    setCountryNameKo('')
    setRegionNameKo('')
    setEditingId(null)
  }

  // 카테고리 선택 (카드) — 다른 카테고리 핵심값 초기화
  const handleSelectCategory = (cat: SpiritCategory) => {
    setValue('category', cat, { shouldValidate: true })
    setValue('whiskyStyle', undefined)
    setValue('whiskyStyleOther', undefined)
    setValue('wineType', undefined)
    setValue('cognacGrade', undefined)
    setValue('otherType', undefined)
    setValue('vintageYear', undefined)
  }

  const buildPayload = (data: SpiritRegisterRequestForm): SpiritRegisterRequestForm => ({
    ...data,
    producerId,
    country: countryNameKo || undefined,
    region: regionNameKo || undefined,
    abv:         data.abv         != null && !isNaN(Number(data.abv))         ? Number(data.abv)         : null,
    vintageYear: data.vintageYear != null && !isNaN(Number(data.vintageYear)) ? Number(data.vintageYear) : null,
    volumeMl:    data.volumeMl    != null && !isNaN(Number(data.volumeMl))    ? Number(data.volumeMl)    : null,
    ageStatement: data.isNas ? null : (data.ageStatement != null && !isNaN(Number(data.ageStatement)) ? Number(data.ageStatement) : null),
    isNas: data.isNas || undefined,
    distilledDate: data.distilledDate?.trim() || undefined,
    bottledDate:   data.bottledDate?.trim()   || undefined,
    releaseDate:   data.releaseDate || undefined,
    whiskyStyle: data.whiskyStyle || undefined,
    whiskyStyleOther: data.whiskyStyle === 'OTHER' ? (data.whiskyStyleOther?.trim() || undefined) : undefined,
    caskNo: data.category === 'WHISKY' ? (data.caskNo?.trim() || undefined) : undefined,
    wineType:    data.wineType    || undefined,
    cognacGrade: data.cognacGrade || undefined,
    otherType:   data.otherType   || undefined,
    bottledYear: undefined,
    note:        data.note?.trim() || undefined,
  })

  const onSubmit = (data: SpiritRegisterRequestForm) => {
    const payload = buildPayload(data)
    if (editingId != null) {
      updateRequest({ id: editingId, data: payload }, {
        onSuccess: () => {
          resetAll()
          window.scrollTo({ top: 0, behavior: 'smooth' })
          setSuccessMsg(t('spiritRequest.form.editSuccess'))
          setTimeout(() => setSuccessMsg(''), 4000)
        },
      })
    } else {
      submitRequest(payload, {
        onSuccess: () => {
          resetAll()
          setSuccessMsg(t('spiritRequest.form.success'))
          setTimeout(() => setSuccessMsg(''), 4000)
        },
      })
    }
  }

  const handleEdit = async (id: number) => {
    setLoadErr('')
    setSuccessMsg('')
    try {
      const res = await spiritRequestApi.myRequestDetail(id)
      const d = res.data.data
      if (!d) throw new Error('no data')
      reset({
        nameKo: d.nameKo, nameEn: d.nameEn, category: d.category,
        abv: d.abv ?? undefined, volumeMl: d.volumeMl ?? undefined,
        ageStatement: d.ageStatement ?? undefined, isNas: d.isNas ?? undefined,
        distilledDate: d.distilledDate ?? undefined, bottledDate: d.bottledDate ?? undefined,
        releaseDate: d.releaseDate ?? undefined,
        whiskyStyle: d.whiskyStyle ?? undefined, whiskyStyleOther: d.whiskyStyleOther ?? undefined,
        caskNo: d.caskNo ?? undefined,
        wineType: d.wineType ?? undefined, cognacGrade: d.cognacGrade ?? undefined,
        otherType: d.otherType ?? undefined, vintageYear: d.vintageYear ?? undefined,
        note: d.note ?? undefined,
      })
      setProducerId(d.producerId ?? null)
      setProducerName(d.producerNameKo ?? '')
      const matched = ISO3166_COUNTRIES.find((c) => c.nameKo === d.country)
      setCountryCode(matched?.code ?? null)
      setCountryNameKo(d.country ?? '')
      setRegionNameKo(d.region ?? '')
      setEditingId(id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setLoadErr(t('spiritRequest.form.loadError'))
    }
  }

  const handleDelete = (id: number) => {
    if (!confirm(t('spiritRequest.myRequests.deleteConfirm'))) return
    deleteRequest(id, {
      onSuccess: () => { if (editingId === id) resetAll() },
    })
  }

  const core = selectedCategory ? CATEGORY_CORE_OPTS[selectedCategory] : null
  const coreError = core ? errors[core.field] : undefined

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SeoMeta title={t('spiritRequest.title')} description={t('spiritRequest.subtitle')} noindex />

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">{t('spiritRequest.title')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('spiritRequest.subtitle')}</p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
        {/* ── 폼 ──────────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

          {/* 수정 모드 배너 */}
          {editingId != null && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-amber-800">{t('spiritRequest.form.editMode')}</p>
                <p className="text-xs text-amber-700/80">{t('spiritRequest.form.editModeHint')}</p>
              </div>
              <button type="button" onClick={resetAll}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">
                {t('spiritRequest.form.cancelEdit')}
              </button>
            </div>
          )}

          {/* ── 1. 카테고리 선택 ───────────────────────────── */}
          <section className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
            <SectionTitle step={1} title={t('spiritRequest.form.categoryStep')} hint={t('spiritRequest.form.categoryStepHint')} />
            <input type="hidden" {...register('category', { required: true })} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORY_CARDS.map(([cat, emoji]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`py-4 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-neutral-200 text-neutral-600 hover:border-amber-300 hover:bg-amber-50/50'
                  }`}
                >
                  <span className="text-2xl leading-none">{emoji}</span>
                  {t(`spirit.category.${cat}`)}
                </button>
              ))}
            </div>
            {errors.category && <p className="text-xs text-red-500">{t('spiritRequest.form.errCategory')}</p>}
          </section>

          {!selectedCategory ? (
            <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 py-12 text-center">
              <p className="text-sm text-neutral-400">{t('spiritRequest.form.selectCategoryFirst')}</p>
            </div>
          ) : (
            <>
              {/* ── 2. 기본 정보 (필수) ──────────────────────── */}
              <section className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 space-y-5">
                <SectionTitle step={2} title={t('spiritRequest.form.basicStep')} hint={t('spiritRequest.form.basicStepHint')} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <ReqLabel>{t('spiritRequest.form.nameKo')}</ReqLabel>
                    <input
                      {...register('nameKo', { required: true, maxLength: 200 })}
                      maxLength={200}
                      className={`${FIELD_CLS} ${errors.nameKo ? 'border-red-400' : 'border-neutral-200'}`}
                      placeholder="예) 발베니 12년 더블우드"
                    />
                    {errors.nameKo && <p className="mt-1 text-xs text-red-500">{t('spiritRequest.form.errNameKo')}</p>}
                  </div>
                  <div>
                    <ReqLabel>{t('spiritRequest.form.nameEn')}</ReqLabel>
                    <input
                      {...register('nameEn', { required: true, maxLength: 200 })}
                      maxLength={200}
                      className={`${FIELD_CLS} ${errors.nameEn ? 'border-red-400' : 'border-neutral-200'}`}
                      placeholder="Balvenie 12Y DoubleWood"
                    />
                    {errors.nameEn && <p className="mt-1 text-xs text-red-500">{t('spiritRequest.form.errNameEn')}</p>}
                  </div>
                </div>

                {/* 카테고리 핵심값 (필수) + (와인) 빈티지 */}
                {core && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <ReqLabel>{t(`spiritRequest.form.categoryCore.${selectedCategory}`)}</ReqLabel>
                      <select
                        {...register(core.field, { required: true })}
                        className={`${FIELD_CLS} bg-white ${coreError ? 'border-red-400' : 'border-neutral-200'}`}
                      >
                        <option value="">{t('spiritRequest.form.categoryCorePlaceholder')}</option>
                        {core.values.map((v) => (
                          <option key={v} value={v}>{t(`${core.ns}.${v}`)}</option>
                        ))}
                      </select>
                      {coreError && <p className="mt-1 text-xs text-red-500">{t('spiritRequest.form.errCategoryCore')}</p>}
                      {/* 위스키 스타일 '기타' → 직접 입력 */}
                      {selectedCategory === 'WHISKY' && whiskyStyle === 'OTHER' && (
                        <div className="mt-2">
                          <input
                            {...register('whiskyStyleOther', {
                              validate: (v) => whiskyStyle !== 'OTHER' || !!v?.trim(),
                              maxLength: 100,
                            })}
                            maxLength={100}
                            placeholder={t('spiritRequest.form.whiskyStyleOtherPlaceholder')}
                            className={`${FIELD_CLS} ${errors.whiskyStyleOther ? 'border-red-400' : 'border-neutral-200'}`}
                          />
                          {errors.whiskyStyleOther && <p className="mt-1 text-xs text-red-500">{t('spiritRequest.form.errWhiskyStyleOther')}</p>}
                        </div>
                      )}
                    </div>
                    {selectedCategory === 'WINE' && (
                      <div>
                        <label className={LABEL_CLS}>{t('spiritRequest.form.vintageYear')}</label>
                        <input
                          type="number" min="1800" max="2100"
                          {...register('vintageYear')}
                          className={`${FIELD_CLS} border-neutral-200`}
                          placeholder="2010"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 필수 규격 — 도수 / 용량 */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                  <p className="text-xs font-semibold text-amber-700">{t('spiritRequest.form.requiredSection')}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <ReqLabel>{t('spiritRequest.form.abv')}</ReqLabel>
                      <div className="relative">
                        <input
                          type="number" step="0.1" min="0" max="100"
                          {...register('abv', { required: true })}
                          className={`${FIELD_CLS} bg-white pr-8 ${errors.abv ? 'border-red-400' : 'border-neutral-200'}`}
                          placeholder="43.0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
                      </div>
                      {errors.abv && <p className="mt-1 text-xs text-red-500">{t('spiritRequest.form.errAbv')}</p>}
                    </div>
                    <div>
                      <ReqLabel>{t('spiritRequest.form.volumeMl')}</ReqLabel>
                      <div className="relative">
                        <input
                          type="number" min="1"
                          {...register('volumeMl', { required: true })}
                          className={`${FIELD_CLS} bg-white pr-10 ${errors.volumeMl ? 'border-red-400' : 'border-neutral-200'}`}
                          placeholder="700"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">ml</span>
                      </div>
                      {errors.volumeMl && <p className="mt-1 text-xs text-red-500">{t('spiritRequest.form.errVolume')}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-amber-700/80">{t('spiritRequest.form.requiredNote')}</p>
                </div>
              </section>

              {/* ── 3. 추가 정보 (선택) ──────────────────────── */}
              <section className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 space-y-5">
                <SectionTitle step={3} title={t('spiritRequest.form.detailStep')} hint={t('spiritRequest.form.detailStepHint')} />

                <div>
                  <label className={LABEL_CLS}>{t(`spiritRequest.form.producerByCategory.${selectedCategory}`)}</label>
                  <ProducerSelector
                    value={producerId}
                    defaultName={producerName}
                    onChange={setProducerId}
                    type={selectedCategory ? CATEGORY_TO_PRODUCER_TYPE[selectedCategory] : undefined}
                    onCreateNew={handleCreateProducer}
                    defaultCountry={countryNameKo}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>{t('spiritRequest.form.country')} / {t('spiritRequest.form.region')}</label>
                  <CountryRegionSelector
                    countryCode={countryCode}
                    regionNameKo={regionNameKo}
                    onCountryChange={(code, nameKo) => { setCountryCode(code); setCountryNameKo(nameKo) }}
                    onRegionChange={(nameKo) => setRegionNameKo(nameKo)}
                  />
                </div>

                {/* 캐스크 번호 (위스키 전용) */}
                {selectedCategory === 'WHISKY' && (
                  <div>
                    <label className={LABEL_CLS}>{t('spiritRequest.form.caskNo')}</label>
                    <input
                      {...register('caskNo', { maxLength: 100 })}
                      maxLength={100}
                      className={`${FIELD_CLS} border-neutral-200`}
                    />
                  </div>
                )}

                {/* 숙성 연수 + NAS */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                    <input type="checkbox" {...register('isNas')} className="w-4 h-4 accent-amber-500 cursor-pointer" />
                    <span className="text-sm font-medium text-neutral-700">{t('spiritRequest.form.nas')}</span>
                  </label>
                  <label className={LABEL_CLS}>
                    {t('spiritRequest.form.ageStatement')}
                    {isNas && <span className="ml-1.5 font-normal text-neutral-400">{t('spiritRequest.form.nasHint')}</span>}
                  </label>
                  <input
                    type="number" min="1" max="100" step="1"
                    {...register('ageStatement')}
                    disabled={isNas}
                    placeholder={t('spiritRequest.form.agePlaceholder')}
                    className={`${FIELD_CLS} ${isNas ? 'opacity-40 cursor-not-allowed bg-neutral-50 border-neutral-200' : 'border-neutral-200'}`}
                  />
                </div>

                {/* 증류 / 병입 연월 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS}>{t('spiritRequest.form.distilledDate')}</label>
                    <input
                      type="text"
                      {...register('distilledDate', { validate: (v) => !v || DATE_RE.test(v) })}
                      maxLength={7}
                      placeholder="YYYY / YYYY-MM"
                      className={`${FIELD_CLS} ${errors.distilledDate ? 'border-red-400' : 'border-neutral-200'}`}
                    />
                    {errors.distilledDate && <p className="mt-1 text-xs text-red-500">{t('spiritRequest.form.errDateFormat')}</p>}
                  </div>
                  <div>
                    <label className={LABEL_CLS}>{t('spiritRequest.form.bottledDate')}</label>
                    <input
                      type="text"
                      {...register('bottledDate', { validate: (v) => !v || DATE_RE.test(v) })}
                      maxLength={7}
                      placeholder="YYYY / YYYY-MM"
                      className={`${FIELD_CLS} ${errors.bottledDate ? 'border-red-400' : 'border-neutral-200'}`}
                    />
                    {errors.bottledDate && <p className="mt-1 text-xs text-red-500">{t('spiritRequest.form.errDateFormat')}</p>}
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLS}>{t('spiritRequest.form.releaseDate')}</label>
                  <input type="date" {...register('releaseDate')} className={`${FIELD_CLS} border-neutral-200`} />
                </div>

                {/* 기타 문구 */}
                <div>
                  <label className={LABEL_CLS}>{t('spiritRequest.form.note')}</label>
                  <textarea
                    {...register('note', { maxLength: 500 })}
                    maxLength={500}
                    rows={3}
                    className={`${FIELD_CLS} border-neutral-200 resize-none`}
                    placeholder={t('spiritRequest.form.notePlaceholder')}
                  />
                  <p className="mt-1 text-xs text-neutral-400">{t('spiritRequest.form.noteHint')}</p>
                </div>
              </section>
            </>
          )}

          {successMsg && (
            <div className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">{successMsg}</div>
          )}
          {loadErr && (
            <div className="text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3">{loadErr}</div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 bg-primary-800 text-white text-sm font-semibold rounded-xl
              hover:bg-primary-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? t('common.loading')
              : editingId != null ? t('spiritRequest.form.submitEdit')
              : t('spiritRequest.form.submit')}
          </button>
        </form>

        {/* ── 내 요청 목록 (PC 사이드바 / 모바일 하단) ──────── */}
        <aside className="mt-8 lg:mt-0 space-y-4">
          <h2 className="text-lg font-bold text-neutral-800">{t('spiritRequest.myRequests.title')}</h2>

          {isLoading ? (
            <p className="text-sm text-neutral-400">{t('common.loading')}</p>
          ) : myRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-neutral-200 p-6 text-center">
              <p className="text-sm text-neutral-400">{t('spiritRequest.myRequests.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map(item => (
                <RequestCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  busy={isDeleting || isPending}
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
