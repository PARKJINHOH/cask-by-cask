import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import AdminProducerSelector from '@/domain/producer/components/AdminProducerSelector'
import { adminProducerApi } from '@/domain/admin/api/adminProducerApi'
import { CATEGORY_TO_PRODUCER_TYPE } from '@/domain/producer/types/producer.types'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import InfoTooltip from '@/shared/components/InfoTooltip'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import type {
  AdminSpiritDetail, CreateSpiritPayload, SpiritRegisterRequestDetail,
  CreateVariantRequest, SpiritCommonDetailRequest, WhiskyDetailRequest,
} from '@/domain/admin/types/admin.types'
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
export const CATEGORIES: Array<[SpiritCategory, string]> = [
  ['WHISKY', '위스키'],
  ['COGNAC', '꼬냑'],
  ['WINE',   '와인'],
  ['OTHER',  '기타'],
]
export const WHISKY_STYLES = [
  ['SINGLE_MALT', '싱글 몰트'],
  ['BLENDED_MALT', '블렌디드 몰트'],
  ['BLENDED_WHISKY', '블렌디드'],
  ['BOURBON', '버번'],
  ['WHEATED_BOURBON', '밀 버번'],
  ['TENNESSEE', '테네시'],
  ['RYE', '라이'],
  ['POT_STILL', '싱글 팟 스틸'],
  ['GRAIN_CORN', '그레인 / 콘'],
  ['OTHER', '기타'],
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

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <h2 className="text-sm font-bold text-neutral-800">{title}</h2>
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
    </div>
  )
}

const LEGACY_CASK_MAP: Record<string, { parent: string; label: string }> = {
  EX_FINO: { parent: 'EX_SHERRY', label: '피노 셰리 캐스크' },
  EX_MANZANILLA: { parent: 'EX_SHERRY', label: '만자니야 셰리 캐스크' },
  EX_AMONTILLADO: { parent: 'EX_SHERRY', label: '아몬티야도 셰리 캐스크' },
  EX_OLOROSO: { parent: 'EX_SHERRY', label: '올로로소 셰리 캐스크' },
  EX_PALO_CORTADO: { parent: 'EX_SHERRY', label: '팔로 코르타도 셰리 캐스크' },
  EX_PX: { parent: 'EX_SHERRY', label: 'PX(페드로 히메네스) 셰리 캐스크' },

  EX_MADEIRA: { parent: 'EX_PORT', label: '마데이라 와인 캐스크' },
  EX_SAUTERNES: { parent: 'EX_PORT', label: '소테른 와인 캐스크' },
  EX_MARSALA: { parent: 'EX_PORT', label: '마르살라 와인 캐스크' },
  EX_MALAGA: { parent: 'EX_PORT', label: '말라가 와인 캐스크' },
  EX_TOKAJI: { parent: 'EX_PORT', label: '토카이 와인 캐스크' },
  EX_VERMOUTH: { parent: 'EX_PORT', label: '베르무트 캐스크' },

  VINO_BARRIQUE: { parent: 'EX_WINE', label: '비노 바리끄' },

  EX_BRANDY: { parent: 'EX_COGNAC', label: '브랜디 캐스크' },
  EX_ARMAGNAC: { parent: 'EX_COGNAC', label: '아르마냑 캐스크' },
  EX_MEZCAL_TEQUILA: { parent: 'OTHER', label: '메스칼/데킬라 캐스크' },
  EX_UMESHU: { parent: 'OTHER', label: '매실주(우메슈) 캐스크' },
  TEAK_WOOD: { parent: 'OTHER', label: '티크우드' },
  PEATED_CASK: { parent: 'OTHER', label: '피티드 캐스크' },
  FRENCH_OAK: { parent: 'NEW_OAK', label: '프렌치 오크' },
  CHINKAPIN: { parent: 'NEW_OAK', label: '친카핀 오크' },
}

const VALID_BROAD_CATEGORIES = new Set([
  'EX_BOURBON', 'EX_SHERRY', 'EX_WINE', 'EX_PORT', 'EX_RUM',
  'EX_COGNAC', 'EX_CALVADOS', 'EX_BEER', 'MIZUNARA', 'NEW_OAK', 'OTHER'
])

function migrateLegacyCasks(
  caskTypes: string[],
  caskFinishes: string[],
  caskDetails?: Record<string, string[]> | null
) {
  if (caskDetails && Object.keys(caskDetails).length > 0) {
    return {
      caskTypes: caskTypes.filter(c => VALID_BROAD_CATEGORIES.has(c)),
      caskFinishes: caskFinishes.filter(c => VALID_BROAD_CATEGORIES.has(c)),
      caskDetails
    }
  }

  const migratedTypes: string[] = []
  const migratedFinishes: string[] = []
  const migratedDetails: Record<string, string[]> = {}

  const addDetail = (parent: string, label: string, isFinish: boolean) => {
    if (!migratedTypes.includes(parent)) {
      migratedTypes.push(parent)
    }
    if (isFinish && !migratedFinishes.includes(parent)) {
      migratedFinishes.push(parent)
    }
    if (!migratedDetails[parent]) {
      migratedDetails[parent] = []
    }
    if (!migratedDetails[parent].includes(label)) {
      migratedDetails[parent].push(label)
    }
  }

  caskTypes.forEach((c) => {
    const isFinish = caskFinishes.includes(c)
    const legacy = LEGACY_CASK_MAP[c]
    if (legacy) {
      addDetail(legacy.parent, legacy.label, isFinish)
    } else if (VALID_BROAD_CATEGORIES.has(c)) {
      if (!migratedTypes.includes(c)) {
        migratedTypes.push(c)
      }
      if (isFinish && !migratedFinishes.includes(c)) {
        migratedFinishes.push(c)
      }
      if (!migratedDetails[c]) {
        migratedDetails[c] = []
      }
    } else {
      addDetail('OTHER', c, isFinish)
    }
  })

  migratedTypes.forEach((c) => {
    if (!migratedDetails[c] || migratedDetails[c].length === 0) {
      migratedDetails[c] = ['']
    }
  })

  return {
    caskTypes: migratedTypes,
    caskFinishes: migratedFinishes,
    caskDetails: migratedDetails
  }
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

  // 하위 에디션 관련 상태
  const [isVariantSplit, setIsVariantSplit] = useState(false)
  const [variants, setVariants] = useState<CreateVariantRequest[]>([])

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        variantType: 'BATCH',
        variantValue: '',
        abv: null,
        abvMin: null,
        abvMax: null,
        volumeMl: null,
        commonDetail: {
          isNas: false,
          ageStatement: null,
          ageStatementMin: null,
          ageStatementMax: null,
          distilledDate: null,
          bottledDate: null,
          releaseDate: null,
          volumeMl: null,
          abv: null,
          bottleNo: null,
          batchNo: null,
          totalBottles: null,
        },
        whiskyDetail: {
          style: null,
          styleOther: null,
          brandName: null,
          bottlingType: null,
          caskTypes: [],
          caskFinishes: [],
          caskTypeOther: null,
          caskDetails: {},
          isNonChillFiltered: null,
          isNaturalColour: null,
          isSingleCask: category === 'WHISKY' ? (whiskyDetail.isSingleCask ?? false) : false,
          isCaskStrength: category === 'WHISKY' ? (whiskyDetail.isCaskStrength ?? false) : false,
          isPeated: null,
          phenolPpm: null,
          phenolPpmMin: null,
          phenolPpmMax: null,
          caskNo: null,
          notes: null,
        },
      },
    ])
  }

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  const updateVariant = (index: number, updates: Partial<CreateVariantRequest>) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...updates } : v))
    )
  }

  const updateVariantCommon = (index: number, updates: Partial<SpiritCommonDetailRequest>) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === index
          ? { ...v, commonDetail: { ...v.commonDetail, ...updates } }
          : v
      )
    )
  }

  const updateVariantWhisky = (index: number, updates: Partial<WhiskyDetailRequest>) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === index
          ? { ...v, whiskyDetail: { ...v.whiskyDetail, ...updates } }
          : v
      )
    )
  }
  
  // 마스터 도수 범위 지정을 위한 상태
  const [isAbvRange, setIsAbvRange] = useState(false)
  const [abvMin, setAbvMin] = useState('')
  const [abvMax, setAbvMax] = useState('')

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

    // 에디션 및 도수 범위 지정 프리필
    setIsVariantSplit(!!(s.variants && s.variants.length > 0))
    setVariants(
      (s.variants ?? []).map((v) => ({
        variantType: (v.variantType && v.variantType !== 'NONE') ? v.variantType : 'BATCH',
        variantValue: v.variantValue ?? '',
        abv: v.abv,
        abvMin: v.abvMin,
        abvMax: v.abvMax,
        volumeMl: v.volumeMl,
        // DTO 데이터 변환
        commonDetail: v.commonDetail ? {
          isNas: v.commonDetail.isNas,
          ageStatement: v.commonDetail.ageStatement,
          ageStatementMin: v.commonDetail.ageStatementMin,
          ageStatementMax: v.commonDetail.ageStatementMax,
          distilledDate: v.commonDetail.distilledDate,
          bottledDate: v.commonDetail.bottledDate,
          releaseDate: v.commonDetail.releaseDate,
          volumeMl: v.commonDetail.volumeMl,
          abv: v.commonDetail.abv,
          bottleNo: v.commonDetail.bottleNo,
          batchNo: v.commonDetail.batchNo,
          totalBottles: v.commonDetail.totalBottles,
        } : undefined,
        // WhiskyDetail DTO 변환
        whiskyDetail: v.whiskyDetail ? {
          style: v.whiskyDetail.style,
          styleOther: v.whiskyDetail.styleOther,
          brandName: v.whiskyDetail.brandName,
          bottlingType: v.whiskyDetail.bottlingType,
          caskTypes: v.whiskyDetail.caskTypes,
          caskFinishes: v.whiskyDetail.caskFinishes,
          caskTypeOther: v.whiskyDetail.caskTypeOther,
          caskDetails: v.whiskyDetail.caskDetails,
          isNonChillFiltered: v.whiskyDetail.isNonChillFiltered,
          isNaturalColour: v.whiskyDetail.isNaturalColour,
          isSingleCask: v.whiskyDetail.isSingleCask,
          isCaskStrength: v.whiskyDetail.isCaskStrength,
          isPeated: v.whiskyDetail.isPeated,
          phenolPpm: v.whiskyDetail.phenolPpm,
          phenolPpmMin: v.whiskyDetail.phenolPpmMin,
          phenolPpmMax: v.whiskyDetail.phenolPpmMax,
          caskNo: v.whiskyDetail.caskNo,
          notes: v.whiskyDetail.notes,
        } : undefined,
      }))
    )

    if (s.abvMin != null || s.abvMax != null) {
      setIsAbvRange(true)
      setAbvMin(s.abvMin?.toString() ?? '')
      setAbvMax(s.abvMax?.toString() ?? '')
    } else {
      setIsAbvRange(false)
      setAbvMin('')
      setAbvMax('')
    }

    if (s.commonDetail) {
      const cd = s.commonDetail
      setCommonDetail({
        isNas: cd.isNas, ageStatement: cd.ageStatement,
        ageStatementMin: cd.ageStatementMin, ageStatementMax: cd.ageStatementMax,
        distilledDate: cd.distilledDate ?? '', bottledDate: cd.bottledDate ?? '',
        releaseDate: cd.releaseDate ?? '', volumeMl: cd.volumeMl?.toString() ?? '',
        abv: cd.abv?.toString() ?? '', bottleNo: cd.bottleNo ?? '',
        batchNo: cd.batchNo ?? '', totalBottles: cd.totalBottles?.toString() ?? '',
      })
    }
    if (s.whiskyDetail) {
      const w = s.whiskyDetail
      const migrated = migrateLegacyCasks(w.caskTypes ?? [], w.caskFinishes ?? [], w.caskDetails)
      setWhiskyDetail({
        style: w.style ?? '', styleOther: w.styleOther ?? '', brandName: w.brandName ?? '', bottlingType: w.bottlingType ?? '',
        caskTypes: migrated.caskTypes,
        caskFinishes: migrated.caskFinishes,
        caskDetails: migrated.caskDetails,
        caskTypeOther: w.caskTypeOther ?? '',
        isNonChillFiltered: w.isNonChillFiltered ?? false, isNaturalColour: w.isNaturalColour ?? false,
        isSingleCask: w.isSingleCask ?? false, isCaskStrength: w.isCaskStrength ?? false,
        isPeated: w.isPeated ?? false, phenolPpm: w.phenolPpm?.toString() ?? '',
        phenolPpmMin: w.phenolPpmMin?.toString() ?? '', phenolPpmMax: w.phenolPpmMax?.toString() ?? '',
        caskNo: w.caskNo ?? '', notes: w.notes ?? '',
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
      ageStatementMin: null, ageStatementMax: null,
      distilledDate: r.distilledDate ?? '', bottledDate: r.bottledDate ?? '',
      releaseDate: r.releaseDate ?? '', volumeMl: r.volumeMl?.toString() ?? '',
      abv: r.abv?.toString() ?? '',
    })
    if (r.category === 'WHISKY') {
      setWhiskyDetail({ ...DEFAULT_WHISKY, style: r.whiskyStyle ?? '', styleOther: r.whiskyStyleOther ?? '', caskNo: r.caskNo ?? '', notes: r.whiskyNotes ?? '' })
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

    // 도수 범위 지정 여부에 따른 검증
    if (isAbvRange) {
      if (!abvMin) errs.abvMin = '최소 도수는 필수입니다.'
      else if (Number(abvMin) < 0 || Number(abvMin) > 100) errs.abvMin = '도수는 0~100 사이여야 합니다.'
      if (!abvMax) errs.abvMax = '최대 도수는 필수입니다.'
      else if (Number(abvMax) < 0 || Number(abvMax) > 100) errs.abvMax = '도수는 0~100 사이여야 합니다.'
      if (abvMin && abvMax && Number(abvMin) > Number(abvMax)) errs.abvMin = '최소 도수가 최대 도수보다 큽니다.'
    } else {
      if (!commonDetail.abv) errs.abv = '알코올 도수는 필수입니다.'
      else if (Number(commonDetail.abv) < 0 || Number(commonDetail.abv) > 100)
        errs.abv = '도수는 0~100 사이여야 합니다.'
    }

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

    // 하위 에디션 검증
    if (isVariantSplit) {
      variants.forEach((v, idx) => {
        if (!v.variantValue.trim()) {
          errs[`variantValue_${idx}`] = '에디션 식별 값은 필수입니다.'
        }
        if (v.abvMin && v.abvMax && Number(v.abvMin) > Number(v.abvMax)) {
          errs[`variantAbvMin_${idx}`] = '최소 도수가 최대 도수보다 큽니다.'
        }
      })
    }

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
      ageStatementMin: dropAging || commonDetail.isNas ? null : (commonDetail.ageStatementMin ?? null),
      ageStatementMax: dropAging || commonDetail.isNas ? null : (commonDetail.ageStatementMax ?? null),
      distilledDate: dropAging ? null : (commonDetail.distilledDate || null),
      bottledDate: isWine ? null : (commonDetail.bottledDate || null),
      releaseDate: commonDetail.releaseDate || null,
      volumeMl: commonDetail.volumeMl ? Number(commonDetail.volumeMl) : null,
      abv: isAbvRange ? (abvMin ? Number(abvMin) : null) : (commonDetail.abv ? Number(commonDetail.abv) : null),
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
          brandName: whiskyDetail.brandName || null,
          bottlingType: whiskyDetail.bottlingType || null,
          caskTypes: whiskyDetail.caskTypes,
          caskFinishes: whiskyDetail.caskFinishes.filter((c) => whiskyDetail.caskTypes.includes(c)),
          caskTypeOther: whiskyDetail.caskTypes.includes('OTHER') ? (whiskyDetail.caskTypeOther || null) : null,
          caskDetails: Object.fromEntries(
              Object.entries(whiskyDetail.caskDetails || {}).map(([k, v]) => [
                k,
                v.filter((str) => str.trim() !== '')
              ]).filter(([_, v]) => v.length > 0)
          ),
          isNonChillFiltered: whiskyDetail.isNonChillFiltered || null,
          isNaturalColour: whiskyDetail.isNaturalColour || null,
          isSingleCask: whiskyDetail.isSingleCask || null,
          isCaskStrength: whiskyDetail.isCaskStrength || null,
          isPeated: whiskyDetail.isPeated || null,
          phenolPpm: whiskyDetail.isPeated && whiskyDetail.phenolPpm ? Number(whiskyDetail.phenolPpm) : null,
          phenolPpmMin: whiskyDetail.isPeated && whiskyDetail.phenolPpmMin ? Number(whiskyDetail.phenolPpmMin) : null,
          phenolPpmMax: whiskyDetail.isPeated && whiskyDetail.phenolPpmMax ? Number(whiskyDetail.phenolPpmMax) : null,
          caskNo: whiskyDetail.caskNo || null,
          notes: whiskyDetail.notes || null,
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
      isVariantSplit,
      variants: isVariantSplit ? variants : [],
      variantType: 'NONE',
      variantValue: null,
      abvMin: isAbvRange ? (abvMin ? Number(abvMin) : null) : null,
      abvMax: isAbvRange ? (abvMax ? Number(abvMax) : null) : null,
      ...buildCategoryPayload(),
    }
  }

  return {
    category, setCategory, selectCategory,
    nameKo, setNameKo, nameEn, setNameEn,
    producerId, setProducerId, producerName,
    bottler, setBottler, bottledYear, setBottledYear, vintageYear, setVintageYear,
    countryCode, country, region, setCountryValue, setRegion,
    isVariantSplit, setIsVariantSplit, variants, setVariants,
    addVariant, removeVariant, updateVariant, updateVariantCommon, updateVariantWhisky,
    isAbvRange, setIsAbvRange, abvMin, setAbvMin, abvMax, setAbvMax,
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
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* ═══ 좌측: ① 기본 / ② 생산·병입 / ④ 공통 상세 + 이미지 ═══ */}
      <div className="lg:col-span-2 space-y-6">
        <div className={CARD}>
          <SectionTitle title="카테고리 & 기본 정보" />

          {/* 카테고리 */}
          <div>
            <label className={LABEL}>
              카테고리 <span className="text-red-400">*</span>
              {categoryLocked && <span className="ml-1.5 text-[11px] text-neutral-400 font-normal">(고정 — 변경 불가)</span>}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map(([cat, label]) => {
                const selected = category === cat
                if (categoryLocked && !selected) return null
                return (
                  <button key={cat} type="button"
                    onClick={() => !categoryLocked && handleCategory(cat)}
                    disabled={categoryLocked}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center ${
                      selected
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-neutral-200 text-neutral-600 hover:border-amber-300 hover:bg-amber-50/50'
                    } ${categoryLocked ? 'cursor-default col-span-2 sm:col-span-4' : ''}`}>
                    {label}
                  </button>
                )
              })}
            </div>
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
          </div>

          {/* 이름 */}
          <div className="space-y-4">
            <div>
              <label className={LABEL}>한국어 이름 <span className="text-red-400">*</span></label>
              <input value={form.nameKo} onChange={(e) => form.setNameKo(e.target.value)} maxLength={200}
                placeholder={ph.nameKo}
                className={`${INPUT} ${errors.nameKo ? 'border-red-400' : ''}`} />
              {errors.nameKo && <p className="text-xs text-red-500 mt-1">{errors.nameKo}</p>}
            </div>
            <div>
              <label className={LABEL}>영어 이름 <span className="text-red-400">*</span></label>
              <input value={form.nameEn} onChange={(e) => form.setNameEn(e.target.value)} maxLength={200}
                placeholder={ph.nameEn}
                className={`${INPUT} ${errors.nameEn ? 'border-red-400' : ''}`} />
              {errors.nameEn && <p className="text-xs text-red-500 mt-1">{errors.nameEn}</p>}
            </div>
          </div>

          {/* 필수 규격 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
            <p className="text-xs font-semibold text-amber-700">필수 규격</p>
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-neutral-600 mb-0">알코올 도수 <span className="text-red-400">*</span></label>
                  <label className="flex items-center gap-1 text-[11px] text-neutral-500 cursor-pointer select-none">
                    <input type="checkbox" checked={form.isAbvRange} onChange={(e) => form.setIsAbvRange(e.target.checked)} className="accent-amber-500 rounded" />
                    범위 지정
                  </label>
                </div>
                {form.isAbvRange ? (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input type="number" step="0.1" min="0" max="100" value={form.abvMin}
                         onChange={(e) => form.setAbvMin(e.target.value)}
                         placeholder="최소"
                         className={`${INPUT} pr-8 ${errors.abvMin ? 'border-red-400' : ''}`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
                    </div>
                    <span className="text-neutral-400">~</span>
                    <div className="relative flex-1">
                      <input type="number" step="0.1" min="0" max="100" value={form.abvMax}
                         onChange={(e) => form.setAbvMax(e.target.value)}
                         placeholder="최대"
                         className={`${INPUT} pr-8 ${errors.abvMax ? 'border-red-400' : ''}`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
                    </div>
                  </div>
                ) : (
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
                )}
                {(errors.abv || errors.abvMin || errors.abvMax) && (
                  <p className="text-xs text-red-500 mt-1">{errors.abv || errors.abvMin || errors.abvMax}</p>
                )}
              </div>
              <div className="col-span-2">
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
          {/* 위스키 전용 기본 정보: 스타일 & 병입 구분 */}
          {category === 'WHISKY' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
              {/* 스타일 */}
              <div>
                <label className={LABEL}>스타일 <span className="text-red-400">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {WHISKY_STYLES.map(([v, l]) => (
                    <label key={v} className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                      <input type="radio" value={v} checked={form.whiskyDetail.style === v}
                        onChange={() => form.updateWhisky({ style: v })} className="accent-amber-500" />
                      {l}
                    </label>
                  ))}
                </div>
                {errors.style && <p className="text-xs text-red-500 mt-1">{errors.style}</p>}
                {/* '기타' 선택 시 직접 입력 */}
                {form.whiskyDetail.style === 'OTHER' && (
                  <div className="mt-2">
                    <input type="text" value={form.whiskyDetail.styleOther} maxLength={100}
                      onChange={(e) => form.updateWhisky({ styleOther: e.target.value })}
                      placeholder="예) 라이트 위스키, 싱글 그레인 등"
                      className={`${INPUT} ${errors.styleOther ? 'border-red-400' : ''}`} />
                    {errors.styleOther && <p className="text-xs text-red-500 mt-1">{errors.styleOther}</p>}
                  </div>
                )}
              </div>

              {/* 병입 구분 */}
              <div>
                <label className={LABEL}>
                  병입 구분
                  <InfoTooltip text="OB(Official Bottling): 증류소 직접 병입 / IB(Independent Bottling): 독립 병입사 병입" />
                </label>
                <div className="flex gap-4">
                  {[['OB', 'OB (증류소 직접)'], ['IB', 'IB (독립 병입)']].map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer text-xs">
                      <input type="radio" value={v} checked={form.whiskyDetail.bottlingType === v}
                        onChange={() => form.updateWhisky({ bottlingType: v })} className="accent-amber-500" />
                      {l}
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="radio" value="" checked={!form.whiskyDetail.bottlingType}
                      onChange={() => form.updateWhisky({ bottlingType: '' })} className="accent-amber-500" />
                    미지정
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* ② 생산 / 병입 */}
        {category && (
          <div className={CARD}>
            <SectionTitle title="생산 / 병입 정보" hint="선택" />
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
            {category === 'WHISKY' && (
              <div>
                <label className={LABEL}>
                  브랜드명
                  <InfoTooltip text="블렌디드 위스키 등 증류소와 별개의 상업적 브랜드명. 예) 시바스리갈, 조니워커, 발렌타인, 페이머스 그라우스" />
                </label>
                <input value={form.whiskyDetail.brandName}
                  onChange={(e) => form.updateWhisky({ brandName: e.target.value })} maxLength={200}
                  placeholder="예) Chivas Regal, Johnnie Walker, Ballantine's"
                  className={INPUT} />
              </div>
            )}
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

        {/* ④ 공통 상세 정보 */}
        {category && (
          <div className={CARD}>
            <SectionTitle title="공통 상세 정보" hint="선택" />
            <SpiritCommonDetailSection
              value={form.commonDetail}
              onChange={form.updateCommon}
              dateErrors={{ distilledDate: errors.distilledDate, bottledDate: errors.bottledDate }}
              category={category}
            />
          </div>
        )}

        {imageSlot}
      </div>

      {/* ═══ 우측: ③ 카테고리 상세 및 에디션 (넓게) ═══ */}
      <div className="lg:col-span-3 space-y-6">
        {!category ? (
          <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 py-12 text-center">
            <p className="text-sm text-neutral-400">카테고리를 먼저 선택하면 상세 입력 항목이 표시됩니다.</p>
          </div>
        ) : (
          <>
            {/* 하위 에디션 설정 카드 */}
            {category && (
              <div className={CARD}>
                <div className="flex items-center justify-between">
                  <SectionTitle title="하위 에디션 분리 등록" hint="배치 / 싱글 캐스크 / 연도별 정보 분화" />
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.isVariantSplit}
                      onChange={(e) => {
                        form.setIsVariantSplit(e.target.checked)
                        if (e.target.checked && form.variants.length === 0) {
                          form.addVariant()
                        }
                      }}
                      className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                    />
                    <span className="text-xs font-semibold text-neutral-600">활성화</span>
                  </label>
                </div>

                {form.isVariantSplit && (
                  <div className="space-y-4 pt-2 border-t border-neutral-100">
                    {form.variants.map((v, idx) => (
                      <VariantItemCard
                        key={idx}
                        index={idx}
                        variant={v}
                        category={category}
                        errors={errors}
                        onUpdate={(updates) => form.updateVariant(idx, updates)}
                        onUpdateCommon={(updates) => form.updateVariantCommon(idx, updates)}
                        onUpdateWhisky={(updates) => form.updateVariantWhisky(idx, updates)}
                        onRemove={() => form.removeVariant(idx)}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={form.addVariant}
                      className="w-full py-3 border-2 border-dashed border-neutral-200 hover:border-amber-400 hover:bg-amber-50/20 text-neutral-500 hover:text-amber-700 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      에디션 추가
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 카테고리별 상세 카드 */}
            <div className={CARD}>
              <SectionTitle title={`${CATEGORY_LABEL[category]} 상세`} />
              {category === 'WHISKY' && (
                <WhiskyDetailSection value={form.whiskyDetail} onChange={form.updateWhisky} />
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
          </>
        )}
      </div>
    </div>
  )
}

interface VariantItemCardProps {
  index: number
  variant: CreateVariantRequest
  category: SpiritCategory
  errors: Record<string, string>
  onUpdate: (updates: Partial<CreateVariantRequest>) => void
  onUpdateCommon: (updates: Partial<SpiritCommonDetailRequest>) => void
  onUpdateWhisky: (updates: Partial<WhiskyDetailRequest>) => void
  onRemove: () => void
}

function VariantItemCard({
  index,
  variant,
  category,
  errors,
  onUpdate,
  onUpdateCommon,
  onUpdateWhisky,
  onRemove,
}: VariantItemCardProps) {
  const [isAbvRange, setIsAbvRange] = useState(variant.abvMin != null || variant.abvMax != null)
  const [isOpen, setIsOpen] = useState(true)

  const handleAbvRangeToggle = (checked: boolean) => {
    setIsAbvRange(checked)
    if (!checked) {
      onUpdate({ abvMin: null, abvMax: null })
    } else {
      onUpdate({ abv: null })
    }
  }

  return (
    <div className="bg-neutral-50 rounded-xl border border-neutral-200 shadow-sm overflow-hidden text-left">
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-100/60 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-neutral-600 bg-neutral-200 px-2.5 py-0.5 rounded-full">
            #{index + 1}
          </span>
          <span className="text-sm font-bold text-neutral-800">
            {variant.variantValue ? `${variant.variantValue}` : '새 에디션'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200/50 rounded-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-neutral-200/50 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 mb-1">에디션 유형 <span className="text-red-400">*</span></label>
              <select
                value={variant.variantType}
                onChange={(e) => onUpdate({ variantType: e.target.value as any })}
                className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="BATCH">배치 (BATCH)</option>
                <option value="RELEASE_YEAR">출시 연도 (RELEASE_YEAR)</option>
                <option value="SINGLE_CASK">싱글 캐스크 (SINGLE_CASK)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-neutral-500 mb-1">식별 값 <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={variant.variantValue}
                onChange={(e) => onUpdate({ variantValue: e.target.value })}
                placeholder={
                  variant.variantType === 'BATCH'
                    ? '예) Batch 11'
                    : variant.variantType === 'RELEASE_YEAR'
                    ? '예) 2024 Release'
                    : '예) Cask #1234'
                }
                className={`w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white ${
                  errors[`variantValue_${index}`] ? 'border-red-400' : ''
                }`}
              />
              {errors[`variantValue_${index}`] && (
                <p className="text-[10px] text-red-500 mt-1">{errors[`variantValue_${index}`]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-neutral-500 mb-0">알코올 도수</label>
                <label className="flex items-center gap-1 text-[10px] text-neutral-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAbvRange}
                    onChange={(e) => handleAbvRangeToggle(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  범위 지정
                </label>
              </div>
              {isAbvRange ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={variant.abvMin ?? ''}
                      onChange={(e) => onUpdate({ abvMin: e.target.value === '' ? null : Number(e.target.value) })}
                      placeholder="최소"
                      className={`w-full px-2.5 py-1.5 pr-6 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white ${
                        errors[`variantAbvMin_${index}`] ? 'border-red-400' : ''
                      }`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 pointer-events-none">%</span>
                  </div>
                  <span className="text-neutral-400">~</span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={variant.abvMax ?? ''}
                      onChange={(e) => onUpdate({ abvMax: e.target.value === '' ? null : Number(e.target.value) })}
                      placeholder="최대"
                      className="w-full px-2.5 py-1.5 pr-6 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 pointer-events-none">%</span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={variant.abv ?? ''}
                    onChange={(e) => onUpdate({ abv: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="예) 46.3"
                    className="w-full px-2.5 py-1.5 pr-6 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 pointer-events-none">%</span>
                </div>
              )}
              {errors[`variantAbvMin_${index}`] && (
                <p className="text-[10px] text-red-500 mt-1">{errors[`variantAbvMin_${index}`]}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-500 mb-1">용량 (ml)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={variant.volumeMl ?? ''}
                  onChange={(e) => onUpdate({ volumeMl: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="예) 700"
                  className="w-full px-2.5 py-1.5 pr-8 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 pointer-events-none">ml</span>
              </div>
            </div>
          </div>

          {category === 'WHISKY' && (
            <div className="pt-3 border-t border-neutral-200 space-y-3">
              <div className="flex items-center gap-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">위스키 하위 에디션 특화 설정 (선택)</p>
                <InfoTooltip text="위스키 기본 정보의 설정값(싱글 캐스크, 캐스크 스트렝스)을 기본적으로 상속받아 세팅합니다. 이 에디션만 다른 특성을 가진 경우 개별적으로 변경할 수 있습니다." />
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={!!variant.whiskyDetail?.isSingleCask}
                    onChange={(e) => onUpdateWhisky({ isSingleCask: e.target.checked })}
                    className="w-3.5 h-3.5 accent-amber-500"
                  />
                  싱글 캐스크
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={!!variant.whiskyDetail?.isCaskStrength}
                    onChange={(e) => onUpdateWhisky({ isCaskStrength: e.target.checked })}
                    className="w-3.5 h-3.5 accent-amber-500"
                  />
                  캐스크 스트렝스
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 mb-1">캐스크 번호 (caskNo)</label>
                  <input
                    type="text"
                    value={variant.whiskyDetail?.caskNo ?? ''}
                    onChange={(e) => onUpdateWhisky({ caskNo: e.target.value })}
                    placeholder="예) #1042"
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 mb-1">배치 번호 (batchNo)</label>
                  <input
                    type="text"
                    value={variant.commonDetail?.batchNo ?? ''}
                    onChange={(e) => onUpdateCommon({ batchNo: e.target.value })}
                    placeholder="예) Batch 11"
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 mb-1">증류 연월</label>
                  <input
                    type="text"
                    value={variant.commonDetail?.distilledDate ?? ''}
                    onChange={(e) => onUpdateCommon({ distilledDate: e.target.value })}
                    placeholder="YYYY 또는 YYYY-MM"
                    maxLength={7}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 mb-1">병입 연월</label>
                  <input
                    type="text"
                    value={variant.commonDetail?.bottledDate ?? ''}
                    onChange={(e) => onUpdateCommon({ bottledDate: e.target.value })}
                    placeholder="YYYY 또는 YYYY-MM"
                    maxLength={7}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-neutral-500 mb-1">병 번호 / 총 병 수</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={variant.commonDetail?.bottleNo ?? ''}
                      onChange={(e) => onUpdateCommon({ bottleNo: e.target.value })}
                      placeholder="병 번호"
                      className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                    />
                    <span className="text-neutral-400">/</span>
                    <input
                      type="number"
                      value={variant.commonDetail?.totalBottles ?? ''}
                      onChange={(e) => onUpdateCommon({ totalBottles: e.target.value === '' ? null : Number(e.target.value) })}
                      placeholder="총 병 수"
                      className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
