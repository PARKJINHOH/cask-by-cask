import { useState, useEffect } from 'react'
import { sanitizeAgeYearMonth, parseAgeYearMonth, formatAgeYearMonth } from '@/shared/utils/yearMonth'

interface Props {
  isNas: boolean
  ageStatement: number | null
  ageStatementMonths?: number | null
  ageStatementMin: number | null
  ageStatementMinMonths?: number | null
  ageStatementMax: number | null
  ageStatementMaxMonths?: number | null
  onNasChange: (isNas: boolean) => void
  onAgeChange: (age: number | null) => void
  onMonthsChange?: (months: number | null) => void
  onMinChange: (min: number | null) => void
  onMinMonthsChange?: (months: number | null) => void
  onMaxChange: (max: number | null) => void
  onMaxMonthsChange?: (months: number | null) => void
}

const INPUT_CLS = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'

export default function NasToggle({
  isNas,
  ageStatement,
  ageStatementMonths,
  ageStatementMin,
  ageStatementMinMonths,
  ageStatementMax,
  ageStatementMaxMonths,
  onNasChange,
  onAgeChange,
  onMonthsChange,
  onMinChange,
  onMinMonthsChange,
  onMaxChange,
  onMaxMonthsChange,
}: Props) {
  const [isRange, setIsRange] = useState(false)
  const [ageText, setAgeText] = useState(formatAgeYearMonth(ageStatement, ageStatementMonths ?? null))
  const [minText, setMinText] = useState(formatAgeYearMonth(ageStatementMin, ageStatementMinMonths ?? null))
  const [maxText, setMaxText] = useState(formatAgeYearMonth(ageStatementMax, ageStatementMaxMonths ?? null))

  // 프리필 또는 외부 상태 변화 감지
  useEffect(() => {
    if (ageStatementMin != null || ageStatementMax != null) {
      setIsRange(true)
    } else {
      setIsRange(false)
    }
  }, [ageStatementMin, ageStatementMax])

  // 외부에서 값이 바뀐 경우(프리필 등)에만 입력 텍스트를 다시 동기화 — 타이핑 중 하이픈이 지워지지 않도록 함
  useEffect(() => {
    const parsed = parseAgeYearMonth(ageText)
    if (parsed.years !== ageStatement || parsed.months !== (ageStatementMonths ?? null)) {
      setAgeText(formatAgeYearMonth(ageStatement, ageStatementMonths ?? null))
    }
  }, [ageStatement, ageStatementMonths]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const parsed = parseAgeYearMonth(minText)
    if (parsed.years !== ageStatementMin || parsed.months !== (ageStatementMinMonths ?? null)) {
      setMinText(formatAgeYearMonth(ageStatementMin, ageStatementMinMonths ?? null))
    }
  }, [ageStatementMin, ageStatementMinMonths]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const parsed = parseAgeYearMonth(maxText)
    if (parsed.years !== ageStatementMax || parsed.months !== (ageStatementMaxMonths ?? null)) {
      setMaxText(formatAgeYearMonth(ageStatementMax, ageStatementMaxMonths ?? null))
    }
  }, [ageStatementMax, ageStatementMaxMonths]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRangeToggle = (checked: boolean) => {
    setIsRange(checked)
    if (!checked) {
      // 범위 지정 해제 시 min/max 초기화
      onMinChange(null)
      onMinMonthsChange?.(null)
      onMaxChange(null)
      onMaxMonthsChange?.(null)
      setMinText('')
      setMaxText('')
    } else {
      // 범위 지정 설정 시 단일 값(년/월) 초기화
      onAgeChange(null)
      onMonthsChange?.(null)
      setAgeText('')
    }
  }

  const handleAgeTextChange = (raw: string) => {
    const sanitized = sanitizeAgeYearMonth(raw)
    setAgeText(sanitized)
    const { years, months } = parseAgeYearMonth(sanitized)
    onAgeChange(years)
    onMonthsChange?.(months)
  }

  const handleMinTextChange = (raw: string) => {
    const sanitized = sanitizeAgeYearMonth(raw)
    setMinText(sanitized)
    const { years, months } = parseAgeYearMonth(sanitized)
    onMinChange(years)
    onMinMonthsChange?.(months)
  }

  const handleMaxTextChange = (raw: string) => {
    const sanitized = sanitizeAgeYearMonth(raw)
    setMaxText(sanitized)
    const { years, months } = parseAgeYearMonth(sanitized)
    onMaxChange(years)
    onMaxMonthsChange?.(months)
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
                onMinMonthsChange?.(null)
                onMaxChange(null)
                onMaxMonthsChange?.(null)
                setAgeText('')
                setMinText('')
                setMaxText('')
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
          숙성 연수 (년 또는 년-개월)
          {isNas && (
            <span className="ml-1.5 text-neutral-400 font-normal">(NAS 선택 시 저장되지 않음)</span>
          )}
        </label>

        {isRange && !isNas ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={minText}
                onChange={(e) => handleMinTextChange(e.target.value)}
                placeholder="최소 (예: 12 또는 12-06)"
                maxLength={5}
                className={`${INPUT_CLS} border-neutral-300`}
              />
            </div>
            <span className="text-neutral-400">~</span>
            <div className="flex-1">
              <input
                type="text"
                value={maxText}
                onChange={(e) => handleMaxTextChange(e.target.value)}
                placeholder="최대 (예: 12 또는 12-06)"
                maxLength={5}
                className={`${INPUT_CLS} border-neutral-300`}
              />
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
