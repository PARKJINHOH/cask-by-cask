import AppellationAutocomplete from '@/shared/components/AppellationAutocomplete'
import GrapeVarietyInput, { type GrapeVarietyRow } from '@/shared/components/GrapeVarietyInput'
import InfoTooltip from '@/shared/components/InfoTooltip'
import { RequiredMark } from '@/shared/components/FormFieldLabel'
import { useTranslation } from 'react-i18next'

export interface WineDetailForm {
  wineType: string
  vintageStatus: 'VINTAGE' | 'NON_VINTAGE' | 'UNKNOWN'
  vintageYear: string
  isOakAged: boolean | null
  isNaturalWine: boolean | null
  certification: string; grapeVarieties: GrapeVarietyRow[]
  appellationDesignation: string; soilType: string; altitudeM: string
  harvestMethod: string; fermentationVessel: string; oakType: string; oakAgedMonths: string
  // 관능(맛) 지표
  sweetness: string; body: string; acidity: string; tannin: string
}

export const DEFAULT_WINE: WineDetailForm = {
  wineType: '', vintageStatus: 'VINTAGE', vintageYear: '',
  isOakAged: null, isNaturalWine: null,
  certification: '', grapeVarieties: [], appellationDesignation: '',
  soilType: '', altitudeM: '', harvestMethod: '', fermentationVessel: '',
  oakType: '', oakAgedMonths: '',
  sweetness: '', body: '', acidity: '', tannin: '',
}

interface Props {
  value: WineDetailForm
  onChange: (u: Partial<WineDetailForm>) => void
  errors?: Record<string, string>
  admin?: boolean
}

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

const WINE_TYPES = [
  ['RED','레드'],['WHITE','화이트'],['ROSE','로제'],['SPARKLING','스파클링'],['DESSERT','디저트'],['ORANGE','오렌지'],['FORTIFIED','주정강화'],
]
const CERTIFICATIONS = [['NONE','없음'],['ORGANIC','Organic'],['BIODYNAMIC','Biodynamic'],['SUSTAINABLE','Sustainable']]
const HARVEST_METHODS = ['Hand-picked', 'Machine-harvested']
const FERMENTATION_VESSELS = ['Stainless Steel', 'Concrete', 'Oak Vat', 'Amphora']
const OAK_TYPES = ['French Oak', 'American Oak', 'Hungarian Oak']

// 관능(맛) 지표 — 선택식. 초보도 라벨로 직관적으로 고를 수 있게.
const SWEETNESS = [['DRY','드라이'],['OFF_DRY','오프드라이'],['MEDIUM','미디엄'],['SWEET','스위트']]
const BODY      = [['LIGHT','라이트'],['MEDIUM','미디엄'],['FULL','풀바디']]
const LEVEL     = [['LOW','낮음'],['MEDIUM','중간'],['HIGH','높음']]
// 한 줄짜리 세그먼트 라디오 (미지정 포함)
function Segment({ label, hint, options, value, onChange, allowClear = true }: {
  label: string
  hint?: string
  options: string[][]
  value: string
  onChange: (v: string) => void
  allowClear?: boolean
}) {
  return (
    <div>
      <label className={LABEL}>{label}{hint && <span className="ml-1 font-normal text-neutral-400">{hint}</span>}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(allowClear && value === v ? '' : v)}
            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              value === v ? 'border-amber-500 bg-amber-50 text-amber-700 font-medium' : 'border-neutral-200 text-neutral-600 hover:border-amber-300'
            }`}>{l}</button>
        ))}
      </div>
    </div>
  )
}

function BooleanSegment({ label, hint, value, onChange, optionLabels }: {
  label: string
  hint?: React.ReactNode
  value: boolean | null
  onChange: (value: boolean | null) => void
  optionLabels: { yes: string; no: string; unknown: string }
}) {
  const options: Array<[string, string, boolean | null]> = [
    ['YES', optionLabels.yes, true],
    ['NO', optionLabels.no, false],
    ['UNKNOWN', optionLabels.unknown, null],
  ]
  return (
    <div>
      <label className={LABEL}>{label}{hint}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(([key, text, optionValue]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              value === optionValue
                ? 'border-amber-500 bg-amber-50 text-amber-700 font-medium'
                : 'border-neutral-200 text-neutral-600 hover:border-amber-300'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function WineDetailSection({ value, onChange, errors, admin = true }: Props) {
  const { t } = useTranslation()
  const tr = (key: string) => t(key, admin ? { lng: 'ko' } : undefined)
  const booleanOptionLabels = {
    yes: tr('spirit.wineForm.yes'),
    no: tr('spirit.wineForm.no'),
    unknown: tr('spirit.wineForm.unknown'),
  }
  const vintageStatuses = [
    ['VINTAGE', tr('spirit.wineForm.vintageStatus.VINTAGE')],
    ['NON_VINTAGE', tr('spirit.wineForm.vintageStatus.NON_VINTAGE')],
  ]

  return (
    <div className="space-y-5">
      {/* 필수 정보 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
        <p className="text-xs font-semibold text-amber-700">필수 정보</p>
        <div>
          <label className={LABEL}>
            와인 종류 <RequiredMark />
          </label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-required="true">
            {WINE_TYPES.map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5 cursor-pointer text-sm select-none">
                <input type="radio" value={v} checked={value.wineType === v}
                  onChange={() => onChange({ wineType: v })} className="accent-amber-500" />
                {l}
                {v === 'ORANGE' && (
                  <InfoTooltip text="청포도를 껍질째 발효한 와인. 탄닌과 산미가 강합니다." />
                )}
                {v === 'FORTIFIED' && (
                  <InfoTooltip text="발효 중·후 증류주를 더해 도수를 높인 와인. 포트·셰리·마데이라 등." />
                )}
              </label>
            ))}
          </div>
          {errors?.wineType && <p className="text-xs text-red-500 mt-1">{errors.wineType}</p>}
        </div>
      </div>

      <p className="text-xs font-semibold text-neutral-500">선택 정보</p>

      {/* 관능(맛) 지표 — 가장 직관적인 정보. 라벨 뒷면·리뷰·판매처 설명에서 확인 가능. */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50/40 p-4 space-y-4">
        <p className="text-xs font-semibold text-neutral-600">맛 (관능) <span className="font-normal text-neutral-400">아는 만큼만 선택 · 다시 누르면 해제</span></p>
        <Segment label="당도" options={SWEETNESS} value={value.sweetness} onChange={(v) => onChange({ sweetness: v })} />
        <Segment label="바디" hint="입안 무게감" options={BODY} value={value.body} onChange={(v) => onChange({ body: v })} />
        <Segment label="산도" options={LEVEL} value={value.acidity} onChange={(v) => onChange({ acidity: v })} />
        <Segment label="타닌" hint="주로 레드" options={LEVEL} value={value.tannin} onChange={(v) => onChange({ tannin: v })} />
      </div>

      {/* 빈티지 — 수확 연도 / 논빈티지를 명시적으로 구분 */}
      <div className="space-y-3">
        <Segment
          label={tr('spirit.wineForm.vintage')}
          hint={tr('spirit.wineForm.vintageHint')}
          options={vintageStatuses}
          value={value.vintageStatus}
          allowClear={false}
          onChange={(v) => onChange({
            vintageStatus: v as WineDetailForm['vintageStatus'],
            vintageYear: v === 'VINTAGE' ? value.vintageYear : '',
          })}
        />
        {value.vintageStatus === 'VINTAGE' && (
          <div>
            <label className={LABEL}>{tr('spirit.wineForm.vintageYear')} <RequiredMark /></label>
            <input type="number" min={1800} max={new Date().getFullYear()}
              value={value.vintageYear} onChange={(e) => onChange({ vintageYear: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder={`예: ${new Date().getFullYear() - 3}`}
              className={`${INPUT} ${errors?.vintageYear ? 'border-red-400' : ''}`} />
            {errors?.vintageYear && <p className="text-xs text-red-500 mt-1">{errors.vintageYear}</p>}
          </div>
        )}
      </div>

      {/* 포도 품종 */}
      <div>
        <label className={LABEL}>포도 품종 (비율 합계 ≤ 100%)</label>
        <GrapeVarietyInput value={value.grapeVarieties}
          onChange={(rows) => onChange({ grapeVarieties: rows })} />
        {errors?.grapeVarieties && <p className="text-xs text-red-500 mt-1">{errors.grapeVarieties}</p>}
      </div>

      {/* 원산지 등급 자동완성 */}
      <div>
        <label className={LABEL}>{tr('spirit.wineForm.appellation')}</label>
        <AppellationAutocomplete
          value={value.appellationDesignation}
          onChange={(v) => onChange({ appellationDesignation: v })}
          placeholder={tr('spirit.wineForm.appellationPlaceholder')}
        />
      </div>

      {/* 토양, 고도 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>토양 종류</label>
          <input type="text" value={value.soilType} maxLength={100}
            onChange={(e) => onChange({ soilType: e.target.value })}
            placeholder="예: Limestone" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>포도밭 고도</label>
          <div className="relative">
            <input type="number" min={0} max={5000} value={value.altitudeM}
              onChange={(e) => onChange({ altitudeM: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className={`${INPUT} pr-8`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">m</span>
          </div>
        </div>
      </div>

      {/* 수확 방법, 발효 용기 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>수확 방법</label>
          <select value={value.harvestMethod} onChange={(e) => onChange({ harvestMethod: e.target.value })} className={INPUT}>
            <option value="">선택 안 함</option>
            {HARVEST_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>발효 용기</label>
          <select value={value.fermentationVessel} onChange={(e) => onChange({ fermentationVessel: e.target.value })} className={INPUT}>
            <option value="">선택 안 함</option>
            {FERMENTATION_VESSELS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* 오크 숙성 */}
      <BooleanSegment label={tr('spirit.wineForm.oakAged')} value={value.isOakAged}
        optionLabels={booleanOptionLabels}
        onChange={(isOakAged) => onChange({
          isOakAged,
          ...(isOakAged === true ? {} : { oakType: '', oakAgedMonths: '' }),
        })} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`${LABEL} ${!value.isOakAged ? 'opacity-40' : ''}`}>오크 종류</label>
          <select value={value.oakType} onChange={(e) => onChange({ oakType: e.target.value })}
            disabled={value.isOakAged !== true}
            className={`${INPUT} ${value.isOakAged !== true ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <option value="">선택 안 함</option>
            {OAK_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={`${LABEL} ${!value.isOakAged ? 'opacity-40' : ''}`}>오크 숙성 기간</label>
          <div className="relative">
            <input type="number" min={1} max={600} value={value.oakAgedMonths}
              onChange={(e) => onChange({ oakAgedMonths: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              disabled={value.isOakAged !== true}
              className={`${INPUT} pr-10 ${value.isOakAged !== true ? 'opacity-40 cursor-not-allowed' : ''}`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">개월</span>
          </div>
        </div>
      </div>

      {/* 내추럴 와인, 인증 */}
      <BooleanSegment
        label={tr('spirit.wineForm.naturalClaim')}
        hint={<InfoTooltip text={tr('spirit.wineForm.naturalClaimHelp')} />}
        value={value.isNaturalWine}
        optionLabels={booleanOptionLabels}
        onChange={(isNaturalWine) => onChange({ isNaturalWine })}
      />
      <div>
        <label className={LABEL}>인증</label>
        <div className="flex flex-wrap gap-4">
          {CERTIFICATIONS.map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer text-sm select-none">
              <input type="radio" value={v} checked={value.certification === v}
                onChange={() => onChange({ certification: v })} className="accent-amber-500" />
              {l}
              {v === 'BIODYNAMIC' && (
                <InfoTooltip text="달력·토양·우주 리듬 기반 농법. Organic보다 엄격합니다." />
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
