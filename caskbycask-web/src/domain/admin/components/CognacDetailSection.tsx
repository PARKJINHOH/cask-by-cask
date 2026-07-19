import InfoTooltip from '@/shared/components/InfoTooltip'
import { RequiredMark } from '@/shared/components/FormFieldLabel'

export interface CognacDetailForm {
  grade: string; cru: string; isFineChampagne: boolean; blendDetail: string
  vintageYear: string; ageYears: string; oakType: string; caskFinish: string
}
export const DEFAULT_COGNAC: CognacDetailForm = {
  grade: '', cru: '', isFineChampagne: false, blendDetail: '',
  vintageYear: '', ageYears: '', oakType: '', caskFinish: '',
}

// 프렌치 오크 숲(원산지) — 꼬냑 숙성에 주로 쓰임
const OAK_TYPES: Array<[string, string]> = [
  ['LIMOUSIN', 'Limousin (리무쟁)'],
  ['TRONCAIS', 'Tronçais (트롱세)'],
  ['ALLIER', 'Allier (알리에)'],
  ['OTHER', '기타'],
]

interface Props { value: CognacDetailForm; onChange: (u: Partial<CognacDetailForm>) => void; errors?: Record<string, string> }

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

const GRADES: Array<[string, string, string]> = [
  ['VS', 'VS', '2년+'],
  ['NAPOLEON', 'Napoléon', '6년+'],
  ['VSOP', 'VSOP', '4년+'],
  ['XO', 'XO', '10년+'],
  ['XXO', 'XXO', '14년+'],
  ['HORS_DAGE', "Hors d'Age", '30년+'],
]

const CRUS: Array<[string, string]> = [
  ['GRANDE_CHAMPAGNE', 'Grande Champagne'],
  ['PETITE_CHAMPAGNE', 'Petite Champagne'],
  ['BORDERIES', 'Borderies'],
  ['FINS_BOIS', 'Fins Bois'],
  ['BONS_BOIS', 'Bons Bois'],
]

export default function CognacDetailSection({ value, onChange, errors }: Props) {
  return (
    <div className="space-y-5">
      {/* 필수 정보 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
        <p className="text-xs font-semibold text-amber-700">필수 정보</p>
        <div>
          <label className={LABEL}>
            등급 <RequiredMark />
          </label>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-required="true">
            {GRADES.map(([v, l, years]) => (
              <label key={v} className="flex flex-col items-center cursor-pointer select-none">
                <input type="radio" value={v} checked={value.grade === v}
                  onChange={() => onChange({ grade: v })} className="accent-amber-500 mb-1" />
                <span className="text-xs font-semibold text-neutral-700">{l}</span>
                <span className="text-[10px] text-neutral-400">{years}</span>
              </label>
            ))}
            <label className="flex flex-col items-center cursor-pointer select-none">
              <input type="radio" value="" checked={!value.grade}
                onChange={() => onChange({ grade: '' })} className="accent-amber-500 mb-1" />
              <span className="text-xs text-neutral-400">미지정</span>
            </label>
          </div>
          {errors?.grade && <p className="text-xs text-red-500 mt-1">{errors.grade}</p>}
        </div>
      </div>

      <p className="text-xs font-semibold text-neutral-500">선택 정보</p>

      {/* 크뤼 */}
      <div>
        <label className={LABEL}>
          크뤼 (원산지 등급)
          <InfoTooltip text="원산지 세부 등급. '샴페인'과 이름만 같고 다른 지역입니다. Grande Champagne이 최상위." />
        </label>
        <select value={value.cru} onChange={(e) => onChange({ cru: e.target.value })} className={INPUT}>
          <option value="">선택 안 함</option>
          {CRUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Fine Champagne */}
      <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
        <input type="checkbox" checked={value.isFineChampagne}
          onChange={(e) => onChange({ isFineChampagne: e.target.checked })} className="w-4 h-4 accent-amber-500" />
        Fine Champagne (Grande + Petite Champagne 블렌드, Grande 50% 이상)
      </label>

      {/* 빈티지 / 선언 숙성연수 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>
            빈티지 연도
            <InfoTooltip text="단일 연도 증류 원액으로 만든 빈티지 꼬냑일 때만. 일반 꼬냑은 비워두세요." />
          </label>
          <input type="number" min={1800} max={new Date().getFullYear()}
            value={value.vintageYear} onChange={(e) => onChange({ vintageYear: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>
            선언 숙성연수
            <InfoTooltip text="라벨에 표기된 숙성 연수(예: 20년). 표기가 없으면 비워두세요." />
          </label>
          <div className="relative">
            <input type="number" min={0} max={100}
              value={value.ageYears} onChange={(e) => onChange({ ageYears: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className={`${INPUT} pr-8`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">년</span>
          </div>
        </div>
      </div>

      {/* 오크(우드) 종류 */}
      <div>
        <label className={LABEL}>
          오크(우드) 종류
          <InfoTooltip text="숙성에 사용한 프렌치 오크 숲. 리무쟁=강한 타닌, 트롱세=섬세함." />
        </label>
        <select value={value.oakType} onChange={(e) => onChange({ oakType: e.target.value })} className={INPUT}>
          <option value="">선택 안 함</option>
          {OAK_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* 캐스크 피니시 / 추가 숙성 */}
      <div>
        <label className={LABEL}>
          캐스크 피니시 / 추가 숙성
          <InfoTooltip text="다른 캐스크에서 추가 숙성한 경우. 예: 포트 캐스크 피니시." />
        </label>
        <input type="text" value={value.caskFinish} maxLength={200}
          onChange={(e) => onChange({ caskFinish: e.target.value })}
          placeholder="예: 포트 캐스크 피니시" className={INPUT} />
      </div>

      {/* 블렌드 설명 */}
      <div>
        <label className={LABEL}>블렌드 설명</label>
        <textarea value={value.blendDetail} rows={3} maxLength={300}
          onChange={(e) => onChange({ blendDetail: e.target.value })}
          className={`${INPUT} resize-none`} />
      </div>
    </div>
  )
}
