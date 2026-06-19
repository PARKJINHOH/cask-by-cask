import { useState, useEffect } from 'react'

interface Props {
  isNas: boolean
  ageStatement: number | null
  ageStatementMonths?: number | null
  ageStatementMin: number | null
  ageStatementMax: number | null
  onNasChange: (isNas: boolean) => void
  onAgeChange: (age: number | null) => void
  onMonthsChange?: (months: number | null) => void
  onMinChange: (min: number | null) => void
  onMaxChange: (max: number | null) => void
}

const INPUT_CLS = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'

export default function NasToggle({
  isNas,
  ageStatement,
  ageStatementMonths,
  ageStatementMin,
  ageStatementMax,
  onNasChange,
  onAgeChange,
  onMonthsChange,
  onMinChange,
  onMaxChange,
}: Props) {
  const [isRange, setIsRange] = useState(false)

  // 프리필 또는 외부 상태 변화 감지
  useEffect(() => {
    if (ageStatementMin != null || ageStatementMax != null) {
      setIsRange(true)
    } else {
      setIsRange(false)
    }
  }, [ageStatementMin, ageStatementMax])

  const handleRangeToggle = (checked: boolean) => {
    setIsRange(checked)
    if (!checked) {
      // 범위 지정 해제 시 min/max 초기화
      onMinChange(null)
      onMaxChange(null)
    } else {
      // 범위 지정 설정 시 단일 값(년/월) 초기화 — 월은 단일 값 전용
      onAgeChange(null)
      onMonthsChange?.(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isNas}
            onChange={(e) => {
              onNasChange(e.target.checked)
              if (e.target.checked) {
                onAgeChange(null)
                onMonthsChange?.(null)
                onMinChange(null)
                onMaxChange(null)
              }
            }}
            className="w-4 h-4 accent-amber-500 cursor-pointer"
          />
          <span className="text-sm font-medium text-neutral-700">NAS (No Age Statement)</span>
        </label>

        {!isNas && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isRange}
              onChange={(e) => handleRangeToggle(e.target.checked)}
              className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
            />
            <span className="text-xs text-neutral-500">숙성 년수 범위 지정</span>
          </label>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-neutral-600">
          숙성 연수 (년{!isRange && ', 월'})
          {isNas && (
            <span className="ml-1.5 text-neutral-400 font-normal">(NAS 선택 시 저장되지 않음)</span>
          )}
        </label>

        {isRange && !isNas ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={ageStatementMin ?? ''}
                onChange={(e) => onMinChange(e.target.value === '' ? null : Number(e.target.value))}
                placeholder="최소"
                className={`${INPUT_CLS} border-neutral-300`}
              />
            </div>
            <span className="text-neutral-400">~</span>
            <div className="flex-1">
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={ageStatementMax ?? ''}
                onChange={(e) => onMaxChange(e.target.value === '' ? null : Number(e.target.value))}
                placeholder="최대"
                className={`${INPUT_CLS} border-neutral-300`}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={ageStatement ?? ''}
                onChange={(e) => onAgeChange(e.target.value === '' ? null : Number(e.target.value))}
                disabled={isNas}
                placeholder="예: 12"
                className={`${INPUT_CLS} pr-7 ${
                  isNas
                    ? 'opacity-40 cursor-not-allowed bg-neutral-50 border-neutral-300'
                    : 'border-neutral-300'
                }`}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">년</span>
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                min={0}
                max={11}
                step={1}
                value={ageStatementMonths ?? ''}
                onChange={(e) => onMonthsChange?.(e.target.value === '' ? null : Number(e.target.value))}
                disabled={isNas}
                placeholder="예: 6"
                className={`${INPUT_CLS} pr-9 ${
                  isNas
                    ? 'opacity-40 cursor-not-allowed bg-neutral-50 border-neutral-300'
                    : 'border-neutral-300'
                }`}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">개월</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
