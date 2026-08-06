/**
 * 조사 프롬프트(docs/*-research-prompt.md)가 만들어 준 JSON → 관리자 주류 등록 폼.
 *
 * <p>AI 가 조사해 온 JSON 을 관리자가 붙여넣으면 폼 입력칸을 채운다. **저장·등록은 하지 않는다** —
 * 채운 뒤 사람이 눈으로 확인하고 직접 등록 버튼을 누른다.
 *
 * <p>허용 값 목록은 폼이 쓰는 것과 **같은 소스**를 참조한다. 여기서 목록을 다시 적으면
 * 폼에는 있는데 붙여넣기는 거부하는(또는 그 반대인) 값이 생긴다.
 *
 * <p>설계 원칙
 * <ul>
 *   <li><b>모르는 값은 버리고 알린다.</b> 허용 목록에 없는 enum 을 그대로 넣으면 화면에는
 *       아무것도 선택되지 않은 것처럼 보이면서 저장 시 400 이 난다 — 조용한 실패가 최악이다.</li>
 *   <li><b>길이 초과는 잘라내고 알린다.</b> 그대로 넣으면 백엔드 @Size 에서 400 이 난다.</li>
 *   <li>적용한 항목·경고를 모두 돌려줘 화면이 "무엇이 들어갔는지" 보여줄 수 있게 한다.</li>
 * </ul>
 */
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import { COGNAC_GRADES, COGNAC_CRUS, COGNAC_OAK_TYPES } from '@/domain/spirit/data/cognac'
import {
  WINE_SWEETNESS_SCALE, WINE_BODY_SCALE, WINE_INTENSITY_SCALE,
} from '@/domain/spirit/data/wineTasteScale'
import {
  ABV_MIN, ABV_MAX, VOLUME_ML_MIN, VOLUME_ML_MAX, YEAR_MIN,
} from '@/domain/spirit/data/spiritLimits'
import {
  WHISKY_STYLES, BROAD_CASK_CATEGORIES, BOTTLING_TYPES, VARIANT_TYPES,
} from '@/domain/spirit/data/whisky'
import {
  WINE_TYPES, CERTIFICATIONS, HARVEST_METHODS, FERMENTATION_VESSELS, WINE_VINTAGE_STATUSES,
} from '@/domain/spirit/data/wine'
// 타입 전용 import — 테스트 로더가 .tsx 를 읽지 않도록 반드시 `import type` 을 유지할 것
import type { SpiritFormApi } from '@/domain/admin/components/SpiritFormFields'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER']
const WHISKY_STYLE_CODES = WHISKY_STYLES.map(([v]) => v)
const CASK_CODES = BROAD_CASK_CATEGORIES.map((c) => c.code)
const WINE_TYPE_CODES = WINE_TYPES.map(([v]) => v)
const CERTIFICATION_CODES = CERTIFICATIONS.map(([v]) => v)
const VINTAGE_STATUSES = [...WINE_VINTAGE_STATUSES]
type VariantTypeCode = (typeof VARIANT_TYPES)[number] | 'VINTAGE'

/** 백엔드 @Size 와 같은 값 — 초과분은 잘라내고 경고한다 */
const MAX = {
  name: 200, notes: 500, blendDetail: 300, caskFinish: 200, brandName: 200,
  styleOther: 100, appellation: 200, soilType: 100, oakType: 100, caskDetail: 100,
  harvestMethod: 50, fermentationVessel: 100, grapeName: 100,
  batchNo: 100, bottleNo: 50, seriesIdentifier: 100,
}

const YEAR_MONTH_RE = /^\d{4}(-(0[1-9]|1[0-2]))?$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface ImportWarning {
  /** 화면에 보여줄 항목 이름 (한국어) */
  label: string
  message: string
}

/** 폼에 적용할 정규화 결과. 값이 `undefined` 인 키는 건드리지 않는다. */
export interface ImportPlan {
  category: SpiritCategory
  /** 화면 보고용 — 실제로 채운 항목 이름 */
  applied: string[]
  warnings: ImportWarning[]
  /** 생산자는 이름만 알 수 있어 화면에서 조회·선택해야 한다 */
  producerName: string | null
  /** 비어 있으면 등록이 막히는 필수 항목 — 붙여넣기 직후에 알려 준다 */
  missingRequired: string[]
  /**
   * 프롬프트가 함께 내놓는 신뢰도 신호. 폼에 들어가지는 않지만
   * **버리면 안 된다** — 등록 전에 사람이 확인해야 할 근거다.
   */
  meta: {
    confidence: string | null
    uncertain: string[]
    sources: string[]
    nameKoBasis: string | null
  }
  fields: {
    nameKo?: string
    nameEn?: string
    countryCode?: string | null
    country?: string
    region?: string
    regionCode?: string | null
    /** 도수 범위 지정 — 단일 도수는 `commonDetail.abv` 에 들어간다 */
    isAbvRange?: boolean
    abvMin?: string
    abvMax?: string
  }
  commonDetail: Record<string, unknown>
  whiskyDetail: Record<string, unknown>
  wineDetail: Record<string, unknown>
  cognacDetail: Record<string, unknown>
  variants: {
    variantType: VariantTypeCode
    seriesIdentifier: string
    seriesIdentifierEn: string
    items: Array<Record<string, unknown>>
  } | null
}

// ── 파싱 ────────────────────────────────────────────────

export interface ParseSuccess { ok: true; items: Record<string, unknown>[] }
export interface ParseFailure { ok: false; error: string }

/**
 * 붙여넣은 텍스트에서 JSON 을 꺼낸다.
 * AI 가 ```json 코드펜스나 앞뒤 설명을 붙여 오는 경우가 많아 그것까지 흡수한다.
 */
export function parseSpiritResearchJson(text: string): ParseSuccess | ParseFailure {
  const trimmed = (text ?? '').trim()
  if (!trimmed) return { ok: false, error: 'JSON 을 붙여넣어 주세요.' }

  // ```json ... ``` 펜스 제거
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed)
  let body = (fenced ? fenced[1] : trimmed).trim()

  // 앞뒤 설명 문장이 붙어 있으면 가장 바깥 { } 또는 [ ] 만 취한다
  if (!/^[[{]/.test(body)) {
    const start = body.search(/[[{]/)
    const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'))
    if (start < 0 || end <= start) return { ok: false, error: 'JSON 형식을 찾지 못했습니다.' }
    body = body.slice(start, end + 1)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch (e) {
    return { ok: false, error: `JSON 을 읽지 못했습니다: ${(e as Error).message}` }
  }

  const items = Array.isArray(parsed) ? parsed : [parsed]
  if (items.length === 0) return { ok: false, error: '항목이 비어 있습니다.' }
  if (items.some((i) => typeof i !== 'object' || i === null)) {
    return { ok: false, error: 'JSON 객체 또는 객체 배열이어야 합니다.' }
  }
  return { ok: true, items: items as Record<string, unknown>[] }
}

// ── 값 정규화 헬퍼 ───────────────────────────────────────

class PlanBuilder {
  applied: string[] = []
  warnings: ImportWarning[] = []

  mark(label: string) { this.applied.push(label) }
  warn(label: string, message: string) { this.warnings.push({ label, message }) }

  /** 허용 목록에 있는 값만 통과. 대소문자·공백은 흡수한다. */
  enumValue(label: string, raw: unknown, allowed: string[]): string | undefined {
    if (raw == null || raw === '') return undefined
    const v = String(raw).trim().toUpperCase().replace(/[\s-]+/g, '_')
    if (!allowed.includes(v)) {
      this.warn(label, `'${raw}' 는 허용 값이 아닙니다 (${allowed.join(', ')}). 건너뜁니다.`)
      return undefined
    }
    this.mark(label)
    return v
  }

  /** 자유 문자열 — 길이 초과는 잘라내고 알린다 */
  text(label: string, raw: unknown, max: number): string | undefined {
    if (raw == null || raw === '') return undefined
    const s = String(raw).trim()
    if (!s) return undefined
    this.mark(label)
    if (s.length > max) {
      this.warn(label, `${max}자를 넘어 잘랐습니다 (원본 ${s.length}자). 내용을 확인하세요.`)
      return s.slice(0, max)
    }
    return s
  }

  /** 허용 목록의 문자열을 **그대로** 요구하는 값(드롭다운) */
  exact(label: string, raw: unknown, allowed: string[]): string | undefined {
    if (raw == null || raw === '') return undefined
    const s = String(raw).trim()
    if (!allowed.includes(s)) {
      this.warn(label, `'${s}' 는 선택지에 없습니다 (${allowed.join(' / ')}). 건너뜁니다.`)
      return undefined
    }
    this.mark(label)
    return s
  }

  num(label: string, raw: unknown, min: number, max: number): number | undefined {
    if (raw == null || raw === '') return undefined
    const n = Number(raw)
    if (!Number.isFinite(n)) {
      this.warn(label, `'${raw}' 는 숫자가 아닙니다. 건너뜁니다.`)
      return undefined
    }
    if (n < min || n > max) {
      this.warn(label, `${n} 은 허용 범위(${min}~${max})를 벗어납니다. 건너뜁니다.`)
      return undefined
    }
    this.mark(label)
    return n
  }

  bool(label: string, raw: unknown): boolean | undefined {
    if (raw == null) return undefined
    if (typeof raw !== 'boolean') {
      this.warn(label, `'${raw}' 는 true/false 가 아닙니다. 건너뜁니다.`)
      return undefined
    }
    this.mark(label)
    return raw
  }

  yearMonth(label: string, raw: unknown): string | undefined {
    if (raw == null || raw === '') return undefined
    const s = String(raw).trim()
    if (!YEAR_MONTH_RE.test(s)) {
      this.warn(label, `'${s}' 는 YYYY 또는 YYYY-MM 형식이 아닙니다. 건너뜁니다.`)
      return undefined
    }
    this.mark(label)
    return s
  }

  isoDate(label: string, raw: unknown): string | undefined {
    if (raw == null || raw === '') return undefined
    const s = String(raw).trim()
    if (!DATE_RE.test(s)) {
      this.warn(label, `'${s}' 는 YYYY-MM-DD 형식이 아닙니다. 건너뜁니다.`)
      return undefined
    }
    this.mark(label)
    return s
  }
}

/** `undefined` 값을 걸러 낸 객체 — 폼 업데이트가 기존 값을 지우지 않게 한다 */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

const str = (v: unknown) => (v == null ? '' : String(v))

// ── 계획 수립 ────────────────────────────────────────────

export interface BuildFailure { ok: false; error: string }
export interface BuildSuccess { ok: true; plan: ImportPlan }

export function buildImportPlan(raw: Record<string, unknown>): BuildSuccess | BuildFailure {
  const b = new PlanBuilder()

  const category = String(raw.category ?? '').trim().toUpperCase() as SpiritCategory
  if (!CATEGORIES.includes(category)) {
    return {
      ok: false,
      error: `category 가 없거나 올바르지 않습니다 ('${raw.category ?? ''}'). `
        + `${CATEGORIES.join(' / ')} 중 하나여야 합니다.`,
    }
  }

  // ── 기본 정보 ──
  const fields: ImportPlan['fields'] = compact({
    nameKo: b.text('한국어 이름', raw.nameKo, MAX.name),
    nameEn: b.text('영어 이름', raw.nameEn, MAX.name),
    region: b.text('지역', raw.region, 100),
  })

  // 단일 도수·용량은 공통 상세(commonDetail)가 소유하고, 범위 지정만 최상위 상태다.
  const spec: Record<string, unknown> = {}
  const abv = b.num('알코올 도수', raw.abv, ABV_MIN, ABV_MAX)
  if (abv !== undefined) {
    spec.abv = String(abv)
    fields.isAbvRange = false
  } else {
    const lo = b.num('도수 최소', raw.abvMin, ABV_MIN, ABV_MAX)
    const hi = b.num('도수 최대', raw.abvMax, ABV_MIN, ABV_MAX)
    if (lo !== undefined && hi !== undefined) {
      fields.abvMin = String(lo)
      fields.abvMax = String(hi)
      fields.isAbvRange = true
    }
  }

  const volume = b.num('용량', raw.volumeMl, VOLUME_ML_MIN, VOLUME_ML_MAX)
  if (volume !== undefined) spec.volumeMl = String(volume)

  // 국가는 ISO3166 한글 국가명과 정확히 맞아야 선택기가 인식한다.
  // 프롬프트가 '영국(스코틀랜드)' 처럼 보조 정보를 붙여 오는 경우가 있어 괄호를 떼고 한 번 더 본다.
  const countryRaw = str(raw.country).trim()
  if (countryRaw) {
    const base = countryRaw.replace(/\s*[（(].*$/, '').trim()
    const hit = ISO3166_COUNTRIES.find((c) => c.nameKo === countryRaw)
      ?? ISO3166_COUNTRIES.find((c) => c.nameKo === base)
    if (hit) {
      fields.countryCode = hit.code
      fields.country = hit.nameKo
      b.mark('국가')
    } else {
      b.warn('국가', `'${countryRaw}' 를 국가 목록에서 찾지 못했습니다. 직접 선택해주세요.`)
    }
  }

  // 산지 코드는 카탈로그가 카테고리별로 달라 여기서는 형태만 본다(실재 여부는 화면이 확인).
  const regionCode = str(raw.regionCode).trim()
  if (regionCode) {
    if (/^[A-Z]{2}(_[A-Z0-9]+)+$/.test(regionCode)) {
      fields.regionCode = regionCode
      b.mark('산지 코드')
    } else {
      b.warn('산지 코드', `'${regionCode}' 는 산지 코드 형식이 아닙니다. 건너뜁니다.`)
    }
  }

  const producer = raw.producer as { nameKo?: string; nameEn?: string } | undefined
  const producerName = str(producer?.nameKo || producer?.nameEn).trim() || null

  const plan: ImportPlan = {
    category,
    applied: b.applied,
    warnings: b.warnings,
    producerName,
    missingRequired: [],
    meta: {
      confidence: str(raw._confidence).trim() || null,
      uncertain: Array.isArray(raw._uncertain) ? raw._uncertain.map(str).filter(Boolean) : [],
      sources: Array.isArray(raw._sources) ? raw._sources.map(str).filter(Boolean) : [],
      nameKoBasis: str(raw._nameKoBasis).trim() || null,
    },
    fields,
    commonDetail: spec,
    whiskyDetail: {},
    wineDetail: {},
    cognacDetail: {},
    variants: null,
  }

  const thisYear = new Date().getFullYear()

  if (category === 'COGNAC') {
    plan.cognacDetail = compact({
      grade: b.enumValue('등급', raw.grade, [...COGNAC_GRADES]),
      isFineChampagne: b.bool('Fine Champagne', raw.isFineChampagne),
      vintageYear: numToStr(b.num('빈티지 연도', raw.vintageYear, YEAR_MIN, thisYear)),
      ageYears: numToStr(b.num('표기 숙성연수', raw.ageYears, 0, 100)),
      caskFinish: b.text('캐스크 피니시', raw.caskFinish, MAX.caskFinish),
      blendDetail: b.text('블렌드 설명', raw.blendDetail, MAX.blendDetail),
      notes: b.text('기타 정보', raw.notes, MAX.notes),
      cruComposition: buildCruComposition(b, raw.cruComposition),
      oakTypes: buildEnumList(b, '오크 종류', raw.oakTypes, [...COGNAC_OAK_TYPES]),
    })
    plan.commonDetail = { ...spec, ...buildBottleMeta(b, raw) }
  }

  if (category === 'WHISKY') {
    const style = b.enumValue('위스키 스타일', raw.style, WHISKY_STYLE_CODES)
    plan.whiskyDetail = compact({
      style,
      styleOther: style === 'OTHER' ? b.text('스타일 직접 입력', raw.styleOther, MAX.styleOther) : undefined,
      bottlingType: b.enumValue('병입 구분', raw.bottlingType, [...BOTTLING_TYPES]),
      brandName: b.text('브랜드명', raw.brandName, MAX.brandName),
      isNonChillFiltered: b.bool('Non-Chill Filtered', raw.isNonChillFiltered),
      isNaturalColour: b.bool('Natural Colour', raw.isNaturalColour),
      isSingleCask: b.bool('Single Cask', raw.isSingleCask),
      isCaskStrength: b.bool('Cask Strength', raw.isCaskStrength),
      isPeated: b.bool('Peated', raw.isPeated),
      notes: b.text('기타 정보', raw.notes, MAX.notes),
      ...buildPeat(b, raw),
      ...buildCasks(b, raw.casks),
    })
    plan.commonDetail = { ...spec, ...buildAging(b, raw), ...buildBottleMeta(b, raw) }
    plan.variants = buildEditions(b, raw.editions)
  }

  if (category === 'WINE') {
    if (Array.isArray(raw.vintages) && raw.vintages.length > 0) {
      plan.wineDetail = { vintageStatus: 'UNKNOWN' }
      plan.commonDetail = {}
      plan.variants = buildWineVintages(b, raw, raw.vintages)
    } else {
      // 이전 단일 와인 JSON도 계속 읽는다. 신규 프롬프트는 vintages[] 구조를 사용한다.
      plan.wineDetail = buildWineDetail(b, raw, true)
    }
  }

  if (category === 'OTHER') {
    b.warn('카테고리', '기타 카테고리는 상세 항목 매핑이 없어 기본 정보만 채웁니다.')
  }

  // 폼 검증(validate)이 등록 시 막는 항목을, 붙여넣기 직후에 미리 알려 준다.
  // 규칙 자체는 SpiritFormFields.validate 가 소유한다 — 여기는 안내일 뿐이다.
  if (!plan.fields.nameKo) plan.missingRequired.push('한국어 이름')
  if (!plan.fields.nameEn) plan.missingRequired.push('영어 이름')
  if (!producerName) plan.missingRequired.push('생산자')
  if (!plan.fields.countryCode) plan.missingRequired.push('국가')
  if (category === 'COGNAC' && !plan.cognacDetail.grade) plan.missingRequired.push('등급')
  if (category === 'WHISKY' && !plan.whiskyDetail.style) plan.missingRequired.push('위스키 스타일')
  if (category === 'WINE') {
    if (plan.variants) {
      if (plan.variants.items.some((item) => !(item.wineDetail as Record<string, unknown> | undefined)?.wineType)) {
        plan.missingRequired.push('빈티지별 와인 종류')
      }
      if (plan.variants.items.some((item) => item.abv == null)) plan.missingRequired.push('빈티지별 알코올 도수')
      if (plan.variants.items.some((item) => item.volumeMl == null)) plan.missingRequired.push('빈티지별 용량')
    } else {
      if (!plan.wineDetail.wineType) plan.missingRequired.push('와인 종류')
      if (plan.wineDetail.vintageStatus !== 'NON_VINTAGE' && !plan.wineDetail.vintageYear) {
        plan.missingRequired.push('빈티지 연도')
      }
    }
  }
  // 에디션으로 나뉘면 도수·용량은 에디션마다 받는다(마스터 필수 아님)
  if (!plan.variants) {
    if (!plan.commonDetail.abv && !plan.fields.isAbvRange) plan.missingRequired.push('알코올 도수')
    if (!plan.commonDetail.volumeMl) plan.missingRequired.push('용량')
  }
  if (plan.variants && !plan.variants.seriesIdentifier) plan.missingRequired.push('한글 시리즈 식별자')

  return { ok: true, plan }
}

// ── 폼 적용 ──────────────────────────────────────────────

/** 적용에 필요한 폼 API 만 추린 타입 — 테스트는 이 모양의 가짜 폼을 넘긴다. */
export type ImportTargetForm = Pick<SpiritFormApi,
  | 'reset' | 'setCategory'
  | 'setNameKo' | 'setNameEn' | 'setCountryValue' | 'setRegion' | 'setRegionCode'
  | 'setIsAbvRange' | 'setAbvMin' | 'setAbvMax'
  | 'updateCommon' | 'updateWhisky' | 'updateWine' | 'updateCognac'
  | 'setIsVariantSplit' | 'setVariantType'
  | 'setSeriesIdentifier' | 'setSeriesIdentifierEn' | 'setVariants'
>

/**
 * 계획을 폼에 적용한다. **저장·등록은 하지 않는다.**
 *
 * <p>먼저 `reset()` 으로 폼을 비운다 — 두 번 붙여넣었을 때 이전 값(캐스크 체크·에디션 등)이
 * 남아 섞이면 무엇이 이번 JSON 에서 온 값인지 알 수 없게 된다.
 *
 * <p><b>카테고리는 {@code selectCategory} 가 아니라 {@code setCategory} 로 넣는다.</b>
 * {@code selectCategory} 는 "같은 카테고리면 아무것도 하지 않는다"는 가드가 있는데,
 * 그 비교 대상이 <b>이번 렌더의 값</b>이라 바로 앞의 {@code reset()}(→ null) 이 아직 반영되지 않았다.
 * 이미 꼬냑이 선택된 상태에서 꼬냑 JSON 을 붙여넣으면 가드에 걸려 {@code setCategory} 가 실행되지 않고,
 * {@code reset()} 의 null 만 남아 카테고리 상세 카드가 통째로 사라진다.
 * {@code reset()} 이 이미 산지 코드·에디션·카테고리 상세를 모두 비우므로 가드가 하는 일은 필요 없다.
 */
export function applyImportPlan(form: ImportTargetForm, plan: ImportPlan) {
  form.reset()
  form.setCategory(plan.category)

  const f = plan.fields
  if (f.nameKo !== undefined) form.setNameKo(f.nameKo)
  if (f.nameEn !== undefined) form.setNameEn(f.nameEn)
  if (f.countryCode !== undefined) form.setCountryValue(f.countryCode, f.country ?? '')
  if (f.region !== undefined) form.setRegion(f.region)
  if (f.regionCode !== undefined) form.setRegionCode(f.regionCode)
  if (f.isAbvRange !== undefined) form.setIsAbvRange(f.isAbvRange)
  if (f.abvMin !== undefined) form.setAbvMin(f.abvMin)
  if (f.abvMax !== undefined) form.setAbvMax(f.abvMax)

  if (Object.keys(plan.commonDetail).length > 0) form.updateCommon(plan.commonDetail)
  if (Object.keys(plan.whiskyDetail).length > 0) form.updateWhisky(plan.whiskyDetail)
  if (Object.keys(plan.wineDetail).length > 0) form.updateWine(plan.wineDetail)
  if (Object.keys(plan.cognacDetail).length > 0) form.updateCognac(plan.cognacDetail)

  if (plan.variants) {
    form.setIsVariantSplit(true)
    form.setVariantType(plan.variants.variantType)
    form.setSeriesIdentifier(plan.variants.seriesIdentifier)
    form.setSeriesIdentifierEn(plan.variants.seriesIdentifierEn)
    const { variantType, seriesIdentifier, seriesIdentifierEn } = plan.variants
    form.setVariants(plan.variants.items.map((item) => ({
      tempId: Math.random().toString(),
      variantType,
      variantValue: '',
      variantValueEn: '',
      seriesIdentifier,
      seriesIdentifierEn,
      commonDetail: {},
      whiskyDetail: {},
      ...item,
    })) as Parameters<typeof form.setVariants>[0])
  }
}

const numToStr = (n: number | undefined) => (n === undefined ? undefined : String(n))

function buildEnumList(b: PlanBuilder, label: string, raw: unknown, allowed: string[]): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: string[] = []
  for (const v of raw) {
    const s = String(v).trim().toUpperCase()
    if (!allowed.includes(s)) {
      b.warn(label, `'${v}' 는 허용 값이 아닙니다. 건너뜁니다.`)
      continue
    }
    if (!out.includes(s)) out.push(s)
  }
  if (out.length === 0) return undefined
  b.mark(label)
  return out
}

function buildCruComposition(b: PlanBuilder, raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const rows: Array<{ cru: string; percentage: string }> = []
  let total = 0
  for (const item of raw) {
    const cru = String((item as { cru?: unknown })?.cru ?? '').trim().toUpperCase()
    if (!(COGNAC_CRUS as readonly string[]).includes(cru)) {
      b.warn('크뤼 구성', `'${cru}' 는 법정 6개 크뤼가 아닙니다. 건너뜁니다.`)
      continue
    }
    if (rows.some((r) => r.cru === cru)) {
      b.warn('크뤼 구성', `'${cru}' 가 중복되어 한 번만 넣었습니다.`)
      continue
    }
    const pct = (item as { percentage?: unknown })?.percentage
    const n = pct == null ? null : Number(pct)
    if (n != null && (!Number.isFinite(n) || n < 1 || n > 100)) {
      b.warn('크뤼 구성', `${cru} 의 비율 '${pct}' 가 올바르지 않아 비웠습니다.`)
      rows.push({ cru, percentage: '' })
      continue
    }
    total += n ?? 0
    rows.push({ cru, percentage: n == null ? '' : String(n) })
  }
  if (rows.length === 0) return undefined
  if (total > 100) {
    b.warn('크뤼 구성', `비율 합계가 ${total}% 로 100% 를 넘습니다. 저장 전에 고쳐주세요.`)
  }
  b.mark('크뤼 구성')
  return rows
}

function buildGrapes(b: PlanBuilder, raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const rows: Array<{ name: string; percentage: string }> = []
  let total = 0
  for (const item of raw) {
    const name = String((item as { name?: unknown })?.name ?? '').trim()
    if (!name) continue
    const pct = (item as { percentage?: unknown })?.percentage
    const n = pct == null ? null : Number(pct)
    if (n != null && (!Number.isFinite(n) || n < 1 || n > 100)) {
      b.warn('포도 품종', `${name} 의 비율 '${pct}' 가 올바르지 않아 비웠습니다.`)
      rows.push({ name: name.slice(0, MAX.grapeName), percentage: '' })
      continue
    }
    total += n ?? 0
    rows.push({ name: name.slice(0, MAX.grapeName), percentage: n == null ? '' : String(n) })
  }
  if (rows.length === 0) return undefined
  if (total > 100) {
    b.warn('포도 품종', `비율 합계가 ${total}% 로 100% 를 넘습니다. 저장 전에 고쳐주세요.`)
  }
  b.mark('포도 품종')
  return rows
}

function buildWineDetail(
  b: PlanBuilder,
  raw: Record<string, unknown>,
  includeVintageYear: boolean,
): Record<string, unknown> {
  const vintageStatus = b.enumValue('빈티지 상태', raw.vintageStatus, VINTAGE_STATUSES)
  const isOakAged = b.bool('오크 숙성', raw.isOakAged)
  return compact({
    wineType: b.enumValue('와인 종류', raw.wineType, WINE_TYPE_CODES),
    vintageStatus,
    vintageYear: includeVintageYear
      ? (vintageStatus === 'NON_VINTAGE'
        ? ''
        : numToStr(b.num('빈티지 연도', raw.vintageYear, YEAR_MIN, new Date().getFullYear())))
      : undefined,
    appellationDesignation: b.text('원산지 명칭', raw.appellationDesignation, MAX.appellation),
    soilType: b.text('토양 종류', raw.soilType, MAX.soilType),
    altitudeM: numToStr(b.num('포도밭 고도', raw.altitudeM, 0, 5000)),
    harvestMethod: b.exact('수확 방법', raw.harvestMethod, HARVEST_METHODS),
    fermentationVessel: b.exact('발효 용기', raw.fermentationVessel, FERMENTATION_VESSELS),
    isOakAged,
    oakType: isOakAged === true ? b.text('오크 종류', raw.oakType, MAX.oakType) : undefined,
    oakAgedMonths: isOakAged === true
      ? numToStr(b.num('오크 숙성 기간', raw.oakAgedMonths, 1, 600))
      : undefined,
    isNaturalWine: b.bool('내추럴 와인', raw.isNaturalWine),
    certification: b.enumValue('인증', raw.certification, CERTIFICATION_CODES),
    sweetness: b.enumValue('당도', raw.sweetness, [...WINE_SWEETNESS_SCALE]),
    body: b.enumValue('바디', raw.body, [...WINE_BODY_SCALE]),
    acidity: b.enumValue('산도', raw.acidity, [...WINE_INTENSITY_SCALE]),
    tannin: b.enumValue('타닌', raw.tannin, [...WINE_INTENSITY_SCALE]),
    notes: b.text('기타 정보', raw.notes, MAX.notes),
    grapeVarieties: buildGrapes(b, raw.grapeVarieties),
  })
}

/** 신규 와인 조사 JSON의 vintages[]를 관리자 빈티지 하위 항목으로 바꾼다. */
function buildWineVintages(
  b: PlanBuilder,
  master: Record<string, unknown>,
  vintages: unknown[],
): ImportPlan['variants'] {
  const items: Array<Record<string, unknown>> = []
  const seen = new Set<string>()
  for (const candidate of vintages) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      b.warn('빈티지', '객체가 아닌 빈티지 항목을 건너뜁니다.')
      continue
    }
    const merged = { ...master, ...(candidate as Record<string, unknown>) }
    const status = b.enumValue('빈티지 상태', merged.vintageStatus, VINTAGE_STATUSES)
    const year = status === 'VINTAGE'
      ? b.num('빈티지 연도', merged.vintageYear, YEAR_MIN, new Date().getFullYear())
      : undefined
    const key = status === 'NON_VINTAGE' ? 'NV' : (year == null ? '' : String(year))
    if (!key) {
      b.warn('빈티지', '빈티지 연도 또는 NON_VINTAGE 상태가 없어 항목을 건너뜁니다.')
      continue
    }
    if (seen.has(key)) {
      b.warn('빈티지', `'${key}' 항목이 중복되어 한 번만 적용했습니다.`)
      continue
    }
    seen.add(key)
    const wineDetail = buildWineDetail(b, { ...merged, vintageStatus: status }, false)
    items.push({
      variantValue: key,
      variantValueEn: key,
      vintageYear: status === 'VINTAGE' ? year : null,
      abv: b.num('빈티지 도수', merged.abv, ABV_MIN, ABV_MAX),
      volumeMl: b.num('빈티지 용량', merged.volumeMl, VOLUME_ML_MIN, VOLUME_ML_MAX),
      commonDetail: {},
      wineDetail,
    })
  }
  if (items.length === 0) return null
  b.mark(`빈티지 ${items.length}건`)
  return {
    variantType: 'VINTAGE',
    seriesIdentifier: '빈티지',
    seriesIdentifierEn: 'Vintage',
    items,
  }
}

function buildPeat(b: PlanBuilder, raw: Record<string, unknown>) {
  if (raw.isPeated !== true) return {}
  const single = b.num('피트 강도', raw.phenolPpm, 0, 999)
  if (single !== undefined) return { phenolPpm: String(single) }
  const lo = b.num('피트 강도 최소', raw.phenolPpmMin, 0, 999)
  const hi = b.num('피트 강도 최대', raw.phenolPpmMax, 0, 999)
  if (lo !== undefined && hi !== undefined) {
    return { phenolPpmMin: String(lo), phenolPpmMax: String(hi) }
  }
  return {}
}

function buildCasks(b: PlanBuilder, raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) return {}
  const caskTypes: string[] = []
  const caskFinishes: string[] = []
  const caskDetails: Record<string, string[]> = {}
  for (const item of raw) {
    const code = String((item as { code?: unknown })?.code ?? '').trim().toUpperCase()
    if (!CASK_CODES.includes(code)) {
      b.warn('캐스크', `'${code}' 는 캐스크 대분류가 아닙니다. 건너뜁니다.`)
      continue
    }
    if (!caskTypes.includes(code)) caskTypes.push(code)
    if ((item as { isFinish?: unknown })?.isFinish === true && !caskFinishes.includes(code)) {
      caskFinishes.push(code)
    }
    const details = (item as { details?: unknown })?.details
    const list = Array.isArray(details)
      ? details.map((d) => String(d).trim().slice(0, MAX.caskDetail)).filter(Boolean)
      : []
    caskDetails[code] = list.length > 0 ? list : ['']
  }
  if (caskTypes.length === 0) return {}
  b.mark('캐스크')
  return { caskTypes, caskFinishes, caskDetails }
}

/** 숙성 연수 — 위스키 전용(꼬냑·와인은 폼에서 숨겨진다) */
function buildAging(b: PlanBuilder, raw: Record<string, unknown>) {
  const isNas = b.bool('NAS', raw.isNas)
  if (isNas === true) return { isNas: true }
  const out: Record<string, unknown> = {}
  if (isNas === false) out.isNas = false
  const years = b.num('숙성 연수', raw.ageStatement, 0, 100)
  if (years !== undefined) out.ageStatement = years
  const months = b.num('숙성 개월', raw.ageStatementMonths, 0, 11)
  if (months !== undefined) out.ageStatementMonths = months
  const distilled = b.yearMonth('증류 연월', raw.distilledDate)
  if (distilled !== undefined) out.distilledDate = distilled
  return out
}

/** 병입·배치 정보 — 와인을 제외한 모든 카테고리 공통 */
function buildBottleMeta(b: PlanBuilder, raw: Record<string, unknown>) {
  return compact({
    bottledDate: b.yearMonth('병입 연월', raw.bottledDate),
    releaseDate: b.isoDate('출시일', raw.releaseDate),
    batchNo: b.text('배치 번호', raw.batchNo, MAX.batchNo),
    bottleNo: b.text('병 번호', raw.bottleNo, MAX.bottleNo),
    totalBottles: numToStr(b.num('총 병 수', raw.totalBottles, 1, 10_000_000)),
  })
}

function buildEditions(b: PlanBuilder, raw: unknown): ImportPlan['variants'] {
  if (raw == null) return null
  const src = raw as { variantType?: unknown; seriesIdentifier?: unknown; seriesIdentifierEn?: unknown; items?: unknown }

  const variantType = String(src.variantType ?? '').trim().toUpperCase() as VariantTypeCode
  if (!(VARIANT_TYPES as readonly string[]).includes(variantType)) {
    b.warn('에디션', `유형 '${src.variantType ?? ''}' 이 올바르지 않습니다 (${VARIANT_TYPES.join(' / ')}). 에디션을 건너뜁니다.`)
    return null
  }
  if (!Array.isArray(src.items) || src.items.length === 0) {
    b.warn('에디션', '유형은 있으나 목록이 비어 있어 건너뜁니다.')
    return null
  }

  const items: Array<Record<string, unknown>> = []
  for (const item of src.items as Record<string, unknown>[]) {
    const value = String(item?.variantValue ?? '').trim()
    if (!value) {
      b.warn('에디션', '식별 값(한글)이 없는 항목을 건너뜁니다.')
      continue
    }
    items.push(compact({
      variantValue: value.slice(0, MAX.seriesIdentifier),
      variantValueEn: String(item?.variantValueEn ?? '').trim().slice(0, MAX.seriesIdentifier) || undefined,
      abv: b.num('에디션 도수', item?.abv, ABV_MIN, ABV_MAX),
      volumeMl: b.num('에디션 용량', item?.volumeMl, VOLUME_ML_MIN, VOLUME_ML_MAX),
      commonDetail: compact({
        bottledDate: b.yearMonth('에디션 병입 연월', item?.bottledDate),
        releaseDate: b.isoDate('에디션 출시일', item?.releaseDate),
        batchNo: b.text('에디션 배치 번호', item?.batchNo, MAX.batchNo),
        totalBottles: b.num('에디션 총 병 수', item?.totalBottles, 1, 10_000_000),
      }),
      whiskyDetail: compact({
        ...buildCasks(b, item?.casks),
        notes: b.text('에디션 기타 정보', item?.notes, MAX.notes),
      }),
    }))
  }
  if (items.length === 0) return null

  const seriesIdentifier = String(src.seriesIdentifier ?? '').trim().slice(0, MAX.seriesIdentifier)
  if (!seriesIdentifier) {
    b.warn('에디션', '한글 시리즈 식별자가 없습니다 — 필수 항목이라 직접 입력해야 합니다.')
  }
  b.mark(`에디션 ${items.length}건`)
  return {
    variantType,
    seriesIdentifier,
    seriesIdentifierEn: String(src.seriesIdentifierEn ?? '').trim().slice(0, MAX.seriesIdentifier),
    items,
  }
}
