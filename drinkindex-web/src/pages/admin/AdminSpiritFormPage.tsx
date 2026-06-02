import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdminSpiritDetail } from '@/domain/admin/hooks/useAdminSpirits'
import { adminSpiritApi } from '@/domain/admin/api/adminSpiritApi'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'
import AdminProducerSelector from '@/domain/producer/components/AdminProducerSelector'
import { CATEGORY_TO_PRODUCER_TYPE } from '@/domain/producer/types/producer.types'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import Spinner from '@/shared/components/Spinner'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import SpiritCommonDetailSection, {
  type CommonDetailForm,
  DEFAULT_COMMON_DETAIL,
} from '@/domain/admin/components/SpiritCommonDetailSection'
import WhiskyDetailSection, { type WhiskyDetailForm, DEFAULT_WHISKY } from '@/domain/admin/components/WhiskyDetailSection'
import WineDetailSection, { type WineDetailForm, DEFAULT_WINE } from '@/domain/admin/components/WineDetailSection'
import CognacDetailSection, { type CognacDetailForm, DEFAULT_COGNAC } from '@/domain/admin/components/CognacDetailSection'
import OtherDetailSection, { type OtherDetailForm, DEFAULT_OTHER } from '@/domain/admin/components/OtherDetailSection'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

// ── 상수 ────────────────────────────────────────────────────────

const CATEGORIES: Array<[SpiritCategory, string, string]> = [
  ['WHISKY', '위스키', '🥃'],
  ['COGNAC', '꼬냑',   '🍇'],
  ['WINE',   '와인',   '🍷'],
  ['OTHER',  '기타',   '🍸'],
]

const CATEGORY_LABEL: Record<SpiritCategory, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', OTHER: '기타',
}

const PRODUCER_LABEL: Record<SpiritCategory, string> = {
  WHISKY: '증류소', COGNAC: '증류소', WINE: '양조장', OTHER: '생산자',
}

const DATE_RE = /^\d{4}(-\d{2})?$/

// ── 공통 스타일 ──────────────────────────────────────────────────

const CARD = 'bg-white rounded-2xl shadow-sm p-6 space-y-5'
const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

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

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminSpiritFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const spiritId = id ? Number(id) : undefined

  const { data: spirit, isLoading } = useAdminSpiritDetail(spiritId ?? 0)

  // ── 카테고리 ─────────────────────────────────────────────────
  const [category, setCategory] = useState<SpiritCategory | null>(null)
  const [showCatModal, setShowCatModal] = useState(false)
  const [pendingCat, setPendingCat] = useState<SpiritCategory | null>(null)

  // ── 기본 정보 ────────────────────────────────────────────────
  const [nameKo, setNameKo] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [producerId, setProducerId] = useState<number | null>(null)
  const [producerName, setProducerName] = useState('')
  const [bottler, setBottler] = useState('')
  const [bottledYear, setBottledYear] = useState('')
  const [vintageYear, setVintageYear] = useState('')
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')

  // ── 상세 정보 ─────────────────────────────────────────────────
  const [commonDetail, setCommonDetail] = useState<CommonDetailForm>(DEFAULT_COMMON_DETAIL)
  const [whiskyDetail, setWhiskyDetail] = useState<WhiskyDetailForm>(DEFAULT_WHISKY)
  const [wineDetail, setWineDetail] = useState<WineDetailForm>(DEFAULT_WINE)
  const [cognacDetail, setCognacDetail] = useState<CognacDetailForm>(DEFAULT_COGNAC)
  const [otherDetail, setOtherDetail] = useState<OtherDetailForm>(DEFAULT_OTHER)

  // ── UI 상태 ──────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [initialized, setInitialized] = useState(false)

  // ── 수정 모드: 기존 데이터 초기화 ────────────────────────────
  useEffect(() => {
    if (!isEdit || !spirit || initialized) return

    setCategory(spirit.category)
    setNameKo(spirit.nameKo)
    setNameEn(spirit.nameEn)
    setProducerId(spirit.producerId)
    setProducerName(spirit.producerNameKo ?? '')
    setBottler(spirit.bottler ?? '')
    setBottledYear(spirit.bottledYear?.toString() ?? '')
    setVintageYear(spirit.vintageYear?.toString() ?? '')
    const matched = ISO3166_COUNTRIES.find((c) => c.nameKo === spirit.country)
    setCountryCode(matched?.code ?? null)
    setCountry(spirit.country ?? '')
    setRegion(spirit.region ?? '')

    if (spirit.commonDetail) {
      const cd = spirit.commonDetail
      setCommonDetail({
        isNas: cd.isNas,
        ageStatement: cd.ageStatement,
        distilledDate: cd.distilledDate ?? '',
        bottledDate: cd.bottledDate ?? '',
        releaseDate: cd.releaseDate ?? '',
        volumeMl: cd.volumeMl?.toString() ?? '',
        abv: cd.abv?.toString() ?? '',
        bottleNo: cd.bottleNo ?? '',
        batchNo: cd.batchNo ?? '',
        totalBottles: cd.totalBottles?.toString() ?? '',
      })
    }

    if (spirit.whiskyDetail) {
      const w = spirit.whiskyDetail
      setWhiskyDetail({
        style: w.style ?? '', bottlingType: w.bottlingType ?? '',
        caskType: w.caskType ?? '', maturationStyle: w.maturationStyle ?? '',
        finishCaskType: w.finishCaskType ?? '',
        isNonChillFiltered: w.isNonChillFiltered ?? false,
        isNaturalColour: w.isNaturalColour ?? false,
        isSingleCask: w.isSingleCask ?? false,
        isCaskStrength: w.isCaskStrength ?? false,
        isPeated: w.isPeated ?? false,
        phenolPpm: w.phenolPpm?.toString() ?? '',
        caskNo: w.caskNo ?? '',
        finishCaskDetail: w.finishCaskDetail ?? '',
      })
    }

    if (spirit.wineDetail) {
      const w = spirit.wineDetail
      setWineDetail({
        wineType: w.wineType ?? '', vintage: w.vintage?.toString() ?? '',
        isOakAged: w.isOakAged ?? false, isNaturalWine: w.isNaturalWine ?? false,
        certification: w.certification ?? '',
        grapeVarieties: (w.grapeVarieties ?? []).map((g) => ({
          name: g.name, percentage: g.percentage?.toString() ?? '',
        })),
        appellationDesignation: w.appellationDesignation ?? '',
        soilType: w.soilType ?? '', altitudeM: w.altitudeM?.toString() ?? '',
        harvestMethod: w.harvestMethod ?? '', fermentationVessel: w.fermentationVessel ?? '',
        oakType: w.oakType ?? '', oakAgedMonths: w.oakAgedMonths?.toString() ?? '',
      })
    }

    if (spirit.cognacDetail) {
      const c = spirit.cognacDetail
      setCognacDetail({
        grade: c.grade ?? '', cru: c.cru ?? '',
        isFineChampagne: c.isFineChampagne ?? false, blendDetail: c.blendDetail ?? '',
      })
    }

    if (spirit.otherDetail) {
      const o = spirit.otherDetail
      setOtherDetail({
        otherType: o.otherType ?? '',
        mainIngredient: o.mainIngredient ?? '',
        productionMethod: o.productionMethod ?? '',
        notes: o.notes ?? '',
      })
    }

    setInitialized(true)
  }, [spirit, isEdit, initialized])

  // ── 카테고리 변경 처리 ────────────────────────────────────────
  const applyCategory = (cat: SpiritCategory) => {
    // 와인 ↔ 비와인 전환 시 연도 필드 정리
    if (cat === 'WINE' && category !== 'WINE') setBottledYear('')
    else if (cat !== 'WINE' && category === 'WINE') setVintageYear('')
    setCategory(cat)
    setErrors({})
  }

  const handleCategorySelect = (cat: SpiritCategory) => {
    if (cat === category) return
    // 수정 모드에서 카테고리 변경 시 기존 상세 삭제 경고
    if (isEdit && category) {
      setPendingCat(cat)
      setShowCatModal(true)
    } else {
      applyCategory(cat)
    }
  }

  const confirmCategoryChange = () => {
    if (pendingCat) applyCategory(pendingCat)
    setPendingCat(null)
    setShowCatModal(false)
  }

  // ── 유효성 검증 (한 화면 통합) ────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {}

    if (!category) errs.category = '카테고리를 선택해주세요.'
    if (!nameEn.trim()) errs.nameEn = '영문 이름은 필수입니다.'
    if (!nameKo.trim()) errs.nameKo = '한글 이름은 필수입니다.'

    if (!commonDetail.abv) errs.abv = '알코올 도수는 필수입니다.'
    else if (Number(commonDetail.abv) < 0 || Number(commonDetail.abv) > 100)
      errs.abv = '도수는 0~100 사이여야 합니다.'
    if (!commonDetail.volumeMl) errs.volumeMl = '용량은 필수입니다.'

    if (commonDetail.distilledDate && !DATE_RE.test(commonDetail.distilledDate))
      errs.distilledDate = '형식: YYYY 또는 YYYY-MM'
    if (commonDetail.bottledDate && !DATE_RE.test(commonDetail.bottledDate))
      errs.bottledDate = '형식: YYYY 또는 YYYY-MM'

    // 카테고리 전용 필수
    if (category === 'WINE') {
      if (!wineDetail.wineType) errs.wineType = '와인 종류를 선택해주세요.'
      const total = wineDetail.grapeVarieties.reduce(
        (sum, g) => sum + (Number(g.percentage) || 0), 0,
      )
      if (total > 100) errs.grapeVarieties = '포도 품종 비율 합계가 100%를 초과합니다.'
    }
    if (category === 'COGNAC' && !cognacDetail.grade) errs.grade = '등급을 선택해주세요.'
    if (category === 'OTHER' && !otherDetail.otherType) errs.otherType = '주종을 선택해주세요.'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── 페이로드 빌드 ─────────────────────────────────────────────
  const buildCommonPayload = () => ({
    isNas: commonDetail.isNas,
    ageStatement: commonDetail.isNas ? null : (commonDetail.ageStatement ?? null),
    distilledDate: commonDetail.distilledDate || null,
    bottledDate: commonDetail.bottledDate || null,
    releaseDate: commonDetail.releaseDate || null,
    volumeMl: commonDetail.volumeMl ? Number(commonDetail.volumeMl) : null,
    abv: commonDetail.abv ? Number(commonDetail.abv) : null,
    bottleNo: commonDetail.bottleNo || null,
    batchNo: commonDetail.batchNo || null,
    totalBottles: commonDetail.totalBottles ? Number(commonDetail.totalBottles) : null,
  })

  const buildCategoryPayload = () => {
    switch (category) {
      case 'WHISKY': return {
        whiskyDetail: {
          style: whiskyDetail.style || null,
          bottlingType: whiskyDetail.bottlingType || null,
          caskType: whiskyDetail.caskType || null,
          maturationStyle: whiskyDetail.maturationStyle || null,
          finishCaskType: whiskyDetail.maturationStyle === 'FINISH' ? (whiskyDetail.finishCaskType || null) : null,
          isNonChillFiltered: whiskyDetail.isNonChillFiltered || null,
          isNaturalColour: whiskyDetail.isNaturalColour || null,
          isSingleCask: whiskyDetail.isSingleCask || null,
          isCaskStrength: whiskyDetail.isCaskStrength || null,
          isPeated: whiskyDetail.isPeated || null,
          phenolPpm: whiskyDetail.isPeated && whiskyDetail.phenolPpm ? Number(whiskyDetail.phenolPpm) : null,
          caskNo: whiskyDetail.caskNo || null,
          finishCaskDetail: whiskyDetail.maturationStyle === 'FINISH' ? (whiskyDetail.finishCaskDetail || null) : null,
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
      case 'OTHER': return {
        otherDetail: {
          otherType: otherDetail.otherType || null,
          mainIngredient: otherDetail.mainIngredient || null,
          productionMethod: otherDetail.productionMethod || null,
          notes: otherDetail.notes || null,
        },
      }
      default: return {}
    }
  }

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) {
      // 첫 에러로 스크롤
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!category) return
    setIsSaving(true)
    setSaveError('')
    try {
      const common = buildCommonPayload()
      const base = {
        nameKo, nameEn, category,
        producerId: producerId ?? null,
        bottler: bottler || null,
        bottledYear: category !== 'WINE' && bottledYear ? Number(bottledYear) : null,
        vintageYear: category === 'WINE' && vintageYear ? Number(vintageYear) : null,
        abv: common.abv,
        volumeMl: common.volumeMl,
        country: country || null,
        region: region || null,
        commonDetail: common,
        ...buildCategoryPayload(),
      }
      if (isEdit && spiritId) {
        await adminSpiritApi.update(spiritId, base)
        navigate(`/admin/spirits/${spiritId}`)
      } else {
        const res = await adminSpiritApi.create(base)
        navigate(`/admin/spirits/${res.data.data?.id ?? ''}`)
      }
    } catch {
      setSaveError('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isEdit && isLoading) {
    return <div className="flex justify-center py-32"><Spinner size="lg" className="text-primary-800" /></div>
  }

  const producerLabel = category ? PRODUCER_LABEL[category] : '증류소'

  return (
    <div className="p-6 mx-auto space-y-6 pb-28 max-w-3xl lg:max-w-6xl">
      {/* 헤더 */}
      <AdminPageHeader
        breadcrumbs={[
          { label: '주류 관리', to: '/admin/spirits' },
          { label: isEdit ? '주류 수정' : '주류 등록' },
        ]}
        backTo={isEdit ? `/admin/spirits/${spiritId}` : '/admin/spirits'}
        backLabel={isEdit ? '상세로' : '주류 목록'}
        title={isEdit ? '술 정보 수정' : '새 술 등록'}
      />

      {/* PC: 2단 컬럼 레이아웃 / MO: 단일 컬럼(기존 유지) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ═══════════ 좌측 컬럼: ① 기본 / ② 생산·병입 ═══════════ */}
        <div className="space-y-6">
      {/* ── 1. 카테고리 & 기본 정보 ─────────────────────────── */}
      <div className={CARD}>
        <SectionTitle step={1} title="카테고리 & 기본 정보" />

        {/* 카테고리 */}
        <div>
          <label className={LABEL}>카테고리 <span className="text-red-400">*</span></label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map(([cat, label, emoji]) => (
              <button key={cat} type="button" onClick={() => handleCategorySelect(cat)}
                className={`py-4 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center gap-1.5 ${
                  category === cat
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-neutral-200 text-neutral-600 hover:border-amber-300 hover:bg-amber-50/50'
                }`}>
                <span className="text-2xl leading-none">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
          {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
        </div>

        {/* 이름 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>영어 이름 <span className="text-red-400">*</span></label>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)}
              maxLength={200} placeholder="Balvenie 12Y DoubleWood"
              className={`${INPUT} ${errors.nameEn ? 'border-red-400' : ''}`} />
            {errors.nameEn && <p className="text-xs text-red-500 mt-1">{errors.nameEn}</p>}
          </div>
          <div>
            <label className={LABEL}>한국어 이름 <span className="text-red-400">*</span></label>
            <input value={nameKo} onChange={(e) => setNameKo(e.target.value)}
              maxLength={200} placeholder="예) 발베니 12년 더블우드"
              className={`${INPUT} ${errors.nameKo ? 'border-red-400' : ''}`} />
            {errors.nameKo && <p className="text-xs text-red-500 mt-1">{errors.nameKo}</p>}
          </div>
        </div>

        {/* 필수 규격 */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
          <p className="text-xs font-semibold text-amber-700">필수 규격</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>알코올 도수 <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type="number" step="0.1" min="0" max="100"
                  value={commonDetail.abv}
                  onChange={(e) => {
                    let val = e.target.value
                    const num = parseFloat(val)
                    if (!isNaN(num) && num > 100) val = '100'
                    else if (!isNaN(num) && num < 0) val = '0'
                    setCommonDetail((prev) => ({ ...prev, abv: val }))
                  }}
                  className={`${INPUT} pr-8 ${errors.abv ? 'border-red-400' : ''}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
              </div>
              {errors.abv && <p className="text-xs text-red-500 mt-1">{errors.abv}</p>}
            </div>
            <div>
              <label className={LABEL}>용량 <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type="number" min="1" max="100000"
                  value={commonDetail.volumeMl}
                  onChange={(e) => setCommonDetail((prev) => ({ ...prev, volumeMl: e.target.value }))}
                  className={`${INPUT} pr-10 ${errors.volumeMl ? 'border-red-400' : ''}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">ml</span>
              </div>
              {errors.volumeMl && <p className="text-xs text-red-500 mt-1">{errors.volumeMl}</p>}
            </div>
          </div>
        </div>
      </div>

          {/* ── 2. 생산 / 병입 정보 ─────────────────────────── */}
          {category && (
          <div className={CARD}>
            <SectionTitle step={2} title="생산 / 병입 정보" hint="선택" />

            <div>
              <label className={LABEL}>{producerLabel}</label>
              <AdminProducerSelector value={producerId} defaultName={producerName}
                onChange={(id) => setProducerId(id ?? null)}
                type={category ? CATEGORY_TO_PRODUCER_TYPE[category] : undefined} />
            </div>

            <div>
              <label className={LABEL}>국가 / 지역</label>
              <CountryRegionSelector
                countryCode={countryCode} regionNameKo={region}
                onCountryChange={(code, nameKo) => { setCountryCode(code); setCountry(nameKo) }}
                onRegionChange={setRegion}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>병입업체</label>
                <input value={bottler} onChange={(e) => setBottler(e.target.value)}
                  maxLength={200} className={INPUT} />
              </div>
              {category === 'WINE' ? (
                <div>
                  <label className={LABEL}>빈티지 연도</label>
                  <input type="number" min={1800} max={2100} value={vintageYear}
                    onChange={(e) => setVintageYear(e.target.value)} className={INPUT} />
                </div>
              ) : (
                <div>
                  <label className={LABEL}>병입 연도</label>
                  <input type="number" min={1800} max={2100} value={bottledYear}
                    onChange={(e) => setBottledYear(e.target.value)} className={INPUT} />
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* ═══════════ 우측 컬럼: ③ 카테고리 상세 / ④ 공통 상세 ═══════════ */}
        <div className="space-y-6">
          {!category ? (
            <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 py-12 text-center">
              <p className="text-sm text-neutral-400">카테고리를 먼저 선택하면 상세 입력 항목이 표시됩니다.</p>
            </div>
          ) : (
            <>
          {/* ── 3. 카테고리 전용 상세 ───────────────────────── */}
          <div className={CARD}>
            <SectionTitle step={3} title={`${CATEGORY_LABEL[category]} 상세`} />

            {category === 'WHISKY' && (
              <WhiskyDetailSection value={whiskyDetail}
                onChange={(u) => setWhiskyDetail((prev) => ({ ...prev, ...u }))} />
            )}
            {category === 'WINE' && (
              <WineDetailSection value={wineDetail}
                onChange={(u) => setWineDetail((prev) => ({ ...prev, ...u }))}
                errors={errors} />
            )}
            {category === 'COGNAC' && (
              <CognacDetailSection value={cognacDetail}
                onChange={(u) => setCognacDetail((prev) => ({ ...prev, ...u }))}
                errors={errors} />
            )}
            {category === 'OTHER' && (
              <OtherDetailSection value={otherDetail}
                onChange={(u) => setOtherDetail((prev) => ({ ...prev, ...u }))}
                errors={errors} />
            )}
          </div>

          {/* ── 4. 공통 상세 정보 (선택) ─────────────────────── */}
          <div className={CARD}>
            <SectionTitle step={4} title="공통 상세 정보" hint="선택" />
            <SpiritCommonDetailSection
              value={commonDetail}
              onChange={(u) => setCommonDetail((prev) => ({ ...prev, ...u }))}
              dateErrors={{
                distilledDate: errors.distilledDate,
                bottledDate: errors.bottledDate,
              }}
            />
          </div>
            </>
          )}
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
      )}

      {/* 하단 고정 액션바 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur border-t border-neutral-200">
        <div className="max-w-3xl lg:max-w-6xl mx-auto px-6 py-3 flex justify-end gap-2">
          <Button variant="secondary"
            onClick={() => navigate(isEdit ? `/admin/spirits/${spiritId}` : '/admin/spirits')}>
            취소
          </Button>
          <Button onClick={handleSubmit} isLoading={isSaving}>
            {isEdit ? '변경사항 저장' : '등록'}
          </Button>
        </div>
      </div>

      {/* 카테고리 변경 경고 모달 (수정 모드) */}
      <Modal
        open={showCatModal}
        onClose={() => { setShowCatModal(false); setPendingCat(null) }}
        title="카테고리 변경 확인"
        footer={
          <>
            <Button variant="secondary" size="sm"
              onClick={() => { setShowCatModal(false); setPendingCat(null) }}>
              취소
            </Button>
            <Button variant="danger" size="sm" onClick={confirmCategoryChange}>
              변경
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600 leading-relaxed">
          카테고리를 변경하면 기존 카테고리 세부 정보가 삭제됩니다.<br />
          계속하시겠습니까?
        </p>
      </Modal>
    </div>
  )
}
