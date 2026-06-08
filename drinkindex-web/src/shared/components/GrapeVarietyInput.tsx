export interface GrapeVarietyRow { name: string; percentage: string }

interface Props {
  value: GrapeVarietyRow[]
  onChange: (rows: GrapeVarietyRow[]) => void
}

const TOTAL_ERROR_CLS = 'text-red-600 font-semibold'
const TOTAL_OK_CLS    = 'text-neutral-500'

export default function GrapeVarietyInput({ value, onChange }: Props) {
  const total = value.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0)
  const isOver = total > 100

  const update = (idx: number, field: keyof GrapeVarietyRow, val: string) => {
    const next = value.map((r, i) => i === idx ? { ...r, [field]: val } : r)
    onChange(next)
  }

  const add = () => onChange([...value, { name: '', percentage: '' }])

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      {value.map((row, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            type="text"
            value={row.name}
            onChange={(e) => update(idx, 'name', e.target.value)}
            placeholder="품종명 (예: Cabernet Sauvignon)"
            maxLength={100}
            className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <div className="relative flex items-center">
            <input
              type="number"
              min={1}
              max={100}
              value={row.percentage}
              onChange={(e) => update(idx, 'percentage', e.target.value)}
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

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={add}
          className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
        >
          + 품종 추가
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
