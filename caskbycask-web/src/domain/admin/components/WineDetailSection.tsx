import AppellationAutocomplete from '@/shared/components/AppellationAutocomplete'
import GrapeVarietyInput, { type GrapeVarietyRow } from '@/shared/components/GrapeVarietyInput'
import InfoTooltip from '@/shared/components/InfoTooltip'
import WineTasteBars from '@/domain/spirit/components/WineTasteBars'
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
  notes: string
}

export const DEFAULT_WINE: WineDetailForm = {
  wineType: '', vintageStatus: 'VINTAGE', vintageYear: '',
  isOakAged: null, isNaturalWine: null,
  certification: '', grapeVarieties: [], appellationDesignation: '',
  soilType: '', altitudeM: '', harvestMethod: '', fermentationVessel: '',
  oakType: '', oakAgedMonths: '',
  sweetness: '', body: '', acidity: '', tannin: '',
  notes: '',
}

interface Props {
  value: WineDetailForm
  onChange: (u: Partial<WineDetailForm>) => void
  errors?: Record<string, string>
  admin?: boolean
}

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

// 목록의 단일 소스는 domain/spirit/data/wine.ts
import {
  WINE_TYPES, CERTIFICATIONS, HARVEST_METHODS, FERMENTATION_VESSELS,
  WINE_OAK_TYPES as OAK_TYPES,
} from '@/domain/spirit/data/wine'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

// 관능(맛) 지표는 WineTasteBars(5단계 바)가 담당한다 — 사용자 상세와 동일 컴포넌트를 공유.

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
                {v === 'SPARKLING' && (
                  <InfoTooltip text="샴페인·까바·프로세코 등 모든 발포성 와인이 여기 해당합니다. 샴페인은 스파클링을 고르고 산지를 샹파뉴로 지정하세요." />
                )}
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

      {/* 관능(맛) 지표 — 5단계 바. 사용자 상세와 같은 컴포넌트를 써서 표시가 어긋나지 않게 한다 */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50/40 p-4 space-y-4">
        <p className="text-xs font-semibold text-neutral-600">
          맛 (관능) <span className="font-normal text-neutral-400">아는 것만 선택 (다시 누르면 해제)</span>
        </p>
        <WineTasteBars
          admin={admin}
          values={{
            sweetness: value.sweetness || null,
            body: value.body || null,
            acidity: value.acidity || null,
            tannin: value.tannin || null,
          }}
          onChange={(key, next) => onChange({ [key]: next ?? '' } as Partial<WineDetailForm>)}
        />
      </div>

      {/* 빈티지 — 수확 연도 / 논빈티지를 명시적으로 구분 */}
      <div className="space-y-3">
        <div>
          <label className={LABEL}>{tr('spirit.wineForm.vintage')}</label>
          <p className="mb-2 text-xs text-neutral-400">{tr('spirit.wineForm.vintageHint')}</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={value.vintageStatus === 'NON_VINTAGE'}
              onChange={(e) => onChange({
                vintageStatus: e.target.checked ? 'NON_VINTAGE' : 'VINTAGE',
                vintageYear: e.target.checked ? '' : value.vintageYear,
              })}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            {tr('spirit.wineForm.vintageStatus.NON_VINTAGE')}
          </label>
        </div>
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
          {/* 목록에 없는 오크(슬라보니안·아카시아·체리 등)도 직접 입력할 수 있게 datalist 를 쓴다 */}
          <input
            type="text"
            list="wine-oak-types"
            value={value.oakType}
            maxLength={100}
            onChange={(e) => onChange({ oakType: e.target.value })}
            disabled={value.isOakAged !== true}
            placeholder="선택하거나 직접 입력 (예: Slavonian Oak)"
            className={`${INPUT} ${value.isOakAged !== true ? 'opacity-40 cursor-not-allowed' : ''}`} />
          <datalist id="wine-oak-types">
            {OAK_TYPES.map((v) => <option key={v} value={v} />)}
          </datalist>
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

      {/* 기타 정보 (참고용 자유 입력) */}
      <div>
        <label className={LABEL}>기타 정보</label>
        <AutoGrowTextarea value={value.notes} rows={3} maxLength={500}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="출시·양조 관련 참고 정보를 입력하세요."
          className={`${INPUT}`} />
      </div>
    </div>
  )
}
