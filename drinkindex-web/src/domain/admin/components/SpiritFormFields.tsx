import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import AdminProducerSelector from '@/domain/producer/components/AdminProducerSelector'
import { adminProducerApi } from '@/domain/admin/api/adminProducerApi'
import { CATEGORY_TO_PRODUCER_TYPE } from '@/domain/producer/types/producer.types'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import type { AdminSpiritDetail, CreateSpiritPayload, SpiritRegisterRequestDetail } from '@/domain/admin/types/admin.types'
import SpiritCommonDetailSection, {
  type CommonDetailForm, DEFAULT_COMMON_DETAIL,
} from '@/domain/admin/components/SpiritCommonDetailSection'
import WhiskyDetailSection, { type WhiskyDetailForm, DEFAULT_WHISKY } from '@/domain/admin/components/WhiskyDetailSection'
import WineDetailSection, { type WineDetailForm, DEFAULT_WINE } from '@/domain/admin/components/WineDetailSection'
import CognacDetailSection, { type CognacDetailForm, DEFAULT_COGNAC } from '@/domain/admin/components/CognacDetailSection'
import OtherDetailSection, { type OtherDetailForm, DEFAULT_OTHER } from '@/domain/admin/components/OtherDetailSection'

// ══════════════════════════════════════════════════════════════════
//  술 등록/수정/요청-승인 공유 폼 — 단일 소스 (SINGLE SOURCE OF TRUTH)
//  - 필드/검증/페이로드/프리필을 이 파일에서만 정의한다.
//  - 사용처: AdminSpiritFormPage(등록/수정), AdminSpiritDetailPage(상세=수정),
//            AdminRequestDetailPage(등록 요청 승인)
//  ⚠️ 술 데이터 항목을 추가·변경할 때는 반드시 이 파일을 수정하면 세 화면에 일괄 반영된다.
//     (자세한 가이드: CLAUDE.md "술 데이터 폼 — 단일 소스" 섹션)
// ══════════════════════════════════════════════════════════════════

// ── 공용 상수/스타일 (페이지에서 재사용) ────────────────────────────
export const CATEGORIES: Array<[SpiritCategory, string, string]> = [
  ['WHISKY', '위스키', '🥃'],
  ['COGNAC', '꼬냑',   '🍇'],
  ['WINE',   '와인',   '🍷'],
  ['OTHER',  '기타',   '🍸'],
]
export const CATEGORY_LABEL: Record<SpiritCategory, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', OTHER: '기타',
}
export const PRODUCER_LABEL: Record<SpiritCategory, string> = {
  WHISKY: '증류소', COGNAC: '증류소', WINE: '양조장', OTHER: '생산자',
}
export const DATE_RE = /^\d{4}(-\d{2})?$/

// 카테고리별 입력 예시 placeholder (이름/병입업체)
const PLACEHOLDERS: Record<SpiritCategory, { nameEn: string; nameKo: string; bottler: string }> = {
  WHISKY: { nameEn: 'Balvenie 12Y DoubleWood', nameKo: '예) 발베니 12년 더블우드', bottler: '예) Gordon & MacPhail' },
  COGNAC: { nameEn: 'Rémy Martin XO',          nameKo: '예) 레미 마르탱 XO',       bottler: '예) 메종 직병입' },
  WINE:   { nameEn: 'Château Margaux 2016',    nameKo: '예) 샤토 마고 2016',       bottler: '예) 도멘 직병입' },
  OTHER:  { nameEn: 'Bombay Sapphire',         nameKo: '예) 봄베이 사파이어',       bottler: '예) 병입업체명' },
}
const DEFAULT_PLACEHOLDER = { nameEn: 'Balvenie 12Y DoubleWood', nameKo: '예) 발베니 12년 더블우드', bottler: '' }

export const CARD = 'bg-white rounded-2xl shadow-sm p-6 space-y-5'
const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

export function SectionTitle({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold
        flex items-center justify-center">{step}</span>
      <h2 className="text-sm font-bold text-neutral-800">{title}</h2>
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
    </div>
  )
}

// ── 폼 상태 훅 (상태 · 검증 · 페이로드 · 프리필 단일 정의) ───────────
export function useSpiritForm() {
  const [category, setCategory] = useState<SpiritCategory | null>(null)
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

  const [commonDetail, setCommonDetail] = useState<CommonDetailForm>(DEFAULT_COMMON_DETAIL)
  const [whiskyDetail, setWhiskyDetail] = useState<WhiskyDetailForm>(DEFAULT_WHISKY)
  const [wineDetail, setWineDetail] = useState<WineDetailForm>(DEFAULT_WINE)
  const [cognacDetail, setCognacDetail] = useState<CognacDetailForm>(DEFAULT_COGNAC)
  const [otherDetail, setOtherDetail] = useState<OtherDetailForm>(DEFAULT_OTHER)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateCommon = (u: Partial<CommonDetailForm>) => setCommonDetail((p) => ({ ...p, ...u }))
  const updateWhisky = (u: Partial<WhiskyDetailForm>) => setWhiskyDetail((p) => ({ ...p, ...u }))
  const updateWine   = (u: Partial<WineDetailForm>)   => setWineDetail((p) => ({ ...p, ...u }))
  const updateCognac = (u: Partial<CognacDetailForm>) => setCognacDetail((p) => ({ ...p, ...u }))
  const updateOther  = (u: Partial<OtherDetailForm>)  => setOtherDetail((p) => ({ ...p, ...u }))

  const setCountryValue = (code: string | null, nameKo: string) => { setCountryCode(code); setCountry(nameKo) }

  // 카테고리 선택 (와인 ↔ 비와인 전환 시 연도 필드 정리)
  const selectCategory = (cat: SpiritCategory) => {
    if (cat === category) return
    if (cat === 'WINE' && category !== 'WINE') setBottledYear('')
    else if (cat !== 'WINE' && category === 'WINE') setVintageYear('')
    setCategory(cat)
    setErrors({})
  }

  // ── 프리필: 술 상세(AdminSpiritDetail) → 폼 ──
  const prefillFromSpirit = (s: AdminSpiritDetail) => {
    setCategory(s.category)
    setNameKo(s.nameKo)
    setNameEn(s.nameEn)
    setProducerId(s.producerId)
    setProducerName(s.producerNameKo ?? '')
    setBottler(s.bottler ?? '')
    setBottledYear(s.bottledYear?.toString() ?? '')
    setVintageYear(s.vintageYear?.toString() ?? '')
    setCountryCode(ISO3166_COUNTRIES.find((c) => c.nameKo === s.country)?.code ?? null)
    setCountry(s.country ?? '')
    setRegion(s.region ?? '')

    if (s.commonDetail) {
      const cd = s.commonDetail
      setCommonDetail({
        isNas: cd.isNas, ageStatement: cd.ageStatement,
        distilledDate: cd.distilledDate ?? '', bottledDate: cd.bottledDate ?? '',
        releaseDate: cd.releaseDate ?? '', volumeMl: cd.volumeMl?.toString() ?? '',
        abv: cd.abv?.toString() ?? '', bottleNo: cd.bottleNo ?? '',
        batchNo: cd.batchNo ?? '', totalBottles: cd.totalBottles?.toString() ?? '',
      })
    }
    if (s.whiskyDetail) {
      const w = s.whiskyDetail
      setWhiskyDetail({
        style: w.style ?? '', styleOther: w.styleOther ?? '', bottlingType: w.bottlingType ?? '',
        caskType: w.caskType ?? '', maturationStyle: w.maturationStyle ?? '', finishCaskType: w.finishCaskType ?? '',
        isNonChillFiltered: w.isNonChillFiltered ?? false, isNaturalColour: w.isNaturalColour ?? false,
        isSingleCask: w.isSingleCask ?? false, isCaskStrength: w.isCaskStrength ?? false,
        isPeated: w.isPeated ?? false, phenolPpm: w.phenolPpm?.toString() ?? '',
        caskNo: w.caskNo ?? '', finishCaskDetail: w.finishCaskDetail ?? '',
      })
    }
    if (s.wineDetail) {
      const w = s.wineDetail
      setWineDetail({
        wineType: w.wineType ?? '', vintage: w.vintage?.toString() ?? '',
        isOakAged: w.isOakAged ?? false, isNaturalWine: w.isNaturalWine ?? false,
        certification: w.certification ?? '',
        grapeVarieties: (w.grapeVarieties ?? []).map((g) => ({ name: g.name, percentage: g.percentage?.toString() ?? '' })),
        appellationDesignation: w.appellationDesignation ?? '', soilType: w.soilType ?? '',
        altitudeM: w.altitudeM?.toString() ?? '', harvestMethod: w.harvestMethod ?? '',
        fermentationVessel: w.fermentationVessel ?? '', oakType: w.oakType ?? '',
        oakAgedMonths: w.oakAgedMonths?.toString() ?? '',
      })
    }
    if (s.cognacDetail) {
      const c = s.cognacDetail
      setCognacDetail({
        grade: c.grade ?? '', cru: c.cru ?? '',
        isFineChampagne: c.isFineChampagne ?? false, blendDetail: c.blendDetail ?? '',
      })
    }
    if (s.otherDetail) {
      const o = s.otherDetail
      setOtherDetail({
        otherType: o.otherType ?? '', mainIngredient: o.mainIngredient ?? '',
        productionMethod: o.productionMethod ?? '', notes: o.notes ?? '',
      })
    }
  }

  // ── 프리필: 등록 요청(SpiritRegisterRequestDetail, 평탄화 필드) → 폼 ──
  const prefillFromRequest = (r: SpiritRegisterRequestDetail) => {
    setCategory(r.category)
    setNameKo(r.nameKo)
    setNameEn(r.nameEn)
    setProducerId(r.producerId)
    setProducerName(r.producerNameKo ?? '')
    setBottler(r.bottler ?? '')
    setBottledYear(r.bottledYear?.toString() ?? '')
    setVintageYear(r.vintageYear?.toString() ?? '')
    setCountryCode(ISO3166_COUNTRIES.find((c) => c.nameKo === r.country)?.code ?? null)
    setCountry(r.country ?? '')
    setRegion(r.region ?? '')

    setCommonDetail({
      ...DEFAULT_COMMON_DETAIL,
      isNas: r.isNas ?? false, ageStatement: r.ageStatement ?? null,
      distilledDate: r.distilledDate ?? '', bottledDate: r.bottledDate ?? '',
      releaseDate: r.releaseDate ?? '', volumeMl: r.volumeMl?.toString() ?? '',
      abv: r.abv?.toString() ?? '',
    })
    if (r.category === 'WHISKY') {
      setWhiskyDetail({ ...DEFAULT_WHISKY, style: r.whiskyStyle ?? '', styleOther: r.whiskyStyleOther ?? '', caskNo: r.caskNo ?? '' })
    } else if (r.category === 'WINE') {
      setWineDetail({ ...DEFAULT_WINE, wineType: r.wineType ?? '', vintage: r.vintageYear?.toString() ?? '' })
    } else if (r.category === 'COGNAC') {
      setCognacDetail({ ...DEFAULT_COGNAC, grade: r.cognacGrade ?? '' })
    } else if (r.category === 'OTHER') {
      setOtherDetail({ ...DEFAULT_OTHER, otherType: r.otherType ?? '' })
    }
  }

  // ── 검증 (단일 정의) ──
  const validate = (): boolean => {
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

    if (category === 'WHISKY') {
      if (!whiskyDetail.style) errs.style = '스타일을 선택해주세요.'
      else if (whiskyDetail.style === 'OTHER' && !whiskyDetail.styleOther.trim())
        errs.styleOther = '스타일을 직접 입력해주세요.'
    }
    if (category === 'WINE') {
      if (!wineDetail.wineType) errs.wineType = '와인 종류를 선택해주세요.'
      const total = wineDetail.grapeVarieties.reduce((sum, g) => sum + (Number(g.percentage) || 0), 0)
      if (total > 100) errs.grapeVarieties = '포도 품종 비율 합계가 100%를 초과합니다.'
    }
    if (category === 'COGNAC' && !cognacDetail.grade) errs.grade = '등급을 선택해주세요.'
    if (category === 'OTHER' && !otherDetail.otherType) errs.otherType = '주종을 선택해주세요.'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── 페이로드 빌드 (단일 정의) ──
  // 카테고리별 정리: 와인은 빈티지 중심(NAS/숙성년수/증류·병입연월/병·배치 메타 제외),
  //                  꼬냑은 등급 중심(NAS/숙성년수/증류연월 제외)
  const buildCommonPayload = () => {
    const isWine = category === 'WINE'
    const isCognac = category === 'COGNAC'
    const dropAging = isWine || isCognac
    return {
      isNas: dropAging ? false : commonDetail.isNas,
      ageStatement: dropAging || commonDetail.isNas ? null : (commonDetail.ageStatement ?? null),
      distilledDate: dropAging ? null : (commonDetail.distilledDate || null),
      bottledDate: isWine ? null : (commonDetail.bottledDate || null),
      releaseDate: commonDetail.releaseDate || null,
      volumeMl: commonDetail.volumeMl ? Number(commonDetail.volumeMl) : null,
      abv: commonDetail.abv ? Number(commonDetail.abv) : null,
      bottleNo: isWine ? null : (commonDetail.bottleNo || null),
      batchNo: isWine ? null : (commonDetail.batchNo || null),
      totalBottles: isWine ? null : (commonDetail.totalBottles ? Number(commonDetail.totalBottles) : null),
    }
  }

  const buildCategoryPayload = () => {
    switch (category) {
      case 'WHISKY': return {
        whiskyDetail: {
          style: whiskyDetail.style || null,
          styleOther: whiskyDetail.style === 'OTHER' ? (whiskyDetail.styleOther || null) : null,
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

  // 최종 페이로드 (등록/수정/승인 공통). category 보장은 호출 전 validate()로.
  const buildPayload = (): CreateSpiritPayload => {
    const common = buildCommonPayload()
    return {
      nameKo, nameEn, category: category as SpiritCategory,
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
  }

  return {
    category, setCategory, selectCategory,
    nameKo, setNameKo, nameEn, setNameEn,
    producerId, setProducerId, producerName,
    bottler, setBottler, bottledYear, setBottledYear, vintageYear, setVintageYear,
    countryCode, country, region, setCountryValue, setRegion,
    commonDetail, updateCommon,
    whiskyDetail, updateWhisky, wineDetail, updateWine,
    cognacDetail, updateCognac, otherDetail, updateOther,
    errors, setErrors,
    prefillFromSpirit, prefillFromRequest,
    validate, buildPayload,
  }
}

export type SpiritFormApi = ReturnType<typeof useSpiritForm>

// ── 폼 UI (4섹션: 기본 / 생산·병입 / 카테고리 상세 / 공통 상세) ───────
interface SpiritFormFieldsProps {
  form: SpiritFormApi
  /** true면 카테고리 변경 불가 (값만 수정) — 주류 상세 화면용 */
  categoryLocked?: boolean
  /** 카테고리 클릭 가로채기 (수정 모드 경고 모달 등). 미지정 시 form.selectCategory */
  onCategorySelect?: (cat: SpiritCategory) => void
  /** 좌측 컬럼 하단에 끼워 넣을 슬롯 (이미지 관리 카드 등) */
  imageSlot?: React.ReactNode
}

export default function SpiritFormFields({ form, categoryLocked, onCategorySelect, imageSlot }: SpiritFormFieldsProps) {
  const { category, errors } = form
  const handleCategory = onCategorySelect ?? form.selectCategory
  const producerLabel = category ? PRODUCER_LABEL[category] : '증류소'
  const ph = category ? PLACEHOLDERS[category] : DEFAULT_PLACEHOLDER
  const queryClient = useQueryClient()

  // 기타 카테고리 — 목록에 없는 생산자 즉시 직접 생성 후 선택
  const handleCreateProducer = async (data: { nameKo: string; nameEn: string; country: string }) => {
    const res = await adminProducerApi.create({ type: 'OTHER', ...data })
    await queryClient.invalidateQueries({ queryKey: ['producers'] })
    return res.data.data?.id ?? null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ═══ 좌측: ① 기본 / ② 생산·병입 ═══ */}
      <div className="space-y-6">
        <div className={CARD}>
          <SectionTitle step={1} title="카테고리 & 기본 정보" />

          {/* 카테고리 */}
          <div>
            <label className={LABEL}>
              카테고리 <span className="text-red-400">*</span>
              {categoryLocked && <span className="ml-1.5 text-[11px] text-neutral-400 font-normal">(고정 — 변경 불가)</span>}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map(([cat, label, emoji]) => {
                const selected = category === cat
                if (categoryLocked && !selected) return null
                return (
                  <button key={cat} type="button"
                    onClick={() => !categoryLocked && handleCategory(cat)}
                    disabled={categoryLocked}
                    className={`py-4 rounded-xl border-2 text-sm font-semibold transition-all flex flex-col items-center gap-1.5 ${
                      selected
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-amber-300 hover:bg-amber-50/50'
                    } ${categoryLocked ? 'cursor-default col-span-2 sm:col-span-4' : ''}`}>
                    <span className="text-2xl leading-none">{emoji}</span>
                    {label}
                  </button>
                )
              })}
            </div>
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
          </div>

          {/* 이름 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>영어 이름 <span className="text-red-400">*</span></label>
              <input value={form.nameEn} onChange={(e) => form.setNameEn(e.target.value)} maxLength={200}
                placeholder={ph.nameEn}
                className={`${INPUT} ${errors.nameEn ? 'border-red-400' : ''}`} />
              {errors.nameEn && <p className="text-xs text-red-500 mt-1">{errors.nameEn}</p>}
            </div>
            <div>
              <label className={LABEL}>한국어 이름 <span className="text-red-400">*</span></label>
              <input value={form.nameKo} onChange={(e) => form.setNameKo(e.target.value)} maxLength={200}
                placeholder={ph.nameKo}
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
                  <input type="number" step="0.1" min="0" max="100" value={form.commonDetail.abv}
                    onChange={(e) => {
                      let val = e.target.value
                      const num = parseFloat(val)
                      if (!isNaN(num) && num > 100) val = '100'
                      else if (!isNaN(num) && num < 0) val = '0'
                      form.updateCommon({ abv: val })
                    }}
                    className={`${INPUT} pr-8 ${errors.abv ? 'border-red-400' : ''}`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
                </div>
                {errors.abv && <p className="text-xs text-red-500 mt-1">{errors.abv}</p>}
              </div>
              <div>
                <label className={LABEL}>용량 <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type="number" min="1" max="100000" value={form.commonDetail.volumeMl}
                    onChange={(e) => form.updateCommon({ volumeMl: e.target.value })}
                    className={`${INPUT} pr-10 ${errors.volumeMl ? 'border-red-400' : ''}`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">ml</span>
                </div>
                {errors.volumeMl && <p className="text-xs text-red-500 mt-1">{errors.volumeMl}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ② 생산 / 병입 */}
        {category && (
          <div className={CARD}>
            <SectionTitle step={2} title="생산 / 병입 정보" hint="선택" />
            <div>
              <label className={LABEL}>{producerLabel}</label>
              <AdminProducerSelector value={form.producerId} defaultName={form.producerName}
                onChange={(id, producer) => {
                  form.setProducerId(id ?? null)
                  // 생산자에 국가/지역이 있으면 자동으로 채움 (없으면 기존 값 유지)
                  if (producer?.country) {
                    const code = ISO3166_COUNTRIES.find((c) => c.nameKo === producer.country)?.code ?? null
                    form.setCountryValue(code, producer.country)
                    form.setRegion(producer.region ?? '')
                  }
                }}
                type={CATEGORY_TO_PRODUCER_TYPE[category]}
                onCreateNew={handleCreateProducer}
                defaultCountry={ISO3166_COUNTRIES.find((c) => c.code === form.countryCode)?.nameKo ?? ''} />
            </div>
            <div>
              <label className={LABEL}>국가 / 지역</label>
              <CountryRegionSelector
                countryCode={form.countryCode} regionNameKo={form.region}
                onCountryChange={form.setCountryValue}
                onRegionChange={form.setRegion}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>병입업체</label>
                <input value={form.bottler} onChange={(e) => form.setBottler(e.target.value)} maxLength={200}
                  placeholder={ph.bottler} className={INPUT} />
              </div>
              {category === 'WINE' ? (
                <div>
                  <label className={LABEL}>빈티지 연도</label>
                  <input type="number" min={1800} max={2100} value={form.vintageYear}
                    onChange={(e) => form.setVintageYear(e.target.value)} className={INPUT} />
                </div>
              ) : (
                <div>
                  <label className={LABEL}>병입 연도</label>
                  <input type="number" min={1800} max={2100} value={form.bottledYear}
                    onChange={(e) => form.setBottledYear(e.target.value)} className={INPUT} />
                </div>
              )}
            </div>
          </div>
        )}

        {imageSlot}
      </div>

      {/* ═══ 우측: ③ 카테고리 상세 / ④ 공통 상세 ═══ */}
      <div className="space-y-6">
        {!category ? (
          <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 py-12 text-center">
            <p className="text-sm text-neutral-400">카테고리를 먼저 선택하면 상세 입력 항목이 표시됩니다.</p>
          </div>
        ) : (
          <>
            <div className={CARD}>
              <SectionTitle step={3} title={`${CATEGORY_LABEL[category]} 상세`} />
              {category === 'WHISKY' && (
                <WhiskyDetailSection value={form.whiskyDetail} onChange={form.updateWhisky} errors={errors} />
              )}
              {category === 'WINE' && (
                <WineDetailSection value={form.wineDetail} onChange={form.updateWine} errors={errors} />
              )}
              {category === 'COGNAC' && (
                <CognacDetailSection value={form.cognacDetail} onChange={form.updateCognac} errors={errors} />
              )}
              {category === 'OTHER' && (
                <OtherDetailSection value={form.otherDetail} onChange={form.updateOther} errors={errors} />
              )}
            </div>

            <div className={CARD}>
              <SectionTitle step={4} title="공통 상세 정보" hint="선택" />
              <SpiritCommonDetailSection
                value={form.commonDetail}
                onChange={form.updateCommon}
                dateErrors={{ distilledDate: errors.distilledDate, bottledDate: errors.bottledDate }}
                category={category}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
