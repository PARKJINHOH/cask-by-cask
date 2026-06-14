import NasToggle from '@/shared/components/NasToggle'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'

export interface CommonDetailForm {
  isNas: boolean
  ageStatement: number | null
  distilledDate: string
  bottledDate: string
  releaseDate: string
  volumeMl: string
  abv: string
  bottleNo: string
  batchNo: string
  totalBottles: string
}

export const DEFAULT_COMMON_DETAIL: CommonDetailForm = {
  isNas: false, ageStatement: null, distilledDate: '', bottledDate: '',
  releaseDate: '', volumeMl: '', abv: '', bottleNo: '', batchNo: '', totalBottles: '',
}

interface Props {
  value: CommonDetailForm
  onChange: (updates: Partial<CommonDetailForm>) => void
  dateErrors?: { distilledDate?: string; bottledDate?: string }
  /** 카테고리별로 부적합 필드를 숨김 (와인=빈티지 중심, 꼬냑=등급 중심). 미지정 시 전체 표시. */
  category?: SpiritCategory | null
}

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  )
}


export default function SpiritCommonDetailSection({ value, onChange, dateErrors, category }: Props) {
  // 카테고리별 표시 규칙
  //  - 와인 : NAS·숙성년수·증류연월·병입연월·배치/병번호/총병수 숨김 (빈티지로 대체)
  //  - 꼬냑 : NAS·숙성년수·증류연월 숨김 (VS·VSOP·XO 등급으로 식별)
  const isWine = category === 'WINE'
  const isCognac = category === 'COGNAC'
  const showNas = !isWine && !isCognac
  const showDistilled = !isWine && !isCognac
  const showBottled = !isWine
  const showBottleMeta = !isWine // 병 번호 · 배치 번호 · 총 병 수

  return (
    <div className="space-y-4">
      {/* NAS 토글 — 위스키/기타 전용 */}
      {showNas && (
        <NasToggle
          isNas={value.isNas}
          ageStatement={value.ageStatement}
          onNasChange={(v) => onChange({ isNas: v })}
          onAgeChange={(v) => onChange({ ageStatement: v })}
        />
      )}

      {isWine && (
        <p className="text-xs text-neutral-400">
          와인은 빈티지(수확 연도)로 식별합니다. 빈티지·도수·용량·출시일만 입력해주세요.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 증류 연월 — 위스키/기타 전용 */}
        {showDistilled && (
          <div className="space-y-1.5">
            <label className={LABEL}>증류 연월</label>
            <input
              type="text"
              value={value.distilledDate}
              onChange={(e) => onChange({ distilledDate: e.target.value })}
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
              onChange={(e) => onChange({ bottledDate: e.target.value })}
              placeholder="YYYY 또는 YYYY-MM"
              maxLength={7}
              className={`${INPUT} ${dateErrors?.bottledDate ? 'border-red-400' : ''}`}
            />
            {dateErrors?.bottledDate && (
              <p className="text-xs text-red-500">{dateErrors.bottledDate}</p>
            )}
          </div>
        )}

        {/* 출시일 — 전 카테고리 공통 */}
        <Field label="출시일">
          <input
            type="date"
            max="9999-12-31"
            value={value.releaseDate}
            onChange={(e) => onChange({ releaseDate: e.target.value })}
            className={INPUT}
          />
        </Field>

        {/* 배치 번호 — 출시일 우측에 위치 (와인 제외) */}
        {showBottleMeta && (
          <Field label="배치 번호">
            <input
              type="text"
              value={value.batchNo}
              onChange={(e) => onChange({ batchNo: e.target.value })}
              maxLength={100}
              className={INPUT}
            />
          </Field>
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
