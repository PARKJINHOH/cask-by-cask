import { useState, useEffect, useRef, type TextareaHTMLAttributes } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQueryClient } from '@tanstack/react-query'
import AdminProducerSelector from '@/domain/producer/components/AdminProducerSelector'
import { adminProducerApi } from '@/domain/admin/api/adminProducerApi'
import { CATEGORY_TO_PRODUCER_TYPE } from '@/domain/producer/types/producer.types'
import type { ProducerSelectorProps, NewProducerInput } from '@/domain/producer/types/producer.types'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import InfoTooltip from '@/shared/components/InfoTooltip'
import { RequiredMark } from '@/shared/components/FormFieldLabel'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'
import { REGION_CATALOG_CATEGORIES } from '@/domain/location/hooks/useWineRegionCatalog'
import {
  ABV_MIN, ABV_MAX, VOLUME_ML_MIN, VOLUME_ML_MAX, LIMIT_MESSAGE,
  suspiciousVolume, suspiciousAbv,
} from '@/domain/spirit/data/spiritLimits'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import type { CruCompositionRow } from '@/shared/components/CruCompositionInput'
import type {
  AdminSpiritDetail, CreateSpiritPayload, SpiritRegisterRequestDetail,
  CreateVariantRequest, SpiritCommonDetailRequest, WhiskyDetailRequest,
} from '@/domain/admin/types/admin.types'
import SpiritCommonDetailSection, {
  type CommonDetailForm, DEFAULT_COMMON_DETAIL, hasCommonDetailFields,
} from '@/domain/admin/components/SpiritCommonDetailSection'
import WhiskyDetailSection, {
  WhiskyCaskSection, type WhiskyDetailForm, DEFAULT_WHISKY,
} from '@/domain/admin/components/WhiskyDetailSection'
import WineDetailSection, { type WineDetailForm, DEFAULT_WINE } from '@/domain/admin/components/WineDetailSection'
import WineRegionPreview from '@/domain/admin/components/WineRegionPreview'
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
/**
 * 증류·병입 연월 형식 — `YYYY` 또는 `YYYY-MM`.
 *
 * 월은 반드시 01~12 여야 한다. 예전 정규식(`-\d{2}`)은 `1993-30` 같은
 * 존재하지 않는 월을 통과시켜 실제로 잘못된 데이터가 저장된 적이 있다.
 * 백엔드 `SpiritCommonDetailRequest` 의 `@Pattern` 과 같은 규칙을 유지할 것.
 */
export const DATE_RE = /^\d{4}(-(0[1-9]|1[0-2]))?$/

/**
 * 응답의 꼬냑 크뤼 구성을 폼 행으로. 구성이 없던 시절 데이터는 단일 `cru` 를
 * 1줄짜리 구성으로 승격시킨다(서버도 같은 규칙으로 내려준다).
 */
function toCruRows(
  composition: ReadonlyArray<{ cru: string; percentage?: number | null }> | null | undefined,
  legacyCru: string | null | undefined,
): CruCompositionRow[] {
  if (composition?.length) {
    return composition.map((c) => ({ cru: c.cru, percentage: c.percentage?.toString() ?? '' }))
  }
  return legacyCru ? [{ cru: legacyCru, percentage: '' }] : []
}

function trimStringsRecursively<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') {
    return obj.trim() as unknown as T
  }
  if (Array.isArray(obj)) {
    return obj.map(trimStringsRecursively) as unknown as T
  }
  if (typeof obj === 'object') {
    const newObj: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = trimStringsRecursively((obj as any)[key])
      }
    }
    return newObj as T
  }
  return obj
}


// 카테고리별 입력 예시 placeholder (이름/병입업체)
const PLACEHOLDERS: Record<SpiritCategory, { nameEn: string; nameKo: string }> = {
  WHISKY: { nameEn: 'Balvenie 12Y DoubleWood', nameKo: '예) 발베니 12년 더블우드' },
  COGNAC: { nameEn: 'Rémy Martin XO',          nameKo: '예) 레미 마르탱 XO' },
  WINE:   { nameEn: 'Château Margaux',         nameKo: '예) 샤토 마고' },
  OTHER:  { nameEn: 'Bombay Sapphire',         nameKo: '예) 봄베이 사파이어' },
}
const DEFAULT_PLACEHOLDER = { nameEn: 'Balvenie 12Y DoubleWood', nameKo: '예) 발베니 12년 더블우드' }

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
/**
 * 주류 등록/수정 폼 상태.
 *
 * @param options.requireProductionInfo
 *   생산자·국가를 필수로 검증한다. 관리자 등록/수정 화면에서만 true 로 준다 —
 *   사용자 술 등록 요청 화면은 일반 이용자가 쓰므로 기존처럼 선택으로 둔다.
 */
export function useSpiritForm(options?: { requireProductionInfo?: boolean }) {
  const adminRequired = options?.requireProductionInfo ?? false
  const [category, setCategory] = useState<SpiritCategory | null>(null)
  const [nameKo, setNameKo] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [producerId, setProducerId] = useState<number | null>(null)
  const [producerName, setProducerName] = useState('')
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  // 산지 코드 (역사적 명칭 WineRegion) — 와인·위스키·꼬냑·기타 지도 표시용
  const [regionCode, setRegionCode] = useState<string | null>(null)

  // 하위 에디션 관련 상태
  const [isVariantSplit, setIsVariantSplit] = useState(false)
  const [variantType, setVariantType] = useState<'NONE' | CreateVariantRequest['variantType']>('NONE')
  const [seriesIdentifier, setSeriesIdentifier] = useState('')
  const [seriesIdentifierEn, setSeriesIdentifierEn] = useState('')
  const [variants, setVariants] = useState<CreateVariantRequest[]>([])

  // 마스터 도수 범위 지정을 위한 상태
  const [isAbvRange, setIsAbvRange] = useState(false)
  const [abvMin, setAbvMin] = useState('')
  const [abvMax, setAbvMax] = useState('')

  // 마스터 용량 범위 지정을 위한 상태
  const [isVolumeMlRange, setIsVolumeMlRange] = useState(false)
  const [volumeMlMin, setVolumeMlMin] = useState('')
  const [volumeMlMax, setVolumeMlMax] = useState('')

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

  const addVariant = () => {
    const currentType = variantType !== 'NONE' ? variantType : (variants[0]?.variantType ?? 'BATCH')
    setVariants((prev) => [
      ...prev,
      {
        tempId: Math.random().toString(),
        variantType: currentType,
        variantValue: '',
        variantValueEn: '',
        seriesIdentifier,
        seriesIdentifierEn,
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
          isSingleCask: null,
          isCaskStrength: null,
          isPeated: null,
          phenolPpm: null,
          phenolPpmMin: null,
          phenolPpmMax: null,
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
          ? { ...v, commonDetail: { ...(v.commonDetail || {}), ...updates } }
          : v
      )
    )
  }

  const updateVariantWhisky = (index: number, updates: Partial<WhiskyDetailRequest>) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === index
          ? { ...v, whiskyDetail: { ...(v.whiskyDetail || {}), ...updates } }
          : v
      )
    )
  }

  // 폼 전체 초기화 (등록 후 같은 페이지에서 새 입력을 받는 화면용 — 사용자 등록 요청 화면)
  const reset = () => {
    setCategory(null)
    setNameKo('')
    setNameEn('')
    setProducerId(null)
    setProducerName('')
    setCountryCode(null)
    setCountry('')
    setRegion('')
    setRegionCode(null)
    setIsVariantSplit(false)
    setVariantType('NONE')
    setSeriesIdentifier('')
    setSeriesIdentifierEn('')
    setVariants([])
    setIsAbvRange(false)
    setAbvMin('')
    setAbvMax('')
    setIsVolumeMlRange(false)
    setVolumeMlMin('')
    setVolumeMlMax('')
    setCommonDetail(DEFAULT_COMMON_DETAIL)
    setWhiskyDetail(DEFAULT_WHISKY)
    setWineDetail(DEFAULT_WINE)
    setCognacDetail(DEFAULT_COGNAC)
    setOtherDetail(DEFAULT_OTHER)
    setErrors({})
  }

  // 카테고리 선택 (와인은 와인 상세의 빈티지 상태/연도를 사용)
  const selectCategory = (cat: SpiritCategory) => {
    if (cat === category) return
    // 산지 코드는 산지 카탈로그를 쓰는 카테고리(와인·위스키) 전용이므로
    // 그 밖으로 나가면 해제한다 (지도와 데이터 불일치 방지).
    // 와인 ↔ 위스키 전환도 산지 목록이 완전히 다르므로 해제한다.
    if (!REGION_CATALOG_CATEGORIES.includes(cat) || cat !== category) setRegionCode(null)

    // 카테고리를 바꾸면 **카테고리 하위 입력을 모두 초기화**한다.
    // 하위 에디션은 위스키 전용이라, 배치 분리를 켠 뒤 꼬냑으로 바꾸면
    // 에디션 목록이 그대로 남아 보이는 문제가 있었다.
    // 이전 카테고리의 상세 입력(캐스크·포도품종·크뤼 등)도 함께 비운다.
    resetCategoryDetails()

    setCategory(cat)
    setErrors({})
  }

  /** 카테고리 하위 입력(에디션 + 카테고리별 상세) 초기화 */
  const resetCategoryDetails = () => {
    setIsVariantSplit(false)
    setVariantType('NONE')
    setVariants([])
    setSeriesIdentifier('')
    setSeriesIdentifierEn('')
    setWhiskyDetail(DEFAULT_WHISKY)
    setWineDetail(DEFAULT_WINE)
    setCognacDetail(DEFAULT_COGNAC)
    setOtherDetail(DEFAULT_OTHER)
  }

  // ── 프리필: 술 상세(AdminSpiritDetail) → 폼 ──
  const prefillFromSpirit = (s: AdminSpiritDetail) => {
    setCategory(s.category)
    setNameKo(s.nameKo)
    setNameEn(s.nameEn)
    setProducerId(s.producerId)
    setProducerName(s.producerNameKo ?? '')
    setCountryCode(ISO3166_COUNTRIES.find((c) => c.nameKo === s.country)?.code ?? null)
    setCountry(s.country ?? '')
    // region 텍스트는 백엔드가 이미 L1 산지명으로 동기화해 두므로 그대로 사용한다
    setRegion(s.region ?? '')
    setRegionCode(s.wineRegion?.code ?? null)

    // 에디션 및 도수 범위 지정 프리필
    const inferredVariantType =
      (s.variantType && s.variantType !== 'NONE')
        ? s.variantType
        : ((s.variants ?? []).find((v) => v.variantType && v.variantType !== 'NONE')?.variantType ?? 'NONE')
    setVariantType(inferredVariantType)
    setSeriesIdentifier(s.seriesIdentifier ?? (s.variants ?? [])[0]?.seriesIdentifier ?? '')
    setSeriesIdentifierEn(s.seriesIdentifierEn ?? (s.variants ?? [])[0]?.seriesIdentifierEn ?? '')
    setIsVariantSplit(inferredVariantType !== 'NONE' || !!(s.variants && s.variants.length > 0))
    setVariants(
      (s.variants ?? []).map((v) => ({
        tempId: v.id ? `db-${v.id}` : Math.random().toString(),
        variantType: (v.variantType && v.variantType !== 'NONE') ? v.variantType : 'BATCH',
        variantValue: v.variantValue ?? '',
        variantValueEn: v.variantValueEn ?? '',
        seriesIdentifier: v.seriesIdentifier ?? s.seriesIdentifier ?? '',
        seriesIdentifierEn: v.seriesIdentifierEn ?? s.seriesIdentifierEn ?? '',
        abv: v.abv,
        abvMin: v.abvMin,
        abvMax: v.abvMax,
        volumeMl: v.volumeMl,
        volumeMlMin: v.volumeMlMin,
        volumeMlMax: v.volumeMlMax,
        // DTO 데이터 변환
        commonDetail: v.commonDetail ? {
          isNas: v.commonDetail.isNas,
          ageStatement: v.commonDetail.ageStatement,
          ageStatementMonths: v.commonDetail.ageStatementMonths,
          ageStatementMin: v.commonDetail.ageStatementMin,
          ageStatementMinMonths: v.commonDetail.ageStatementMinMonths,
          ageStatementMax: v.commonDetail.ageStatementMax,
          ageStatementMaxMonths: v.commonDetail.ageStatementMaxMonths,
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
          notes: v.whiskyDetail.notes,
        } : undefined,
      }))
    )

    if (s.abvMin != null && s.abvMax != null && s.abvMin !== s.abvMax) {
      setIsAbvRange(true)
      setAbvMin(s.abvMin.toString())
      setAbvMax(s.abvMax.toString())
    } else {
      setIsAbvRange(false)
      setAbvMin('')
      setAbvMax('')
    }

    if (s.volumeMlMin != null && s.volumeMlMax != null && s.volumeMlMin !== s.volumeMlMax) {
      setIsVolumeMlRange(true)
      setVolumeMlMin(s.volumeMlMin.toString())
      setVolumeMlMax(s.volumeMlMax.toString())
    } else {
      setIsVolumeMlRange(false)
      setVolumeMlMin('')
      setVolumeMlMax('')
    }

    if (s.commonDetail) {
      const cd = s.commonDetail
      setCommonDetail({
        isNas: cd.isNas, ageStatement: cd.ageStatement, ageStatementMonths: cd.ageStatementMonths,
        ageStatementMin: cd.ageStatementMin, ageStatementMinMonths: cd.ageStatementMinMonths,
        ageStatementMax: cd.ageStatementMax, ageStatementMaxMonths: cd.ageStatementMaxMonths,
        distilledDate: cd.distilledDate ?? '', bottledDate: cd.bottledDate ?? '',
        releaseDate: cd.releaseDate ?? '', volumeMl: cd.volumeMl?.toString() ?? s.volumeMl?.toString() ?? '',
        abv: cd.abv?.toString() ?? s.abv?.toString() ?? '', bottleNo: cd.bottleNo ?? '',
        batchNo: cd.batchNo ?? '', totalBottles: cd.totalBottles?.toString() ?? '',
      })
    } else {
      setCommonDetail({
        ...DEFAULT_COMMON_DETAIL,
        volumeMl: s.volumeMl?.toString() ?? '',
        abv: s.abv?.toString() ?? '',
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
        notes: w.notes ?? '',
      })
    }
    if (s.category === 'WINE') {
      const w = s.wineDetail
      setWineDetail({
        wineType: w?.wineType ?? '',
        vintageStatus: w?.vintageStatus ?? (s.vintageYear != null ? 'VINTAGE' : 'UNKNOWN'),
        vintageYear: s.vintageYear?.toString() ?? '',
        isOakAged: w?.isOakAged ?? null, isNaturalWine: w?.isNaturalWine ?? null,
        certification: w?.certification ?? '',
        grapeVarieties: (w?.grapeVarieties ?? []).map((g) => ({ name: g.name, percentage: g.percentage?.toString() ?? '' })),
        appellationDesignation: w?.appellationDesignation ?? '', soilType: w?.soilType ?? '',
        altitudeM: w?.altitudeM?.toString() ?? '', harvestMethod: w?.harvestMethod ?? '',
        fermentationVessel: w?.fermentationVessel ?? '', oakType: w?.oakType ?? '',
        oakAgedMonths: w?.oakAgedMonths?.toString() ?? '',
        sweetness: w?.sweetness ?? '', body: w?.body ?? '',
        acidity: w?.acidity ?? '', tannin: w?.tannin ?? '',
        notes: w?.notes ?? '',
      })
    }
    if (s.cognacDetail) {
      const c = s.cognacDetail
      setCognacDetail({
        grade: c.grade ?? '', cruComposition: toCruRows(c.cruComposition, c.cru),
        isFineChampagne: c.isFineChampagne ?? false, blendDetail: c.blendDetail ?? '',
        vintageYear: c.vintageYear?.toString() ?? '', ageYears: c.ageYears?.toString() ?? '',
        oakTypes: c.oakTypes ?? [], caskFinish: c.caskFinish ?? '',
        notes: c.notes ?? '',
      })
    }
    if (s.otherDetail) {
      const o = s.otherDetail
      setOtherDetail({
        otherType: o.otherType ?? '', mainIngredient: o.mainIngredient ?? '',
        productionMethod: o.productionMethod ?? '', notes: o.notes ?? '',
        styleClassification: o.styleClassification ?? '', caskType: o.caskType ?? '',
        originDesignation: o.originDesignation ?? '',
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
    setCountryCode(ISO3166_COUNTRIES.find((c) => c.nameKo === r.country)?.code ?? null)
    setCountry(r.country ?? '')
    setRegion(r.region ?? '')
    setRegionCode(r.regionCode ?? null)

    setCommonDetail({
      ...DEFAULT_COMMON_DETAIL,
      isNas: r.isNas ?? false, ageStatement: r.ageStatement ?? null,
      ageStatementMonths: r.ageStatementMonths ?? null,
      ageStatementMin: r.ageStatementMin ?? null, ageStatementMinMonths: r.ageStatementMinMonths ?? null,
      ageStatementMax: r.ageStatementMax ?? null, ageStatementMaxMonths: r.ageStatementMaxMonths ?? null,
      distilledDate: r.distilledDate ?? '', bottledDate: r.bottledDate ?? '',
      releaseDate: r.releaseDate ?? '', volumeMl: r.volumeMl?.toString() ?? '',
      abv: r.abv?.toString() ?? '',
      bottleNo: r.bottleNo ?? '', batchNo: r.batchNo ?? '', totalBottles: r.totalBottles?.toString() ?? '',
    })

    // 도수 범위 지정 프리필
    if (r.abvMin != null && r.abvMax != null && r.abvMin !== r.abvMax) {
      setIsAbvRange(true)
      setAbvMin(r.abvMin.toString())
      setAbvMax(r.abvMax.toString())
    } else {
      setIsAbvRange(false)
      setAbvMin('')
      setAbvMax('')
    }

    // 용량 범위 지정 프리필
    if (r.volumeMlMin != null && r.volumeMlMax != null && r.volumeMlMin !== r.volumeMlMax) {
      setIsVolumeMlRange(true)
      setVolumeMlMin(r.volumeMlMin.toString())
      setVolumeMlMax(r.volumeMlMax.toString())
    } else {
      setIsVolumeMlRange(false)
      setVolumeMlMin('')
      setVolumeMlMax('')
    }

    if (r.category === 'WHISKY') {
      setWhiskyDetail({
        ...DEFAULT_WHISKY,
        style: r.whiskyStyle ?? '', styleOther: r.whiskyStyleOther ?? '',
        brandName: r.brandName ?? '', bottlingType: r.bottlingType ?? '',
        notes: r.whiskyNotes ?? '',
        caskTypes: r.caskTypes ?? [], caskFinishes: r.caskFinishes ?? [], caskTypeOther: r.caskTypeOther ?? '',
        caskDetails: r.caskDetails ?? {},
        isNonChillFiltered: r.isNonChillFiltered ?? false, isNaturalColour: r.isNaturalColour ?? false,
        isSingleCask: r.isSingleCask ?? false, isCaskStrength: r.isCaskStrength ?? false, isPeated: r.isPeated ?? false,
        phenolPpm: r.phenolPpm?.toString() ?? '', phenolPpmMin: r.phenolPpmMin?.toString() ?? '', phenolPpmMax: r.phenolPpmMax?.toString() ?? '',
      })
    } else if (r.category === 'WINE') {
      const w = r.wineDetail
      setWineDetail({
        ...DEFAULT_WINE,
        wineType: r.wineType ?? w?.wineType ?? '',
        vintageStatus: w?.vintageStatus ?? (r.vintageYear != null ? 'VINTAGE' : 'UNKNOWN'),
        vintageYear: r.vintageYear?.toString() ?? '',
        isOakAged: w?.isOakAged ?? null, isNaturalWine: w?.isNaturalWine ?? null,
        certification: w?.certification ?? '',
        grapeVarieties: (w?.grapeVarieties ?? []).map((g) => ({ name: g.name, percentage: g.percentage?.toString() ?? '' })),
        appellationDesignation: w?.appellationDesignation ?? '', soilType: w?.soilType ?? '',
        altitudeM: w?.altitudeM?.toString() ?? '', harvestMethod: w?.harvestMethod ?? '',
        fermentationVessel: w?.fermentationVessel ?? '', oakType: w?.oakType ?? '',
        oakAgedMonths: w?.oakAgedMonths?.toString() ?? '',
        sweetness: w?.sweetness ?? '', body: w?.body ?? '',
        acidity: w?.acidity ?? '', tannin: w?.tannin ?? '',
        notes: w?.notes ?? '',
      })
    } else if (r.category === 'COGNAC') {
      const c = r.cognacDetail
      setCognacDetail({
        ...DEFAULT_COGNAC,
        grade: r.cognacGrade ?? c?.grade ?? '', cruComposition: toCruRows(c?.cruComposition, c?.cru),
        isFineChampagne: c?.isFineChampagne ?? false, blendDetail: c?.blendDetail ?? '',
        vintageYear: c?.vintageYear?.toString() ?? '', ageYears: c?.ageYears?.toString() ?? '',
        oakTypes: c?.oakTypes ?? [], caskFinish: c?.caskFinish ?? '',
        notes: c?.notes ?? '',
      })
    } else if (r.category === 'OTHER') {
      const o = r.otherDetail
      setOtherDetail({
        ...DEFAULT_OTHER,
        otherType: r.otherType ?? o?.otherType ?? '', mainIngredient: o?.mainIngredient ?? '',
        productionMethod: o?.productionMethod ?? '', notes: o?.notes ?? '',
        styleClassification: o?.styleClassification ?? '', caskType: o?.caskType ?? '',
        originDesignation: o?.originDesignation ?? '',
      })
    }

    // 신청자가 선택한 에디션(위스키 단일 에디션) → 하위 에디션 1개로 seed. 관리자가 보완/추가 가능.
    const splitType = r.variantType && r.variantType !== 'NONE' ? r.variantType : null
    setVariantType(splitType ?? 'NONE')
    setSeriesIdentifier(r.seriesIdentifier ?? '')
    setSeriesIdentifierEn(r.seriesIdentifierEn ?? '')
    if (r.category === 'WHISKY' && splitType && r.variantValue) {
      const seed: CreateVariantRequest = {
        variantType: splitType,
        variantValue: r.variantValue,
        variantValueEn: r.variantValueEn ?? '',
        seriesIdentifier: r.seriesIdentifier ?? '',
        seriesIdentifierEn: r.seriesIdentifierEn ?? '',
        abv: r.abv ?? null,
        abvMin: null,
        abvMax: null,
        volumeMl: r.volumeMl ?? null,
        commonDetail: {
          isNas: r.isNas ?? false, ageStatement: r.ageStatement ?? null,
          ageStatementMonths: r.ageStatementMonths ?? null,
          ageStatementMin: null, ageStatementMax: null,
          distilledDate: r.distilledDate ?? null, bottledDate: r.bottledDate ?? null,
          releaseDate: r.releaseDate ?? null, volumeMl: r.volumeMl ?? null, abv: r.abv ?? null,
          bottleNo: null, batchNo: null, totalBottles: null,
        },
        whiskyDetail: {
          style: r.whiskyStyle || 'SINGLE_MALT', styleOther: r.whiskyStyleOther ?? '',
          brandName: r.brandName ?? '', bottlingType: r.bottlingType || 'OB',
          caskTypes: r.caskTypes ?? [], caskFinishes: r.caskFinishes ?? [],
          caskTypeOther: r.caskTypeOther ?? '', caskDetails: r.caskDetails ?? {},
          isNonChillFiltered: r.isNonChillFiltered ?? false, isNaturalColour: r.isNaturalColour ?? false,
          isSingleCask: splitType === 'SINGLE_CASK' || (r.isSingleCask ?? false), isCaskStrength: r.isCaskStrength ?? false,
          isPeated: r.isPeated ?? false,
          phenolPpm: r.phenolPpm ?? null, phenolPpmMin: r.phenolPpmMin ?? null, phenolPpmMax: r.phenolPpmMax ?? null,
          notes: r.whiskyNotes ?? '',
        },
      }
      // tempId 는 런타임 식별자 — 타입에는 없고 (v as any).tempId 로 읽음(기존 컨벤션)
      ;(seed as any).tempId = Math.random().toString()
      setIsVariantSplit(true)
      setVariants([seed])
    } else {
      setIsVariantSplit(false)
      setVariantType('NONE')
      setVariants([])
    }
  }

  // ── 검증 (단일 정의) ──
  const focusFirstError = (errs: Record<string, string>) => {
    const firstKey = Object.keys(errs)[0]
    if (!firstKey) return
    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-field="${firstKey}"], [name="${firstKey}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target?.focus()
    }, 0)
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!category) errs.category = '카테고리를 선택해주세요.'
    if (!nameEn.trim()) errs.nameEn = '영문 이름은 필수입니다.'
    if (!nameKo.trim()) errs.nameKo = '한글 이름은 필수입니다.'

    const requireMasterSpecs = !isVariantSplit

    // 도수 범위 지정 여부에 따른 검증
    if (isAbvRange) {
      if (requireMasterSpecs && !abvMin) errs.abvMin = '최소 도수는 필수입니다.'
      else if (abvMin && (Number(abvMin) < ABV_MIN || Number(abvMin) > ABV_MAX)) errs.abvMin = LIMIT_MESSAGE.abv
      if (requireMasterSpecs && !abvMax) errs.abvMax = '최대 도수는 필수입니다.'
      else if (abvMax && (Number(abvMax) < ABV_MIN || Number(abvMax) > ABV_MAX)) errs.abvMax = LIMIT_MESSAGE.abv
      if (abvMin && abvMax && Number(abvMin) > Number(abvMax)) errs.abvMin = '최소 도수가 최대 도수보다 큽니다.'
    } else {
      if (requireMasterSpecs && !commonDetail.abv) errs.abv = '알코올 도수는 필수입니다.'
      else if (commonDetail.abv && (Number(commonDetail.abv) < ABV_MIN || Number(commonDetail.abv) > ABV_MAX))
        errs.abv = LIMIT_MESSAGE.abv
    }

    // 용량 범위 지정 여부에 따른 검증
    if (isVolumeMlRange) {
      if (requireMasterSpecs && !volumeMlMin) errs.volumeMlMin = '최소 용량은 필수입니다.'
      else if (volumeMlMin && (Number(volumeMlMin) < VOLUME_ML_MIN || Number(volumeMlMin) > VOLUME_ML_MAX)) errs.volumeMlMin = LIMIT_MESSAGE.volumeMl
      if (requireMasterSpecs && !volumeMlMax) errs.volumeMlMax = '최대 용량은 필수입니다.'
      else if (volumeMlMax && (Number(volumeMlMax) < VOLUME_ML_MIN || Number(volumeMlMax) > VOLUME_ML_MAX)) errs.volumeMlMax = LIMIT_MESSAGE.volumeMl
      if (volumeMlMin && volumeMlMax && Number(volumeMlMin) > Number(volumeMlMax)) errs.volumeMlMin = '최소 용량이 최대 용량보다 큽니다.'
    } else {
      if (requireMasterSpecs && !commonDetail.volumeMl) errs.volumeMl = '용량은 필수입니다.'
      else if (commonDetail.volumeMl && (Number(commonDetail.volumeMl) < VOLUME_ML_MIN || Number(commonDetail.volumeMl) > VOLUME_ML_MAX))
        errs.volumeMl = LIMIT_MESSAGE.volumeMl
    }

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
      if (wineDetail.vintageStatus === 'VINTAGE') {
        const year = Number(wineDetail.vintageYear)
        if (!wineDetail.vintageYear) errs.vintageYear = '빈티지 연도를 입력해주세요.'
        else if (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear())
          errs.vintageYear = `빈티지 연도는 1800~${new Date().getFullYear()} 사이여야 합니다.`
      }
      const total = wineDetail.grapeVarieties.reduce((sum, g) => sum + (Number(g.percentage) || 0), 0)
      if (total > 100) errs.grapeVarieties = '포도 품종 비율 합계가 100%를 초과합니다.'
    }
    if (category === 'COGNAC') {
      if (!cognacDetail.grade) errs.grade = '등급을 선택해주세요.'
      const rows = cognacDetail.cruComposition.filter((r) => r.cru)
      const cruTotal = rows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0)
      if (cruTotal > 100) errs.cruComposition = '크뤼 구성 비율 합계가 100%를 초과합니다.'
      else if (new Set(rows.map((r) => r.cru)).size !== rows.length)
        errs.cruComposition = '같은 크뤼를 중복해서 입력할 수 없습니다.'
    }
    if (category === 'OTHER' && !otherDetail.otherType) errs.otherType = '주종을 선택해주세요.'

    // 생산 정보 필수 — 관리자 등록/수정에만 적용한다.
    // 사용자 술 등록 요청(admin=false)은 일반 이용자가 쓰는 화면이라 기존처럼 선택으로 둔다.
    // 목록에 없는 생산자는 선택기 안에서 직접 등록할 수 있으므로 필수로 둬도 막히지 않는다.
    if (adminRequired && category) {
      if (!producerId) errs.producerId = `${PRODUCER_LABEL[category]}을(를) 선택하거나 직접 등록해주세요.`
      if (!countryCode) errs.country = '국가는 필수입니다.'
    }

    // 하위 에디션 검증
    if (isVariantSplit) {
      if (!seriesIdentifier.trim()) {
        errs.seriesIdentifier = '시리즈 식별자는 필수입니다.'
      }
      variants.forEach((v, idx) => {
        if (!v.variantValue.trim()) {
          errs[`variantValue_${idx}`] = '에디션 식별 값은 필수입니다.'
        }
        if (v.abv != null && (Number(v.abv) < ABV_MIN || Number(v.abv) > ABV_MAX)) {
          errs[`variantAbv_${idx}`] = LIMIT_MESSAGE.abv
        }
        if (v.volumeMl != null && (Number(v.volumeMl) < VOLUME_ML_MIN || Number(v.volumeMl) > VOLUME_ML_MAX)) {
          errs[`variantVolumeMl_${idx}`] = LIMIT_MESSAGE.volumeMl
        }
        if (v.commonDetail?.distilledDate && !DATE_RE.test(v.commonDetail.distilledDate)) {
          errs[`variantDistilledDate_${idx}`] = '형식: YYYY 또는 YYYY-MM'
        }
        if (v.commonDetail?.bottledDate && !DATE_RE.test(v.commonDetail.bottledDate)) {
          errs[`variantBottledDate_${idx}`] = '형식: YYYY 또는 YYYY-MM'
        }
      })
    }

    setErrors(errs)
    focusFirstError(errs)
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
      ageStatementMonths: dropAging || commonDetail.isNas ? null : (commonDetail.ageStatementMonths ?? null),
      ageStatementMin: dropAging || commonDetail.isNas ? null : (commonDetail.ageStatementMin ?? null),
      ageStatementMinMonths: dropAging || commonDetail.isNas ? null : (commonDetail.ageStatementMinMonths ?? null),
      ageStatementMax: dropAging || commonDetail.isNas ? null : (commonDetail.ageStatementMax ?? null),
      ageStatementMaxMonths: dropAging || commonDetail.isNas ? null : (commonDetail.ageStatementMaxMonths ?? null),
      distilledDate: dropAging ? null : (commonDetail.distilledDate || null),
      bottledDate: isWine ? null : (commonDetail.bottledDate || null),
      releaseDate: isWine ? null : (commonDetail.releaseDate || null),
      volumeMl: isVolumeMlRange ? (volumeMlMin ? Number(volumeMlMin) : null) : (commonDetail.volumeMl ? Number(commonDetail.volumeMl) : null),
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
          isNonChillFiltered: whiskyDetail.isNonChillFiltered ?? null,
          isNaturalColour: whiskyDetail.isNaturalColour ?? null,
          isSingleCask: whiskyDetail.isSingleCask ?? null,
          isCaskStrength: whiskyDetail.isCaskStrength ?? null,
          isPeated: whiskyDetail.isPeated ?? null,
          phenolPpm: whiskyDetail.isPeated && whiskyDetail.phenolPpm ? Number(whiskyDetail.phenolPpm) : null,
          phenolPpmMin: whiskyDetail.isPeated && whiskyDetail.phenolPpmMin ? Number(whiskyDetail.phenolPpmMin) : null,
          phenolPpmMax: whiskyDetail.isPeated && whiskyDetail.phenolPpmMax ? Number(whiskyDetail.phenolPpmMax) : null,
          notes: whiskyDetail.notes || null,
        },
      }
      case 'WINE': return {
        wineDetail: {
          wineType: wineDetail.wineType || null,
          vintageStatus: wineDetail.vintageStatus,
          isOakAged: wineDetail.isOakAged ?? null,
          isNaturalWine: wineDetail.isNaturalWine ?? null,
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
          sweetness: wineDetail.sweetness || null,
          body: wineDetail.body || null,
          acidity: wineDetail.acidity || null,
          tannin: wineDetail.tannin || null,
          notes: wineDetail.notes || null,
        },
      }
      case 'COGNAC': {
        const cruRows = cognacDetail.cruComposition.filter((r) => r.cru)
        return {
          cognacDetail: {
            grade: cognacDetail.grade || null,
            // 대표 크뤼는 서버가 구성에서 비율 최상위로 정한다.
            cru: null,
            cruComposition: cruRows.map((r) => ({
              cru: r.cru, percentage: r.percentage ? Number(r.percentage) : null,
            })),
            isFineChampagne: cognacDetail.isFineChampagne ?? null,
            blendDetail: cognacDetail.blendDetail || null,
            vintageYear: cognacDetail.vintageYear ? Number(cognacDetail.vintageYear) : null,
            ageYears: cognacDetail.ageYears ? Number(cognacDetail.ageYears) : null,
            oakTypes: cognacDetail.oakTypes,
            caskFinish: cognacDetail.caskFinish || null,
            notes: cognacDetail.notes || null,
          },
        }
      }
      case 'OTHER': return {
        otherDetail: {
          otherType: otherDetail.otherType || null,
          mainIngredient: otherDetail.mainIngredient || null,
          productionMethod: otherDetail.productionMethod || null,
          notes: otherDetail.notes || null,
          styleClassification: otherDetail.styleClassification || null,
          caskType: otherDetail.caskType || null,
          originDesignation: otherDetail.originDesignation || null,
        },
      }
      default: return {}
    }
  }

  const cleanWhiskyDetail = (w?: WhiskyDetailRequest): WhiskyDetailRequest | null => {
    if (!w) return null
    const style = w.style || null
    const caskTypes = w.caskTypes || []
    return {
      style,
      styleOther: style === 'OTHER' ? (w.styleOther || null) : null,
      brandName: w.brandName || null,
      bottlingType: w.bottlingType || null,
      caskTypes,
      caskFinishes: (w.caskFinishes || []).filter((c) => caskTypes.includes(c)),
      caskTypeOther: caskTypes.includes('OTHER') ? (w.caskTypeOther || null) : null,
      caskDetails: Object.fromEntries(
        Object.entries(w.caskDetails || {}).map(([k, v]) => [
          k,
          v.filter((str) => str.trim() !== '')
        ]).filter(([_, v]) => v.length > 0)
      ),
      isNonChillFiltered: w.isNonChillFiltered ?? null,
      isNaturalColour: w.isNaturalColour ?? null,
      isSingleCask: w.isSingleCask ?? null,
      isCaskStrength: w.isCaskStrength ?? null,
      isPeated: w.isPeated ?? null,
      phenolPpm: w.isPeated && w.phenolPpm ? Number(w.phenolPpm) : null,
      phenolPpmMin: w.isPeated && w.phenolPpmMin ? Number(w.phenolPpmMin) : null,
      phenolPpmMax: w.isPeated && w.phenolPpmMax ? Number(w.phenolPpmMax) : null,
      notes: w.notes || null,
    }
  }

  const cleanVariantCommonDetail = (cd?: SpiritCommonDetailRequest): SpiritCommonDetailRequest | undefined => {
    if (!cd) return undefined
    return {
      isNas: cd.isNas ?? false,
      ageStatement: cd.isNas ? null : (cd.ageStatement ?? null),
      ageStatementMonths: cd.isNas ? null : (cd.ageStatementMonths ?? null),
      ageStatementMin: cd.isNas ? null : (cd.ageStatementMin ?? null),
      ageStatementMinMonths: cd.isNas ? null : (cd.ageStatementMinMonths ?? null),
      ageStatementMax: cd.isNas ? null : (cd.ageStatementMax ?? null),
      ageStatementMaxMonths: cd.isNas ? null : (cd.ageStatementMaxMonths ?? null),
      distilledDate: cd.distilledDate || null,
      bottledDate: cd.bottledDate || null,
      releaseDate: cd.releaseDate || null,
      bottleNo: cd.bottleNo || null,
      batchNo: cd.batchNo || null,
      totalBottles: cd.totalBottles ?? null,
      abv: null,
      volumeMl: null,
    }
  }

  // 최종 페이로드 (등록/수정/승인 공통). category 보장은 호출 전 validate()로.
  const buildPayload = (): CreateSpiritPayload => {
    const common = buildCommonPayload()
    const selectedVariantType = isVariantSplit ? (variantType !== 'NONE' ? variantType : (variants[0]?.variantType ?? 'BATCH')) : 'NONE'
    const variantsToSubmit = variants.filter((v) => v.variantValue.trim().length > 0)
    const payload: CreateSpiritPayload = {
      nameKo, nameEn, category: category as SpiritCategory,
      producerId: producerId ?? null,
      vintageYear: category === 'WINE'
        && wineDetail.vintageStatus === 'VINTAGE'
        && wineDetail.vintageYear
        ? Number(wineDetail.vintageYear)
        : null,
      abv: common.abv,
      volumeMl: common.volumeMl,
      country: country || null,
      region: region || null,
      // 카탈로그 대상 카테고리의 산지 코드. 수정 요청에서 null 은 '해제'로 반영되므로 항상 전송한다
      regionCode: category && REGION_CATALOG_CATEGORIES.includes(category)
        ? (regionCode || null)
        : null,
      commonDetail: common,
      isVariantSplit,
      seriesIdentifier: isVariantSplit ? (seriesIdentifier.trim() || null) : null,
      seriesIdentifierEn: isVariantSplit ? (seriesIdentifierEn.trim() || null) : null,
      variants: isVariantSplit ? variantsToSubmit.map(v => ({
        ...v,
        variantValue: v.variantValue.trim(),
        variantValueEn: (v.variantValueEn ?? '').trim() || null,
        seriesIdentifier: seriesIdentifier.trim(),
        seriesIdentifierEn: seriesIdentifierEn.trim() || null,
        volumeMl: v.volumeMl ? Number(v.volumeMl) : null,
        volumeMlMin: v.volumeMlMin ? Number(v.volumeMlMin) : null,
        volumeMlMax: v.volumeMlMax ? Number(v.volumeMlMax) : null,
        commonDetail: cleanVariantCommonDetail(v.commonDetail),
        whiskyDetail: category === 'WHISKY' ? (cleanWhiskyDetail(v.whiskyDetail) || undefined) : undefined,
      })) : [],
      variantType: selectedVariantType,
      variantValue: null,
      variantValueEn: null,
      abvMin: isAbvRange ? (abvMin ? Number(abvMin) : null) : null,
      abvMax: isAbvRange ? (abvMax ? Number(abvMax) : null) : null,
      volumeMlMin: isVolumeMlRange ? (volumeMlMin ? Number(volumeMlMin) : null) : null,
      volumeMlMax: isVolumeMlRange ? (volumeMlMax ? Number(volumeMlMax) : null) : null,
      ...buildCategoryPayload(),
    }
    return trimStringsRecursively(payload)
  }

  return {
    /** 생산자·국가를 필수로 검증하는지 (UI 가 필수 표시를 붙일 때 사용) */
    requireProductionInfo: adminRequired,
    category, setCategory, selectCategory,
    nameKo, setNameKo, nameEn, setNameEn,
    producerId, setProducerId, producerName,
    countryCode, country, region, setCountryValue, setRegion,
    regionCode, setRegionCode,
    isVariantSplit, setIsVariantSplit, variantType, setVariantType,
    seriesIdentifier, setSeriesIdentifier, seriesIdentifierEn, setSeriesIdentifierEn,
    variants, setVariants,
    addVariant, removeVariant, updateVariant, updateVariantCommon, updateVariantWhisky,
    isAbvRange, setIsAbvRange, abvMin, setAbvMin, abvMax, setAbvMax,
    isVolumeMlRange, setIsVolumeMlRange, volumeMlMin, setVolumeMlMin, volumeMlMax, setVolumeMlMax,
    commonDetail, updateCommon,
    whiskyDetail, updateWhisky, wineDetail, updateWine,
    cognacDetail, updateCognac, otherDetail, updateOther,
    errors, setErrors,
    prefillFromSpirit, prefillFromRequest,
    validate, buildPayload, reset,
  }
}

export type SpiritFormApi = ReturnType<typeof useSpiritForm>

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  maxLength,
  ...rest
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  maxLength?: number
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${className} resize-none overflow-hidden min-h-[38px] py-2`}
      rows={1}
      maxLength={maxLength}
      {...rest}
    />
  )
}

function NumberSvg({ num, active }: { num: number; active: boolean }) {
  return (
    <svg
      className={`w-4 h-4 flex-shrink-0 transition-colors ${
        active ? 'text-amber-600' : 'text-neutral-400 hover:text-amber-500'
      }`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth={2} fill="none" />
      <text
        x="12"
        y="15.5"
        fontSize="10"
        fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif"
        textAnchor="middle"
        fill="currentColor"
      >
        {num}
      </text>
    </svg>
  )
}

interface SortableTabProps {
  id: string
  index: number
  variant: any
  isActive: boolean
  onClick: () => void
  onRemove: () => void
}

function SortableTab({
  id,
  index,
  variant,
  isActive,
  onClick,
  onRemove,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none ${
        isActive
          ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
          : 'border-neutral-200 bg-white text-neutral-500 hover:border-amber-300 hover:bg-amber-50/50'
      }`}
    >
      <NumberSvg num={index + 1} active={isActive} />
      <span>{variant.variantValue || '새 에디션'}</span>
      <span
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="hover:text-red-500 hover:bg-neutral-200/60 p-0.5 rounded transition-colors ml-1 cursor-pointer"
        title="에디션 삭제"
      >
        ✕
      </span>
    </div>
  )
}

// ── 폼 UI (기본 / 생산 / 카테고리 상세 / 공통 상세 + 위스키는 캐스크 전용 컬럼) ───────
interface SpiritFormFieldsProps {
  form: SpiritFormApi
  /** true면 카테고리 변경 불가 (값만 수정) — 주류 상세 화면용 */
  categoryLocked?: boolean
  /** 카테고리 클릭 가로채기 (수정 모드 경고 모달 등). 미지정 시 form.selectCategory */
  onCategorySelect?: (cat: SpiritCategory) => void
  /** 좌측 컬럼 하단에 끼워 넣을 슬롯 (이미지 관리 카드 등) */
  imageSlot?: React.ReactNode
  /** false면 하위 에디션을 1개까지만 허용 — "에디션 추가" 버튼/탭 바를 숨김 (사용자 등록 요청 화면용). 미지정 시 true(관리자 동작 동일) */
  allowMultipleVariants?: boolean
  /** 외부 흐름에서 특정 하위 에디션을 바로 열어야 할 때 사용 */
  activeVariantIndex?: number | null
  /** 생산자 선택 컴포넌트 교체 (미지정 시 AdminProducerSelector) */
  producerSelector?: React.ComponentType<ProducerSelectorProps>
  /** 생산자 직접 등록 콜백 교체 (미지정 시 관리자 즉시 생성) */
  onCreateProducer?: (data: NewProducerInput) => Promise<number | null>
  /** 4개 섹션 뒤에 끼워 넣을 슬롯 (이미지 첨부/비고 입력 등 — 사용자 등록 요청 화면용) */
  bottomSlot?: React.ReactNode
  /** 관리자 화면은 한국어 고정. 사용자 등록 화면에서는 현재 언어를 사용한다. */
  admin?: boolean
}

export default function SpiritFormFields({
  form, categoryLocked, onCategorySelect, imageSlot,
  allowMultipleVariants = true, activeVariantIndex, producerSelector, onCreateProducer, bottomSlot,
  admin = true,
}: SpiritFormFieldsProps) {
  const { category, errors } = form
  const handleCategory = onCategorySelect ?? form.selectCategory
  const producerLabel = category ? PRODUCER_LABEL[category] : '증류소'
  const ph = category ? PLACEHOLDERS[category] : DEFAULT_PLACEHOLDER
  const queryClient = useQueryClient()
  const isMasterSpecsDisabled = false
  const isMasterSpecsRequired = !form.isVariantSplit

  const [activeVariantIdx, setActiveVariantIdx] = useState(0)

  // 에디션 목록이 줄거나 비워지면(카테고리 전환·에디션 삭제) 열려 있던 인덱스를 보정한다.
  // 보정하지 않으면 캐스크 컬럼과 에디션 카드가 존재하지 않는 인덱스를 가리켜 빈 화면이 된다.
  useEffect(() => {
    if (activeVariantIdx > 0 && activeVariantIdx >= form.variants.length) {
      setActiveVariantIdx(Math.max(0, form.variants.length - 1))
    }
  }, [form.variants.length, activeVariantIdx])

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  })
  const sensors = useSensors(pointerSensor)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = form.variants.findIndex((v, idx) => ((v as any).tempId || `temp-${idx}`) === active.id)
    const newIndex = form.variants.findIndex((v, idx) => ((v as any).tempId || `temp-${idx}`) === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const nextVariants = arrayMove(form.variants, oldIndex, newIndex)
      form.setVariants(nextVariants)
      
      if (activeVariantIdx === oldIndex) {
        setActiveVariantIdx(newIndex)
      } else if (activeVariantIdx > oldIndex && activeVariantIdx <= newIndex) {
        setActiveVariantIdx(activeVariantIdx - 1)
      } else if (activeVariantIdx < oldIndex && activeVariantIdx >= newIndex) {
        setActiveVariantIdx(activeVariantIdx + 1)
      }
    }
  }

  useEffect(() => {
    if (form.variants.length === 0) {
      setActiveVariantIdx(0)
    } else if (activeVariantIdx >= form.variants.length) {
      setActiveVariantIdx(form.variants.length - 1)
    }
  }, [form.variants.length, activeVariantIdx])

  useEffect(() => {
    if (activeVariantIndex == null) return
    if (activeVariantIndex < 0 || activeVariantIndex >= form.variants.length) return
    setActiveVariantIdx(activeVariantIndex)
  }, [activeVariantIndex, form.variants.length])

  // 목록에 없는 생산자를 즉시 직접 생성 후 선택 (관리자 기본 동작).
  // 생산자 종류는 현재 카테고리에 맞춰야 한다 — 위스키는 DISTILLERY, 와인은 WINERY 등.
  // (예전에는 'OTHER' 로 고정되어 있어 증류소를 만들어도 위스키 목록에 나타나지 않았다)
  const handleCreateProducer = async (data: NewProducerInput) => {
    const producerType = category ? CATEGORY_TO_PRODUCER_TYPE[category] : 'OTHER'
    const res = await adminProducerApi.create({ type: producerType, ...data })
    await queryClient.invalidateQueries({ queryKey: ['producers'] })
    return res.data.data?.id ?? null
  }

  const ProducerSelectorComp = producerSelector ?? AdminProducerSelector
  const handleCreateProducerFinal = onCreateProducer ?? handleCreateProducer
  // 관리자 등록/수정에서는 생산 정보(생산자·국가)를 필수로 받는다
  const requireProduction = form.requireProductionInfo

  /**
   * 위스키는 캐스크 입력이 매우 길어(대분류 11종 × 세부 오크통 다중 입력)
   * PC 에서 **3열**로 배치한다 — 좌: 기본·생산·이미지 / 중: 위스키 상세·에디션 / 우: 캐스크.
   * 나머지 카테고리는 기존 2열(2:3) 비율을 유지한다.
   */
  const isWhisky = category === 'WHISKY'

  /**
   * 입력 오타 힌트 — 범위는 맞지만 실무적으로 의심스러운 값에 안내를 띄운다.
   * 저장을 막지 않는다(실존하는 비표준 규격·저도주가 있으므로).
   * 범위형(min~max)일 때는 최소값 기준으로 판단한다.
   */
  const volumeHint = suspiciousVolume(
    form.isVolumeMlRange ? form.volumeMlMin : form.commonDetail.volumeMl,
  )
  const abvHint = suspiciousAbv(
    form.isAbvRange ? form.abvMin : form.commonDetail.abv,
    category,
  )
  /** 3열일 때 캐스크 컬럼이 편집하는 대상 — 에디션 분리 시 활성 에디션, 그 외에는 마스터 */
  const caskTarget = isWhisky && form.isVariantSplit && form.variants[activeVariantIdx]
    ? {
      label: `에디션 · ${form.variants[activeVariantIdx].variantValue || `${activeVariantIdx + 1}번째`}`,
      value: toWhiskyDetailForm(form.variants[activeVariantIdx].whiskyDetail),
      onChange: (u: Partial<WhiskyDetailForm>) =>
        form.updateVariantWhisky(activeVariantIdx, toWhiskyDetailRequest(u)),
    }
    : { label: null, value: form.whiskyDetail, onChange: form.updateWhisky }

  return (
    <div className={`grid grid-cols-1 gap-6 items-start ${
      isWhisky ? 'lg:grid-cols-3' : 'lg:grid-cols-5'
    }`}>
      {/* ═══ 최상단: 이미지 (전체 폭 1줄) ═══
          주류 수정 화면과 같은 위치·형태로 맞춘다 — 대표 이미지 지정과 순서 변경을
          다른 입력과 나란히 두면 좁아서 썸네일이 잘 보이지 않는다. */}
      {imageSlot && (
        <div className={isWhisky ? 'lg:col-span-3' : 'lg:col-span-5'}>{imageSlot}</div>
      )}

      {/* ═══ 좌측: ① 기본 / ② 생산 / ④ 공통 상세 ═══ */}
      <div className={`space-y-6 ${isWhisky ? '' : 'lg:col-span-2'}`}>
        <div className={CARD}>
          <SectionTitle title="카테고리 & 기본 정보" />

          {/* 카테고리 */}
          <div>
            <label className={LABEL}>
              카테고리 <RequiredMark />
              {categoryLocked && <span className="ml-1.5 text-[11px] text-neutral-400 font-normal">(고정 — 변경 불가)</span>}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="radiogroup" aria-required="true">
              {CATEGORIES.map(([cat, label]) => {
                const selected = category === cat
                if (categoryLocked && !selected) return null
                return (
                  <button key={cat} type="button" data-field="category"
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
              <label className={LABEL}>한국어 이름 <RequiredMark /></label>
              <AutoResizeTextarea value={form.nameKo} onChange={form.setNameKo} maxLength={200}
                required aria-required="true"
                data-field="nameKo"
                placeholder={ph.nameKo}
                className={`${INPUT} ${errors.nameKo ? 'border-red-400' : ''}`} />
              {errors.nameKo && <p className="text-xs text-red-500 mt-1">{errors.nameKo}</p>}
            </div>
            <div>
              <label className={LABEL}>영어 이름 <RequiredMark /></label>
              <AutoResizeTextarea value={form.nameEn} onChange={form.setNameEn} maxLength={200}
                required aria-required="true"
                data-field="nameEn"
                placeholder={ph.nameEn}
                className={`${INPUT} ${errors.nameEn ? 'border-red-400' : ''}`} />
              {errors.nameEn && <p className="text-xs text-red-500 mt-1">{errors.nameEn}</p>}
            </div>
          </div>

          {/* 에디션 유형 */}
          {category === 'WHISKY' && (
            <div>
              <label className={LABEL}>에디션 유형</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['NONE', '정규'],
                  ['BATCH', '배치'],
                  ['SINGLE_CASK', '싱글 캐스크'],
                  ['RELEASE_YEAR', '출시 연도'],
                ].map(([val, label]) => {
                  const isSelected = val === 'NONE'
                    ? !form.isVariantSplit
                    : (form.isVariantSplit && form.variantType === val)
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        if (val === 'NONE') {
                          form.setIsVariantSplit(false)
                          form.setVariantType('NONE')
                          form.setVariants([])
                        } else {
                          form.setIsVariantSplit(true)
                          form.setVariantType(val as any)
                          form.setVariants((prev) => prev.map(v => ({
                            tempId: (v as any).tempId || Math.random().toString(),
                            ...v,
                            variantType: val as any
                          })))
                        }
                      }}
                      className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-neutral-200 text-neutral-500 hover:border-amber-300 hover:bg-amber-50/50'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 필수 규격 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
            <p className="text-xs font-semibold text-amber-700">필수 규격</p>
            <div className="grid grid-cols-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-neutral-600 mb-0">알코올 도수 {isMasterSpecsRequired && <RequiredMark />}</label>
                  <label className="flex items-center gap-1 text-[11px] text-neutral-500 cursor-pointer select-none">
                    <input type="checkbox" checked={form.isAbvRange} disabled={isMasterSpecsDisabled} onChange={(e) => form.setIsAbvRange(e.target.checked)} className="accent-amber-500 rounded disabled:opacity-50" />
                    범위 지정
                  </label>
                </div>
                {form.isAbvRange ? (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input type="number" step="0.1" min="0" max="100" value={form.abvMin}
                         required={isMasterSpecsRequired} aria-required={isMasterSpecsRequired || undefined}
                         disabled={isMasterSpecsDisabled}
                         onChange={(e) => form.setAbvMin(e.target.value)}
                         onWheel={(e) => e.currentTarget.blur()}
                         placeholder="최소"
                         className={`${INPUT} pr-8 disabled:bg-neutral-100 disabled:text-neutral-400 ${errors.abvMin ? 'border-red-400' : ''}`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
                    </div>
                    <span className="text-neutral-400">~</span>
                    <div className="relative flex-1">
                      <input type="number" step="0.1" min="0" max="100" value={form.abvMax}
                         required={isMasterSpecsRequired} aria-required={isMasterSpecsRequired || undefined}
                         disabled={isMasterSpecsDisabled}
                         onChange={(e) => form.setAbvMax(e.target.value)}
                         onWheel={(e) => e.currentTarget.blur()}
                         placeholder="최대"
                         className={`${INPUT} pr-8 disabled:bg-neutral-100 disabled:text-neutral-400 ${errors.abvMax ? 'border-red-400' : ''}`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input type="number" step="0.1" min="0" max="100" value={form.commonDetail.abv}
                       required={isMasterSpecsRequired} aria-required={isMasterSpecsRequired || undefined}
                       disabled={isMasterSpecsDisabled}
                       onWheel={(e) => e.currentTarget.blur()}
                       onChange={(e) => {
                         let val = e.target.value
                         const num = parseFloat(val)
                         if (!isNaN(num) && num > 100) val = '100'
                         else if (!isNaN(num) && num < 0) val = '0'
                         form.updateCommon({ abv: val })
                       }}
                       className={`${INPUT} pr-8 disabled:bg-neutral-100 disabled:text-neutral-400 ${errors.abv ? 'border-red-400' : ''}`} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
                  </div>
                )}
                {(errors.abv || errors.abvMin || errors.abvMax) && (
                  <p className="text-xs text-red-500 mt-1">{errors.abv || errors.abvMin || errors.abvMax}</p>
                )}
                {/* 오타 힌트 — 스카치·꼬냑은 법정 최저 40%라 20% 미만은 4.6↔46 오타일 가능성이 높다 */}
                {abvHint && category && (
                  <p className="text-xs text-amber-600 mt-1">
                    {CATEGORY_LABEL[category]} 치고 도수가 낮습니다. 소수점을 잘못 넣진 않았나요?
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-neutral-600 mb-0">용량 {isMasterSpecsRequired && <RequiredMark />}</label>
                  <label className="flex items-center gap-1 text-[11px] text-neutral-500 cursor-pointer select-none">
                    <input type="checkbox" checked={form.isVolumeMlRange} disabled={isMasterSpecsDisabled} onChange={(e) => form.setIsVolumeMlRange(e.target.checked)} className="accent-amber-500 rounded disabled:opacity-50" />
                    범위 지정
                  </label>
                </div>
                {form.isVolumeMlRange ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input type="number" min={VOLUME_ML_MIN} max={VOLUME_ML_MAX} value={form.volumeMlMin}
                               required={isMasterSpecsRequired} aria-required={isMasterSpecsRequired || undefined}
                               disabled={isMasterSpecsDisabled}
                               onChange={(e) => form.setVolumeMlMin(e.target.value)}
                               onWheel={(e) => e.currentTarget.blur()}
                               placeholder="최소"
                               className={`${INPUT} pr-8 disabled:bg-neutral-100 disabled:text-neutral-400 ${errors.volumeMlMin ? 'border-red-400' : ''}`} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">ml</span>
                      </div>
                      <span className="text-neutral-400">~</span>
                      <div className="relative flex-1">
                        <input type="number" min={VOLUME_ML_MIN} max={VOLUME_ML_MAX} value={form.volumeMlMax}
                               required={isMasterSpecsRequired} aria-required={isMasterSpecsRequired || undefined}
                               disabled={isMasterSpecsDisabled}
                               onChange={(e) => form.setVolumeMlMax(e.target.value)}
                               onWheel={(e) => e.currentTarget.blur()}
                               placeholder="최대"
                               className={`${INPUT} pr-8 disabled:bg-neutral-100 disabled:text-neutral-400 ${errors.volumeMlMax ? 'border-red-400' : ''}`} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">ml</span>
                      </div>
                    </div>
                ) : (
                    <div className="relative">
                      <input type="number" min={VOLUME_ML_MIN} max={VOLUME_ML_MAX} value={form.commonDetail.volumeMl}
                             required={isMasterSpecsRequired} aria-required={isMasterSpecsRequired || undefined}
                             disabled={isMasterSpecsDisabled}
                             onWheel={(e) => e.currentTarget.blur()}
                             onChange={(e) => {
                               let val = e.target.value
                               const num = parseFloat(val)
                               if (!isNaN(num) && num > 100000) val = '100000'
                               else if (!isNaN(num) && num < 1) val = '1'
                               form.updateCommon({ volumeMl: val })
                             }}
                             className={`${INPUT} pr-10 disabled:bg-neutral-100 disabled:text-neutral-400 ${errors.volumeMl ? 'border-red-400' : ''}`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">ml</span>
                    </div>
                )}
                {(errors.volumeMl || errors.volumeMlMin || errors.volumeMlMax) && (
                    <p className="text-xs text-red-500 mt-1">{errors.volumeMl || errors.volumeMlMin || errors.volumeMlMax}</p>
                )}
                {/* 오타 힌트 — 저장은 막지 않는다 (640·720ml 처럼 실존하는 비표준 규격이 있다) */}
                {volumeHint != null && (
                  <p className="text-xs text-amber-600 mt-1">
                    표준 병 규격이 아닙니다. {volumeHint.toLocaleString('ko-KR')}ml 를 의도하셨나요?
                  </p>
                )}
              </div>
            </div>
          {/* 위스키 전용 기본 정보: 스타일 & 병입 구분 */}
          {category === 'WHISKY' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
              {/* 스타일 */}
              <div>
                <label className={LABEL}>스타일 <RequiredMark /></label>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-required="true">
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

        {/* ② 생산 정보 */}
        {category && (
          <div className={CARD}>
            <SectionTitle title="생산 정보" hint={requireProduction ? undefined : '선택'} />
            <div data-field="producerId">
              <label className={LABEL}>
                {producerLabel}{requireProduction && <RequiredMark />}
                <InfoTooltip text={`목록에 없으면 선택기 안에서 '${producerLabel} 직접 등록'으로 바로 추가할 수 있습니다.`} />
              </label>
              <ProducerSelectorComp value={form.producerId} defaultName={form.producerName}
                onChange={(id, producer) => {
                  form.setProducerId(id ?? null)
                  // 생산자에 국가/지역이 있으면 자동으로 채움 (없으면 기존 값 유지)
                  if (producer?.country) {
                    const code = ISO3166_COUNTRIES.find((c) => c.nameKo === producer.country)?.code ?? null
                    form.setCountryValue(code, producer.country)
                    form.setRegion(producer.region ?? '')
                    // 생산자의 구조화 산지를 기본값으로 사용한다. 미매핑 생산자로 바꿀 때는
                    // 이전 생산자의 코드가 남지 않도록 반드시 null 로 함께 덮어쓴다.
                    form.setRegionCode(producer.regionCode ?? null)
                  }
                }}
                type={CATEGORY_TO_PRODUCER_TYPE[category]}
                onCreateNew={handleCreateProducerFinal}
                defaultCountry={ISO3166_COUNTRIES.find((c) => c.code === form.countryCode)?.nameKo ?? ''} />
              {errors.producerId && <p className="text-xs text-red-500 mt-1">{errors.producerId}</p>}
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
            <div data-field="country">
              <label className={LABEL}>
                {category === 'WINE' ? '국가 / 산지' : '국가 / 지역'}
                {requireProduction && <RequiredMark />}
                {category === 'WINE' && (
                  <InfoTooltip text="산지를 고르면 사용자 상세 페이지에 국가 지도와 확대 지도로 산지가 표시됩니다. 세부 산지는 선택 사항입니다." />
                )}
              </label>
              <CountryRegionSelector
                countryCode={form.countryCode} regionNameKo={form.region}
                onCountryChange={form.setCountryValue}
                onRegionChange={form.setRegion}
                category={category}
                regionCode={form.regionCode}
                onRegionCodeChange={form.setRegionCode}
                admin={admin}
              />
              {/* 선택한 산지가 사용자 화면에 어떻게 보이는지 즉시 확인 — 잘못 고른 산지를 저장 전에 잡는다 */}
              {REGION_CATALOG_CATEGORIES.includes(category) && form.regionCode && (
                <WineRegionPreview
                  regionCode={form.regionCode}
                  category={category}
                  className="mt-3"
                />
              )}
              {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country}</p>}
            </div>
          </div>
        )}

        {/* ④ 공통 상세 정보 — 표시할 필드가 있는 카테고리만 카드로 렌더한다
            (와인은 전 항목이 빈티지로 대체되어 숨겨지므로 빈 카드가 생기지 않게 한다) */}
        {hasCommonDetailFields(category) && (
          <div className={CARD}>
            <SpiritCommonDetailSection
              value={form.commonDetail}
              onChange={form.updateCommon}
              dateErrors={{ distilledDate: errors.distilledDate, bottledDate: errors.bottledDate }}
              category={category}
              admin={admin}
            />
          </div>
        )}
      </div>

      {/* ═══ 중앙: ③ 카테고리 상세 및 에디션 ═══ */}
      <div className={`space-y-6 ${isWhisky ? '' : 'lg:col-span-3'}`}>
        {!category ? (
          <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 py-12 text-center">
            <p className="text-sm text-neutral-400">카테고리를 먼저 선택하면 상세 입력 항목이 표시됩니다.</p>
          </div>
        ) : (
          <>
            {/* 하위 에디션 설정 카드 — 에디션 분리는 위스키 전용이다.
                카테고리 전환 시 상태를 초기화하지만, 조건에서도 카테고리를 확인해
                어떤 경로로든 다른 카테고리에 에디션 목록이 노출되지 않게 한다. */}
            {isWhisky && form.isVariantSplit && (
              <div className={CARD}>
                <SectionTitle title="하위 에디션 목록" hint="각 에디션별 개별 정보 입력" />

                <SeriesIdentifierFields
                  variantType={form.variantType}
                  seriesIdentifier={form.seriesIdentifier}
                  seriesIdentifierEn={form.seriesIdentifierEn}
                  errors={errors}
                  onSeriesIdentifierChange={form.setSeriesIdentifier}
                  onSeriesIdentifierEnChange={form.setSeriesIdentifierEn}
                />

                {/* 탭 바 (다중 에디션 허용 시에만 노출 — 사용자 등록 요청 화면은 1개로 고정) */}
                {allowMultipleVariants && (
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-200 pb-3 mb-4">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={form.variants.map((v, idx) => (v as any).tempId || `temp-${idx}`)}
                        strategy={horizontalListSortingStrategy}
                      >
                        {form.variants.map((v, idx) => (
                          <SortableTab
                            key={(v as any).tempId || `temp-${idx}`}
                            id={(v as any).tempId || `temp-${idx}`}
                            index={idx}
                            variant={v}
                            isActive={activeVariantIdx === idx}
                            onClick={() => setActiveVariantIdx(idx)}
                            onRemove={() => form.removeVariant(idx)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>

                    <button
                      type="button"
                      onClick={() => {
                        form.addVariant()
                        setActiveVariantIdx(form.variants.length)
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-neutral-300 hover:border-amber-400 text-neutral-500 hover:text-amber-700 flex items-center gap-1 transition-all bg-white cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      에디션 추가
                    </button>
                  </div>
                )}

                {/* 활성화된 에디션 정보 및 상세 */}
                {form.variants.length > 0 && form.variants[activeVariantIdx] ? (
                  <VariantItemCard
                    index={activeVariantIdx}
                    variant={form.variants[activeVariantIdx]}
                    category={category}
                    errors={errors}
                    onUpdate={(updates) => form.updateVariant(activeVariantIdx, updates)}
                    onUpdateCommon={(updates) => form.updateVariantCommon(activeVariantIdx, updates)}
                    onUpdateWhisky={(updates) => form.updateVariantWhisky(activeVariantIdx, updates)}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-8 text-center text-neutral-400 text-sm">
                    등록된 에디션이 없습니다. '+ 에디션 추가' 버튼을 눌러 에디션을 등록해주세요.
                  </div>
                )}
              </div>
            )}

            {/* 카테고리별 상세 카드 */}
            {(!form.isVariantSplit || category !== 'WHISKY') && (
              <div className={CARD}>
                <SectionTitle title={`${CATEGORY_LABEL[category]} 상세`} />
                {category === 'WHISKY' && (
                  <div className="space-y-6">
                    <SpiritCommonDetailSection
                      value={form.commonDetail}
                      onChange={form.updateCommon}
                      dateErrors={{ distilledDate: errors.distilledDate, bottledDate: errors.bottledDate }}
                      category={category}
                      admin={admin}
                    />
                    <div className="pt-5 border-t border-neutral-200">
                      <WhiskyDetailSection value={form.whiskyDetail} onChange={form.updateWhisky} />
                    </div>
                  </div>
                )}
                {category === 'WINE' && (
                  <WineDetailSection
                    value={form.wineDetail}
                    onChange={form.updateWine}
                    errors={errors}
                    admin={admin}
                  />
                )}
                {category === 'COGNAC' && (
                  <CognacDetailSection value={form.cognacDetail} onChange={form.updateCognac} errors={errors} />
                )}
                {category === 'OTHER' && (
                  <OtherDetailSection value={form.otherDetail} onChange={form.updateOther} errors={errors} />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ 우측: 캐스크 전용 컬럼 (위스키만) ═══
          입력이 길어 스크롤이 과해지는 것을 막고, 에디션 분리 시에는
          현재 열린 에디션의 캐스크를 여기서 편집한다. */}
      {isWhisky && category && (
        <div className="space-y-6">
          <div className={`${CARD} lg:sticky lg:top-4`}>
            <SectionTitle
              title="캐스크"
              hint={caskTarget.label ?? '마스터 공통'}
            />
            {caskTarget.label && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 -mt-1">
                지금 편집 중인 에디션의 캐스크입니다. 에디션 탭을 바꾸면 이 영역도 함께 바뀝니다.
              </p>
            )}
            <WhiskyCaskSection value={caskTarget.value} onChange={caskTarget.onChange} />
          </div>
        </div>
      )}

      {bottomSlot && (
        <div className={isWhisky ? 'lg:col-span-3' : 'lg:col-span-5'}>{bottomSlot}</div>
      )}
    </div>
  )
}

/**
 * 폼 형태 → 요청 형태 변환 (위스키 상세).
 *
 * <p>하위 에디션은 상태를 요청 DTO 형태(`WhiskyDetailRequest`)로 들고 있고
 * 입력 컴포넌트는 폼 형태(`WhiskyDetailForm`)를 쓰기 때문에 경계에서 변환한다.
 * 에디션 카드와 **캐스크 전용 컬럼**이 같은 변환을 써야 하므로 모듈 함수로 둔다.
 */
function toWhiskyDetailRequest(u: Partial<WhiskyDetailForm>): Partial<WhiskyDetailRequest> {
  const converted: Partial<WhiskyDetailRequest> = {}
  if (u.style !== undefined) converted.style = u.style || null
  if (u.styleOther !== undefined) converted.styleOther = u.styleOther || null
  if (u.brandName !== undefined) converted.brandName = u.brandName || null
  if (u.bottlingType !== undefined) converted.bottlingType = u.bottlingType || null
  if (u.caskTypes !== undefined) converted.caskTypes = u.caskTypes
  if (u.caskFinishes !== undefined) converted.caskFinishes = u.caskFinishes
  if (u.caskTypeOther !== undefined) converted.caskTypeOther = u.caskTypeOther || null
  if (u.caskDetails !== undefined) converted.caskDetails = u.caskDetails
  if (u.isNonChillFiltered !== undefined) converted.isNonChillFiltered = u.isNonChillFiltered
  if (u.isNaturalColour !== undefined) converted.isNaturalColour = u.isNaturalColour
  if (u.isSingleCask !== undefined) converted.isSingleCask = u.isSingleCask
  if (u.isCaskStrength !== undefined) converted.isCaskStrength = u.isCaskStrength
  if (u.isPeated !== undefined) {
    converted.isPeated = u.isPeated
    if (!u.isPeated) {
      converted.phenolPpm = null
      converted.phenolPpmMin = null
      converted.phenolPpmMax = null
    }
  }
  if (u.phenolPpm !== undefined) {
    converted.phenolPpm = u.phenolPpm === '' ? null : Number(u.phenolPpm)
  }
  if (u.phenolPpmMin !== undefined) {
    converted.phenolPpmMin = u.phenolPpmMin === '' ? null : Number(u.phenolPpmMin)
  }
  if (u.phenolPpmMax !== undefined) {
    converted.phenolPpmMax = u.phenolPpmMax === '' ? null : Number(u.phenolPpmMax)
  }
  if (u.notes !== undefined) converted.notes = u.notes || null
  return converted
}

function toWhiskyDetailForm(detail?: WhiskyDetailRequest): WhiskyDetailForm {
  if (!detail) return DEFAULT_WHISKY
  return {
    style: detail.style ?? '',
    styleOther: detail.styleOther ?? '',
    brandName: detail.brandName ?? '',
    bottlingType: detail.bottlingType ?? '',
    caskTypes: detail.caskTypes ?? [],
    caskFinishes: detail.caskFinishes ?? [],
    caskTypeOther: detail.caskTypeOther ?? '',
    caskDetails: detail.caskDetails ?? {},
    isNonChillFiltered: !!detail.isNonChillFiltered,
    isNaturalColour: !!detail.isNaturalColour,
    isSingleCask: !!detail.isSingleCask,
    isCaskStrength: !!detail.isCaskStrength,
    isPeated: !!detail.isPeated,
    phenolPpm: detail.phenolPpm?.toString() ?? '',
    phenolPpmMin: detail.phenolPpmMin?.toString() ?? '',
    phenolPpmMax: detail.phenolPpmMax?.toString() ?? '',
    notes: detail.notes ?? '',
  }
}

function toCommonDetailForm(detail?: SpiritCommonDetailRequest): CommonDetailForm {
  if (!detail) return DEFAULT_COMMON_DETAIL
  return {
    isNas: !!detail.isNas,
    ageStatement: detail.ageStatement ?? null,
    ageStatementMonths: detail.ageStatementMonths ?? null,
    ageStatementMin: detail.ageStatementMin ?? null,
    ageStatementMinMonths: detail.ageStatementMinMonths ?? null,
    ageStatementMax: detail.ageStatementMax ?? null,
    ageStatementMaxMonths: detail.ageStatementMaxMonths ?? null,
    distilledDate: detail.distilledDate ?? '',
    bottledDate: detail.bottledDate ?? '',
    releaseDate: detail.releaseDate ?? '',
    volumeMl: detail.volumeMl?.toString() ?? '',
    abv: detail.abv?.toString() ?? '',
    bottleNo: detail.bottleNo ?? '',
    batchNo: detail.batchNo ?? '',
    totalBottles: detail.totalBottles?.toString() ?? '',
  }
}

interface SeriesIdentifierFieldsProps {
  variantType: 'NONE' | CreateVariantRequest['variantType']
  seriesIdentifier: string
  seriesIdentifierEn: string
  errors: Record<string, string>
  onSeriesIdentifierChange: (value: string) => void
  onSeriesIdentifierEnChange: (value: string) => void
}

function SeriesIdentifierFields({
  variantType,
  seriesIdentifier,
  seriesIdentifierEn,
  errors,
  onSeriesIdentifierChange,
  onSeriesIdentifierEnChange,
}: SeriesIdentifierFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="flex items-center text-[11px] font-semibold text-neutral-600 mb-1">
          한글 시리즈 식별자 <RequiredMark />
          <InfoTooltip text="모든 하위 에디션이 공유하는 이름 조각입니다. 예: .3 Series, 1993 29 Year Old, Batch Series" />
        </label>
        <input
          type="text"
          data-field="seriesIdentifier"
          required
          aria-required="true"
          value={seriesIdentifier}
          onChange={(e) => onSeriesIdentifierChange(e.target.value)}
          placeholder={
            variantType === 'BATCH'
              ? '예) Batch Series, .3 Series'
              : variantType === 'RELEASE_YEAR'
              ? '예) Annual Release'
              : '예) 1993 29 Year Old'
          }
          maxLength={100}
          className={`w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white ${
            errors.seriesIdentifier ? 'border-red-400' : ''
          }`}
        />
        {errors.seriesIdentifier && (
          <p className="text-[10px] text-red-500 mt-1">{errors.seriesIdentifier}</p>
        )}
      </div>
      <div>
        <label className="flex items-center text-[11px] font-semibold text-neutral-600 mb-1">
          영문 시리즈 식별자
          <InfoTooltip text="영문 화면에서 사용할 공유 식별자입니다. 비우면 한글 시리즈 식별자를 fallback으로 사용합니다." />
        </label>
        <input
          type="text"
          data-field="seriesIdentifierEn"
          value={seriesIdentifierEn}
          onChange={(e) => onSeriesIdentifierEnChange(e.target.value)}
          placeholder={
            variantType === 'BATCH'
              ? 'e.g. Batch Series, .3 Series'
              : variantType === 'RELEASE_YEAR'
              ? 'e.g. Annual Release'
              : 'e.g. 1993 29 Year Old'
          }
          maxLength={100}
          className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
        />
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
}

function VariantItemCard({
  index,
  variant,
  category,
  errors,
  onUpdate,
  onUpdateCommon,
  onUpdateWhisky,
}: VariantItemCardProps) {
  const whiskyFormValue = toWhiskyDetailForm(variant.whiskyDetail)

  const handleWhiskyChange = (u: Partial<WhiskyDetailForm>) => {
    onUpdateWhisky(toWhiskyDetailRequest(u))
  }

  const handleCommonChange = (u: Partial<CommonDetailForm>) => {
    const converted: Partial<SpiritCommonDetailRequest> = {}
    if (u.isNas !== undefined) converted.isNas = u.isNas
    if (u.ageStatement !== undefined) converted.ageStatement = u.ageStatement
    if (u.ageStatementMonths !== undefined) converted.ageStatementMonths = u.ageStatementMonths
    if (u.ageStatementMin !== undefined) converted.ageStatementMin = u.ageStatementMin
    if (u.ageStatementMinMonths !== undefined) converted.ageStatementMinMonths = u.ageStatementMinMonths
    if (u.ageStatementMax !== undefined) converted.ageStatementMax = u.ageStatementMax
    if (u.ageStatementMaxMonths !== undefined) converted.ageStatementMaxMonths = u.ageStatementMaxMonths
    if (u.distilledDate !== undefined) converted.distilledDate = u.distilledDate || null
    if (u.bottledDate !== undefined) converted.bottledDate = u.bottledDate || null
    if (u.releaseDate !== undefined) converted.releaseDate = u.releaseDate || null
    if (u.bottleNo !== undefined) converted.bottleNo = u.bottleNo || null
    if (u.batchNo !== undefined) converted.batchNo = u.batchNo || null
    if (u.totalBottles !== undefined) {
      converted.totalBottles = u.totalBottles === '' ? null : Number(u.totalBottles)
    }
    onUpdateCommon(converted)
  }

  return (
    <div className="bg-neutral-50/50 rounded-2xl border border-neutral-200/80 p-5 space-y-6 text-left">
      {/* 에디션 기본 정보 */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">에디션 기본 정보</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
              식별 값(한글) <RequiredMark />
            </label>
            <input
              type="text"
              data-field={`variantValue_${index}`}
              required
              aria-required="true"
              value={variant.variantValue}
              onChange={(e) => onUpdate({ variantValue: e.target.value })}
              placeholder={
                variant.variantType === 'BATCH'
                  ? '예) 배치 11'
                  : variant.variantType === 'RELEASE_YEAR'
                  ? '예) 2024 릴리즈'
                  : '예) 캐스크 #1234'
              }
              className={`w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white ${
                errors[`variantValue_${index}`] ? 'border-red-400' : ''
              }`}
            />
            {errors[`variantValue_${index}`] && (
              <p className="text-[10px] text-red-500 mt-1">{errors[`variantValue_${index}`]}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">식별 값(영문)</label>
            <input
              type="text"
              data-field={`variantValueEn_${index}`}
              value={variant.variantValueEn ?? ''}
              onChange={(e) => onUpdate({ variantValueEn: e.target.value })}
              placeholder={
                variant.variantType === 'BATCH'
                  ? '예) Batch 11'
                  : variant.variantType === 'RELEASE_YEAR'
                  ? '예) 2024 Release'
                  : '예) Cask #1234'
              }
              className={`w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white ${
                errors[`variantValueEn_${index}`] ? 'border-red-400' : ''
              }`}
            />
            {errors[`variantValueEn_${index}`] && (
              <p className="text-[10px] text-red-500 mt-1">{errors[`variantValueEn_${index}`]}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">알코올 도수</label>
            <div className="relative">
              <input
                type="number"
                data-field={`variantAbv_${index}`}
                step="0.1"
                min="0"
                max="100"
                value={variant.abv ?? ''}
                onChange={(e) => onUpdate({ abv: e.target.value === '' ? null : Number(e.target.value) })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="예) 46.3"
                className={`w-full px-2.5 py-1.5 pr-6 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white ${
                  errors[`variantAbv_${index}`] ? 'border-red-400' : ''
                }`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 pointer-events-none">%</span>
            </div>
            {errors[`variantAbv_${index}`] && (
              <p className="text-[10px] text-red-500 mt-1">{errors[`variantAbv_${index}`]}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1">용량</label>
            <div className="relative">
              <input
                type="number"
                data-field={`variantVolumeMl_${index}`}
                min={VOLUME_ML_MIN}
                max={VOLUME_ML_MAX}
                value={variant.volumeMl ?? ''}
                onChange={(e) => onUpdate({ volumeMl: e.target.value === '' ? null : Number(e.target.value) })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="예) 700"
                className={`w-full px-2.5 py-1.5 pr-8 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white ${
                  errors[`variantVolumeMl_${index}`] ? 'border-red-400' : ''
                }`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 pointer-events-none">ml</span>
            </div>
            {errors[`variantVolumeMl_${index}`] && (
              <p className="text-[10px] text-red-500 mt-1">{errors[`variantVolumeMl_${index}`]}</p>
            )}
          </div>
        </div>
      </div>

      {category === 'WHISKY' && (
        <div className="pt-5 border-t border-neutral-200 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-4">에디션 위스키 상세</h4>
            <SpiritCommonDetailSection
              value={toCommonDetailForm(variant.commonDetail)}
              onChange={handleCommonChange}
              dateErrors={{
                distilledDate: errors[`variantDistilledDate_${index}`],
                bottledDate: errors[`variantBottledDate_${index}`]
              }}
              category={category}
            />
          </div>
          <div className="pt-5 border-t border-neutral-200">
            <WhiskyDetailSection
              value={whiskyFormValue}
              onChange={handleWhiskyChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}
