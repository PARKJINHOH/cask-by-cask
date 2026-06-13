import type { OtherSpiritType } from '@/domain/spirit/types/spirit.types'

export interface OtherDetailForm {
  otherType: string
  mainIngredient: string
  productionMethod: string
  notes: string
}

export const DEFAULT_OTHER: OtherDetailForm = {
  otherType: '', mainIngredient: '', productionMethod: '', notes: '',
}

interface Props { value: OtherDetailForm; onChange: (u: Partial<OtherDetailForm>) => void; errors?: Record<string, string> }

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

// 라벨은 한국어 고정 (관리자 페이지)
export const OTHER_TYPES: Array<[OtherSpiritType, string]> = [
  ['RUM', '럼'],
  ['GIN', '진'],
  ['VODKA', '보드카'],
  ['TEQUILA', '데킬라'],
  ['MEZCAL', '메스칼'],
  ['BRANDY', '브랜디'],
  ['LIQUEUR', '리큐르'],
  ['SAKE', '사케 (청주)'],
  ['SOJU', '소주'],
  ['BAIJIU', '바이주'],
  ['ABSINTHE', '압생트'],
  ['BEER', '맥주'],
  ['OTHER', '기타'],
]

export default function OtherDetailSection({ value, onChange, errors }: Props) {
  return (
    <div className="space-y-5">
      {/* 필수 정보 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
        <p className="text-xs font-semibold text-amber-700">필수 정보</p>
        <div>
          <label className={LABEL}>
            주종 <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {OTHER_TYPES.map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5 cursor-pointer text-sm select-none">
                <input type="radio" value={v} checked={value.otherType === v}
                  onChange={() => onChange({ otherType: v })} className="accent-amber-500" />
                {l}
              </label>
            ))}
          </div>
          {errors?.otherType && <p className="text-xs text-red-500 mt-1">{errors.otherType}</p>}
        </div>
      </div>

      <p className="text-xs font-semibold text-neutral-500">선택 정보</p>

      {/* 주원료 / 제조 방식 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>주원료</label>
          <input type="text" value={value.mainIngredient} maxLength={200}
            onChange={(e) => onChange({ mainIngredient: e.target.value })}
            placeholder="예: 사탕수수, 곡물, 아가베" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>제조 방식</label>
          <input type="text" value={value.productionMethod} maxLength={200}
            onChange={(e) => onChange({ productionMethod: e.target.value })}
            placeholder="예: 단식 증류, 연속식 증류" className={INPUT} />
        </div>
      </div>

      {/* 비고 */}
      <div>
        <label className={LABEL}>추가 설명 / 비고</label>
        <textarea value={value.notes} rows={3} maxLength={500}
          onChange={(e) => onChange({ notes: e.target.value })}
          className={`${INPUT} resize-none`} />
      </div>
    </div>
  )
}
