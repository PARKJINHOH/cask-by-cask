import NasToggle from '@/shared/components/NasToggle'
import { formatYearMonth } from '@/shared/utils/yearMonth'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

export interface CommonDetailForm {
  isNas: boolean
  ageStatement: number | null
  ageStatementMonths: number | null
  distilledDate: string
  bottledDate: string
  volumeMl: string
  abv: string
  bottleNo: string
  totalBottles: string
}

export const DEFAULT_COMMON_DETAIL: CommonDetailForm = {
  isNas: false, ageStatement: null, ageStatementMonths: null,
  distilledDate: '', bottledDate: '',
  volumeMl: '', abv: '', bottleNo: '', totalBottles: '',
}

interface Props {
  value: CommonDetailForm
  onChange: (updates: Partial<CommonDetailForm>) => void
  dateErrors?: { distilledDate?: string; bottledDate?: string }
  /** 카테고리별로 부적합 필드를 숨김 (와인=빈티지 중심, 꼬냑=등급 중심). 미지정 시 전체 표시. */
  category?: SpiritCategory | null
  admin?: boolean
}

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'


/**
 * 해당 카테고리에서 이 섹션이 보여줄 필드가 하나라도 있는지.
 *
 * <p>와인은 NAS·숙성년수·증류연월·병입연월·병번호가 모두 숨겨져(빈티지로 대체)
 * 표시할 필드가 남지 않는다. 호출부가 이 값을 확인하지 않으면 **빈 카드**만 렌더된다.
 */
export function hasCommonDetailFields(category: SpiritCategory | '' | null | undefined): boolean {
  return !!category && category !== 'WHISKY' && category !== 'WINE'
}

export default function SpiritCommonDetailSection({ value, onChange, dateErrors, category }: Props) {
  // 카테고리별 표시 규칙
  //  - 와인 : NAS·숙성년수·증류연월·병입연월·병번호/총병수 숨김 (빈티지로 대체)
  //  - 꼬냑 : NAS·숙성년수·증류연월 숨김 (VS·VSOP·XO 등급으로 식별)
  const isWine = category === 'WINE'
  const isCognac = category === 'COGNAC'
  const showNas = !isWine && !isCognac
  const showDistilled = !isWine && !isCognac
  const showBottled = !isWine
  const showBottleMeta = !isWine // 병 번호 · 총 병 수

  return (
    <div className="space-y-4">
      {/* NAS 토글 — 위스키/기타 전용 */}
      {showNas && (
        <NasToggle
          isNas={value.isNas}
          ageStatement={value.ageStatement}
          ageStatementMonths={value.ageStatementMonths}
          onNasChange={(v) => onChange({ isNas: v })}
          onAgeChange={(v) => onChange({ ageStatement: v })}
          onMonthsChange={(v) => onChange({ ageStatementMonths: v })}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 증류 연월 — 위스키/기타 전용 */}
        {showDistilled && (
          <div className="space-y-1.5">
            <label className={LABEL}>증류 연월</label>
            <input
              type="text"
              value={value.distilledDate}
              onChange={(e) => onChange({ distilledDate: formatYearMonth(e.target.value) })}
              placeholder="YYYY 또는 YYYY-MM"
              maxLength={7}
              className={`${INPUT} ${dateErrors?.distilledDate ? 'border-red-400' : ''}`}
            />
            {dateErrors?.distilledDate && (
              <p className="text-xs text-red-500">{dateErrors.distilledDate}</p>
            )}
          </div>
        )}

        {/* 병입 연월 — 와인 제외 */}
        {showBottled && (
          <div className="space-y-1.5">
            <label className={LABEL}>병입 연월</label>
            <input
              type="text"
              value={value.bottledDate}
              onChange={(e) => onChange({ bottledDate: formatYearMonth(e.target.value) })}
              placeholder="YYYY 또는 YYYY-MM"
              maxLength={7}
              className={`${INPUT} ${dateErrors?.bottledDate ? 'border-red-400' : ''}`}
            />
            {dateErrors?.bottledDate && (
              <p className="text-xs text-red-500">{dateErrors.bottledDate}</p>
            )}
          </div>
        )}

        {/* 병 번호 / 총 병 수 — 한 칸에 나란히 (와인 제외) */}
        {showBottleMeta && (
          <div className="space-y-1.5 sm:col-span-2">
            <label className={LABEL}>병 번호 / 총 병 수</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={value.bottleNo}
                onChange={(e) => onChange({ bottleNo: e.target.value })}
                maxLength={50}
                placeholder="병 번호"
                className={INPUT}
              />
              <span className="text-neutral-400 flex-shrink-0">/</span>
              <input
                type="number" min={1}
                value={value.totalBottles}
                onChange={(e) => onChange({ totalBottles: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="총 병 수"
                className={INPUT}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
