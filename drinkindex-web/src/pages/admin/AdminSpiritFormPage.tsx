import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdminSpiritDetail } from '@/domain/admin/hooks/useAdminSpirits'
import { adminSpiritApi } from '@/domain/admin/api/adminSpiritApi'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'
import AdminDistillerySelector from '@/domain/distillery/components/AdminDistillerySelector'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import Spinner from '@/shared/components/Spinner'
import SpiritCommonDetailSection, {
  type CommonDetailForm,
  DEFAULT_COMMON_DETAIL,
} from '@/domain/admin/components/SpiritCommonDetailSection'
import WhiskyDetailSection, { type WhiskyDetailForm, DEFAULT_WHISKY } from '@/domain/admin/components/WhiskyDetailSection'
import WineDetailSection, { type WineDetailForm, DEFAULT_WINE } from '@/domain/admin/components/WineDetailSection'
import CognacDetailSection, { type CognacDetailForm, DEFAULT_COGNAC } from '@/domain/admin/components/CognacDetailSection'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

// ── 상수 ────────────────────────────────────────────────────────

const CATEGORIES: Array<[SpiritCategory, string]> = [
  ['WHISKY','위스키'],['COGNAC','꼬냑'],['WINE','와인'],['OTHER','기타'],
]

const PRODUCER_LABEL: Partial<Record<SpiritCategory, string>> = {
  WINE: '양조장',
}

const DATE_RE = /^\d{4}(-\d{2})?$/

// ── Step 인디케이터 ──────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            n === current
              ? 'bg-amber-500 text-white'
              : n < current
              ? 'bg-amber-100 text-amber-600'
              : 'bg-neutral-100 text-neutral-400'
          }`}>
            {n < current ? '✓' : n}
          </div>
          {n < total && <div className={`w-8 h-0.5 ${n < current ? 'bg-amber-300' : 'bg-neutral-100'}`} />}
        </div>
      ))}
      <span className="ml-2 text-xs text-neutral-500">Step {current} / {total}</span>
    </div>
  )
}

// ── 폼 필드 ─────────────────────────────────────────────────────

const CARD = 'bg-white rounded-xl shadow-sm p-5 space-y-5'
const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminSpiritFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const spiritId = id ? Number(id) : undefined

  const { data: spirit, isLoading } = useAdminSpiritDetail(spiritId ?? 0)

  // ── Step 상태 ────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [category, setCategory] = useState<SpiritCategory>('WHISKY')
  const [showCatModal, setShowCatModal] = useState(false)
  const [pendingCat, setPendingCat] = useState<SpiritCategory | null>(null)

  // ── 기본 정보 ────────────────────────────────────────────────
  const [nameKo, setNameKo] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [distilleryId, setDistilleryId] = useState<number | null>(null)
  const [distilleryName, setDistilleryName] = useState('')
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

  // ── UI 상태 ──────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [initialized, setInitialized] = useState(false)

  // ── 수정 모드: 기존 데이터 초기화 ────────────────────────────
  useEffect(() => {
    if (!isEdit || !spirit || initialized) return

    setCategory(spirit.category)
    setNameKo(spirit.nameKo)
    setNameEn(spirit.nameEn)
    setDistilleryId(spirit.distilleryId)
    setDistilleryName(spirit.distilleryNameKo ?? '')
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

    setInitialized(true)
  }, [spirit, isEdit, initialized])

  // ── 카테고리 변경 처리 ────────────────────────────────────────
  const handleCategorySelect = (cat: SpiritCategory) => {
    if (cat !== category) {
      // 카테고리가 와인↔비와인으로 바뀌면 해당 연도 필드 초기화
      if (cat === 'WINE' && category !== 'WINE') setBottledYear('')
      else if (cat !== 'WINE' && category === 'WINE') setVintageYear('')
    }
    if (isEdit && cat !== category) {
      setPendingCat(cat)
      setShowCatModal(true)
    } else {
      setCategory(cat)
      setStep(2)
    }
  }

  const confirmCategoryChange = () => {
    if (pendingCat) {
      if (pendingCat === 'WINE' && category !== 'WINE') setBottledYear('')
      else if (pendingCat !== 'WINE' && category === 'WINE') setVintageYear('')
      setCategory(pendingCat)
      setPendingCat(null)
    }
    setShowCatModal(false)
    setStep(2)
  }

  // ── 유효성 검증 ───────────────────────────────────────────────
  const validateStep2 = () => {
    const errs: Record<string, string> = {}
    if (!nameKo.trim()) errs.nameKo = '한글 이름은 필수입니다.'
    if (!nameEn.trim()) errs.nameEn = '영문 이름은 필수입니다.'
    if (!commonDetail.abv) errs.abv = '알코올 도수는 필수입니다.'
    else if (Number(commonDetail.abv) < 0 || Number(commonDetail.abv) > 100) errs.abv = '도수는 0~100 사이여야 합니다.'
    if (!commonDetail.volumeMl) errs.volumeMl = '용량은 필수입니다.'
    if (commonDetail.distilledDate && !DATE_RE.test(commonDetail.distilledDate))
      errs.distilledDate = '형식: YYYY 또는 YYYY-MM'
    if (commonDetail.bottledDate && !DATE_RE.test(commonDetail.bottledDate))
      errs.bottledDate = '형식: YYYY 또는 YYYY-MM'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep3 = () => {
    const errs: Record<string, string> = {}
    if (category === 'WINE') {
      if (!wineDetail.wineType) errs.wineType = '와인 종류를 선택해주세요.'
      const total = wineDetail.grapeVarieties.reduce(
        (sum, g) => sum + (Number(g.percentage) || 0), 0,
      )
      if (total > 100) errs.grapeVarieties = '포도 품종 비율 합계가 100%를 초과합니다.'
    }
    if (category === 'COGNAC' && !cognacDetail.grade) errs.grade = '등급을 선택해주세요.'
    setStep3Errors(errs)
    return Object.keys(errs).length === 0
  }

  // ── 공통 상세 페이로드 빌드 ───────────────────────────────────
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
      default: return {}
    }
  }

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep3()) return
    setIsSaving(true)
    setSaveError('')
    try {
      const common = buildCommonPayload()
      const base = {
        nameKo, nameEn, category,
        distilleryId: distilleryId ?? null,
        bottler: bottler || null,
        bottledYear: bottledYear ? Number(bottledYear) : null,
        vintageYear: vintageYear ? Number(vintageYear) : null,
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

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(isEdit ? `/admin/spirits/${spiritId}` : '/admin/spirits')}
          className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
          ← {isEdit ? '상세로' : '목록으로'}
        </button>
        <h1 className="text-xl font-bold text-neutral-900">
          {isEdit ? '술 정보 수정' : '새 술 등록'}
        </h1>
      </div>

      <StepIndicator current={step} total={3} />

      {/* ── STEP 1: 카테고리 선택 ────────────────────────────── */}
      {step === 1 && (
        <div className={CARD}>
          <h2 className="text-sm font-semibold text-neutral-700">카테고리 선택</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map(([cat, label]) => (
              <button key={cat} type="button" onClick={() => handleCategorySelect(cat)}
                className={`py-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  category === cat
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-neutral-200 text-neutral-600 hover:border-amber-300 hover:bg-amber-50/50'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(2)}>다음 →</Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: 기본 정보 ────────────────────────────────── */}
      {step === 2 && (
        <div className={CARD}>
          <h2 className="text-sm font-semibold text-neutral-700">
            기본 정보 — <span className="text-amber-600">{CATEGORIES.find(([c]) => c === category)?.[1]}</span>
          </h2>

          {/* 이름 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>영어 이름 *</label>
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)}
                maxLength={200}
                className={`${INPUT} ${errors.nameEn ? 'border-red-400' : ''}`} />
              {errors.nameEn && <p className="text-xs text-red-500 mt-1">{errors.nameEn}</p>}
            </div>
            <div>
              <label className={LABEL}>한국어 이름 *</label>
              <input value={nameKo} onChange={(e) => setNameKo(e.target.value)}
                maxLength={200}
                className={`${INPUT} ${errors.nameKo ? 'border-red-400' : ''}`} />
              {errors.nameKo && <p className="text-xs text-red-500 mt-1">{errors.nameKo}</p>}
            </div>
          </div>

          {/* 필수 정보 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
            <p className="text-xs font-semibold text-amber-700">필수 정보</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>
                  알코올 도수 <span className="text-red-400">*</span>
                </label>
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
                <label className={LABEL}>
                  용량 <span className="text-red-400">*</span>
                </label>
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

          {/* 증류소 / 양조장 */}
          <div>
            <label className={LABEL}>{PRODUCER_LABEL[category] ?? '증류소'}</label>
            <AdminDistillerySelector value={distilleryId} defaultName={distilleryName}
              onChange={(id) => setDistilleryId(id ?? null)} />
          </div>

          {/* 국가/지역 */}
          <div>
            <label className={LABEL}>국가 / 지역</label>
            <CountryRegionSelector
              countryCode={countryCode} regionNameKo={region}
              onCountryChange={(code, nameKo) => { setCountryCode(code); setCountry(nameKo) }}
              onRegionChange={setRegion}
            />
          </div>

          {/* 선택 필드들 */}
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

          {/* 공통 상세 */}
          <div className="border-t border-neutral-100 pt-4 space-y-1">
            <p className="text-xs font-semibold text-neutral-500 mb-3">공통 상세 정보 (선택)</p>
            <SpiritCommonDetailSection
              value={commonDetail}
              onChange={(u) => setCommonDetail((prev) => ({ ...prev, ...u }))}
              dateErrors={{
                distilledDate: errors.distilledDate,
                bottledDate: errors.bottledDate,
              }}
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>← 이전</Button>
            <Button onClick={() => { if (validateStep2()) setStep(3) }}>다음 →</Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: 카테고리 전용 필드 ─────────────────────── */}
      {step === 3 && (
        <div className={CARD}>
          <h2 className="text-sm font-semibold text-neutral-700">
            카테고리 상세 — <span className="text-amber-600">{CATEGORIES.find(([c]) => c === category)?.[1]}</span>
          </h2>

          {category === 'WHISKY' && (
            <WhiskyDetailSection value={whiskyDetail}
              onChange={(u) => setWhiskyDetail((prev) => ({ ...prev, ...u }))} />
          )}
          {category === 'WINE' && (
            <WineDetailSection value={wineDetail}
              onChange={(u) => setWineDetail((prev) => ({ ...prev, ...u }))}
              errors={step3Errors} />
          )}
          {category === 'COGNAC' && (
            <CognacDetailSection value={cognacDetail}
              onChange={(u) => setCognacDetail((prev) => ({ ...prev, ...u }))}
              errors={step3Errors} />
          )}
          {!['WHISKY','WINE','COGNAC'].includes(category) && (
            <p className="text-sm text-neutral-400 py-4 text-center">
              이 카테고리는 추가 상세 정보가 없습니다.
            </p>
          )}

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>← 이전</Button>
            <Button onClick={handleSubmit} isLoading={isSaving}>
              {isEdit ? '변경사항 저장' : '등록'}
            </Button>
          </div>
        </div>
      )}

      {/* 카테고리 변경 경고 모달 */}
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
