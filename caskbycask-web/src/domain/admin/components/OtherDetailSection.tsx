import type { OtherSpiritType } from '@/domain/spirit/types/spirit.types'
import InfoTooltip from '@/shared/components/InfoTooltip'
import { RequiredMark } from '@/shared/components/FormFieldLabel'

export interface OtherDetailForm {
  otherType: string
  mainIngredient: string
  productionMethod: string
  notes: string
  styleClassification: string
  caskType: string
  originDesignation: string
}

export const DEFAULT_OTHER: OtherDetailForm = {
  otherType: '', mainIngredient: '', productionMethod: '', notes: '',
  styleClassification: '', caskType: '', originDesignation: '',
}

// 주종별 '세부 스타일' 입력 가이드 (placeholder 예시). 비전문가도 무엇을 적을지 알 수 있게.
const STYLE_GUIDE: Record<string, string> = {
  RUM: '예: 아그리콜 / 데메라라 / 스페니시 스타일',
  GIN: '예: London Dry / Old Tom / Navy Strength',
  VODKA: '예: 곡물 / 감자 / 무필터',
  TEQUILA: '예: Blanco / Reposado / Añejo / Extra Añejo',
  MEZCAL: '예: Joven / Reposado / Añejo',
  BRANDY: '예: 피스코 / 그라파 / 프루트 브랜디',
  LIQUEUR: '예: 허브 / 과일 / 크림 리큐르',
  SAKE: '예: 준마이 다이긴조 / 긴조 / 혼조조',
  SOJU: '예: 증류식 / 희석식',
  BAIJIU: '예: 농향형 / 장향형 / 청향형',
  ABSINTHE: '예: Verte / Blanche',
  BEER: '예: IPA / 스타우트 / 라거',
  OTHER: '세부 스타일/분류',
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
            주종 <RequiredMark />
          </label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-required="true">
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

      {/* 세부 스타일/분류 — 주종에 따라 입력 예시가 바뀜 */}
      <div>
        <label className={LABEL}>
          세부 스타일 / 분류
          <InfoTooltip text="같은 주종 안의 세부 분류. 라벨·판매처 설명에서 확인할 수 있어요." />
        </label>
        <input type="text" value={value.styleClassification} maxLength={100}
          onChange={(e) => onChange({ styleClassification: e.target.value })}
          placeholder={STYLE_GUIDE[value.otherType] ?? STYLE_GUIDE.OTHER} className={INPUT} />
      </div>

      {/* 캐스크/우드 종류 / 원산지 명칭 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>
            캐스크 / 우드 종류
            <InfoTooltip text="숙성에 사용한 통. 숙성하지 않았으면 비워두세요." />
          </label>
          <input type="text" value={value.caskType} maxLength={100}
            onChange={(e) => onChange({ caskType: e.target.value })}
            placeholder="예: ex-Bourbon, ex-Sherry, 버진 오크" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>
            원산지 명칭 / 규정
            <InfoTooltip text="법적 원산지·등급 규정. 예: Tequila DOM, Calvados AOC, Jamaica Rum." />
          </label>
          <input type="text" value={value.originDesignation} maxLength={100}
            onChange={(e) => onChange({ originDesignation: e.target.value })}
            placeholder="예: Tequila DOM, Calvados AOC" className={INPUT} />
        </div>
      </div>

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

      {/* 기타 정보 */}
      <div>
        <label className={LABEL}>기타 정보</label>
        <textarea value={value.notes} rows={3} maxLength={500}
          onChange={(e) => onChange({ notes: e.target.value })}
          className={`${INPUT} resize`} />
      </div>
    </div>
  )
}
