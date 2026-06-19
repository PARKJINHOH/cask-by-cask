import AppellationAutocomplete from '@/shared/components/AppellationAutocomplete'
import GrapeVarietyInput, { type GrapeVarietyRow } from '@/shared/components/GrapeVarietyInput'
import InfoTooltip from '@/shared/components/InfoTooltip'

export interface WineDetailForm {
  wineType: string; vintage: string; isOakAged: boolean; isNaturalWine: boolean
  certification: string; grapeVarieties: GrapeVarietyRow[]
  appellationDesignation: string; soilType: string; altitudeM: string
  harvestMethod: string; fermentationVessel: string; oakType: string; oakAgedMonths: string
  // 관능(맛) 지표
  sweetness: string; body: string; acidity: string; tannin: string
}

export const DEFAULT_WINE: WineDetailForm = {
  wineType: '', vintage: '', isOakAged: false, isNaturalWine: false,
  certification: '', grapeVarieties: [], appellationDesignation: '',
  soilType: '', altitudeM: '', harvestMethod: '', fermentationVessel: '',
  oakType: '', oakAgedMonths: '',
  sweetness: '', body: '', acidity: '', tannin: '',
}

interface Props { value: WineDetailForm; onChange: (u: Partial<WineDetailForm>) => void; errors?: Record<string, string> }

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
function Segment({ label, hint, options, value, onChange }: {
  label: string; hint?: string; options: string[][]; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className={LABEL}>{label}{hint && <span className="ml-1 font-normal text-neutral-400">{hint}</span>}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(value === v ? '' : v)}
            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              value === v ? 'border-amber-500 bg-amber-50 text-amber-700 font-medium' : 'border-neutral-200 text-neutral-600 hover:border-amber-300'
            }`}>{l}</button>
        ))}
      </div>
    </div>
  )
}

export default function WineDetailSection({ value, onChange, errors }: Props) {
  return (
    <div className="space-y-5">
      {/* 필수 정보 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
        <p className="text-xs font-semibold text-amber-700">필수 정보</p>
        <div>
          <label className={LABEL}>
            와인 종류 <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
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
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-neutral-400">
              <input type="radio" value="" checked={!value.wineType}
                onChange={() => onChange({ wineType: '' })} className="accent-amber-500" />
              미지정
            </label>
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

      {/* 빈티지 */}
      <div>
        <label className={LABEL}>빈티지 연도</label>
        <input type="number" min={1800} max={new Date().getFullYear()}
          value={value.vintage} onChange={(e) => onChange({ vintage: e.target.value })}
          placeholder={`예: ${new Date().getFullYear() - 3}`} className={INPUT} />
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
        <label className={LABEL}>원산지 등급 (AOC / DOC / AVA 등)</label>
        <AppellationAutocomplete
          value={value.appellationDesignation}
          onChange={(v) => onChange({ appellationDesignation: v })}
          placeholder="예: AOC Bordeaux"
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
              onChange={(e) => onChange({ altitudeM: e.target.value })} className={`${INPUT} pr-8`} />
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
      <div>
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-neutral-700">
          <input type="checkbox" checked={value.isOakAged}
            onChange={(e) => onChange({ isOakAged: e.target.checked })} className="w-4 h-4 accent-amber-500" />
          오크 숙성
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`${LABEL} ${!value.isOakAged ? 'opacity-40' : ''}`}>오크 종류</label>
          <select value={value.oakType} onChange={(e) => onChange({ oakType: e.target.value })}
            disabled={!value.isOakAged}
            className={`${INPUT} ${!value.isOakAged ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <option value="">선택 안 함</option>
            {OAK_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={`${LABEL} ${!value.isOakAged ? 'opacity-40' : ''}`}>오크 숙성 기간</label>
          <div className="relative">
            <input type="number" min={1} max={600} value={value.oakAgedMonths}
              onChange={(e) => onChange({ oakAgedMonths: e.target.value })}
              disabled={!value.isOakAged}
              className={`${INPUT} pr-10 ${!value.isOakAged ? 'opacity-40 cursor-not-allowed' : ''}`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">개월</span>
          </div>
        </div>
      </div>

      {/* 내추럴 와인, 인증 */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-neutral-700">
          <input type="checkbox" checked={value.isNaturalWine}
            onChange={(e) => onChange({ isNaturalWine: e.target.checked })} className="w-4 h-4 accent-amber-500" />
          내추럴 와인
          <InfoTooltip text="개입 최소화, 무첨가 양조 방식" />
        </label>
      </div>
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
