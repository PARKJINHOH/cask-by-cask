import { useState, useEffect } from 'react'
import { sanitizeAgeYearMonth, parseAgeYearMonth, formatAgeYearMonth } from '@/shared/utils/yearMonth'

interface Props {
  isNas: boolean
  ageStatement: number | null
  ageStatementMonths?: number | null
  onNasChange: (isNas: boolean) => void
  onAgeChange: (age: number | null) => void
  onMonthsChange?: (months: number | null) => void
}

const INPUT_CLS = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'

export default function NasToggle({
  isNas,
  ageStatement,
  ageStatementMonths,
  onNasChange,
  onAgeChange,
  onMonthsChange,
}: Props) {
  const [ageText, setAgeText] = useState(formatAgeYearMonth(ageStatement, ageStatementMonths ?? null))

  // 외부에서 값이 바뀐 경우(프리필 등)에만 입력 텍스트를 다시 동기화 — 타이핑 중 하이픈이 지워지지 않도록 함
  useEffect(() => {
    const parsed = parseAgeYearMonth(ageText)
    if (parsed.years !== ageStatement || parsed.months !== (ageStatementMonths ?? null)) {
      setAgeText(formatAgeYearMonth(ageStatement, ageStatementMonths ?? null))
    }
  }, [ageStatement, ageStatementMonths]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAgeTextChange = (raw: string) => {
    const sanitized = sanitizeAgeYearMonth(raw)
    setAgeText(sanitized)
    const { years, months } = parseAgeYearMonth(sanitized)
    onAgeChange(years)
    onMonthsChange?.(months)
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isNas}
          onChange={(e) => {
            onNasChange(e.target.checked)
            if (e.target.checked) {
              onAgeChange(null)
              onMonthsChange?.(null)
              setAgeText('')
            }
          }}
          className="w-4 h-4 accent-amber-500 cursor-pointer"
        />
        <span className="text-sm font-medium text-neutral-700">NAS (No Age Statement)</span>
      </label>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-neutral-600">
          숙성 연수 (년 또는 년-개월)
          {isNas && (
            <span className="ml-1.5 text-neutral-400 font-normal">(NAS 선택 시 저장되지 않음)</span>
          )}
        </label>

        <input
          type="text"
          value={ageText}
          onChange={(e) => handleAgeTextChange(e.target.value)}
          disabled={isNas}
          placeholder="예: 12 또는 12-06"
          maxLength={5}
          className={`${INPUT_CLS} ${
            isNas
              ? 'opacity-40 cursor-not-allowed bg-neutral-50 border-neutral-300'
              : 'border-neutral-300'
          }`}
        />
      </div>
    </div>
  )
}
