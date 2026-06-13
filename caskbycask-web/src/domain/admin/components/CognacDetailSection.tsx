import InfoTooltip from '@/shared/components/InfoTooltip'

export interface CognacDetailForm {
  grade: string; cru: string; isFineChampagne: boolean; blendDetail: string
}
export const DEFAULT_COGNAC: CognacDetailForm = {
  grade: '', cru: '', isFineChampagne: false, blendDetail: '',
}

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
            등급 <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-3">
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
