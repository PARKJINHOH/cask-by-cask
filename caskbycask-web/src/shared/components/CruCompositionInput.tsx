import { useTranslation } from 'react-i18next'
import { COGNAC_CRUS } from '@/domain/spirit/data/cognac'

export interface CruCompositionRow { cru: string; percentage: string }

interface Props {
  value: CruCompositionRow[]
  onChange: (rows: CruCompositionRow[]) => void
}

const TOTAL_ERROR_CLS = 'text-red-600 font-semibold'
const TOTAL_OK_CLS    = 'text-neutral-500'

/**
 * 꼬냑 크뤼 구성 입력. 꼬냑은 여러 크뤼의 오드비를 섞는 것이 기본이라
 * 크뤼를 한 개만 고르게 하면 싱글 크뤼인지 블렌드인지 구분이 남지 않는다.
 *
 * <p>포도 품종({@link GrapeVarietyInput})과 같은 "행 추가 + 비율 + 합계" 형태지만
 * 품종명이 자유 입력인 것과 달리 크뤼는 법정 6개 구역 중 선택이며 중복을 허용하지 않는다.
 */
export default function CruCompositionInput({ value, onChange }: Props) {
  const { t } = useTranslation()

  const total = value.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0)
  const isOver = total > 100
  const picked = new Set(value.map((r) => r.cru).filter(Boolean))

  const update = (idx: number, field: keyof CruCompositionRow, val: string) =>
    onChange(value.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))

  const add = () => onChange([...value, { cru: '', percentage: '' }])

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      {value.map((row, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <select
            value={row.cru}
            onChange={(e) => update(idx, 'cru', e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">크뤼 선택</option>
            {COGNAC_CRUS.map((cru) => (
              // 이미 다른 행에서 고른 크뤼는 막는다 (서버도 중복을 거부한다)
              <option key={cru} value={cru} disabled={cru !== row.cru && picked.has(cru)}>
                {t(`spirit.cognacCru.${cru}`)}
              </option>
            ))}
          </select>
          <div className="relative flex items-center">
            <input
              type="number"
              min={1}
              max={100}
              value={row.percentage}
              onChange={(e) => update(idx, 'percentage', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="비율"
              className="w-20 px-3 py-2 text-sm border border-neutral-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-400 pr-7"
            />
            <span className="absolute right-2.5 text-xs text-neutral-400 pointer-events-none">%</span>
          </div>
          <button
            type="button"
            onClick={() => remove(idx)}
            className="p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label="행 삭제"
          >
            ×
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={add}
          disabled={picked.size >= COGNAC_CRUS.length}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300
            bg-amber-50 text-amber-700 text-xs font-semibold
            hover:bg-amber-100 hover:border-amber-400 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-50
            focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <span aria-hidden="true" className="text-sm leading-none">+</span>
          크뤼 추가
        </button>
        {value.length > 0 && (
          <span className={`text-xs ${isOver ? TOTAL_ERROR_CLS : TOTAL_OK_CLS}`}>
            합계: {total}%{isOver && ' — 100% 초과'}
          </span>
        )}
      </div>
    </div>
  )
}
