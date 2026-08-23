import { useState, useEffect } from 'react'
import { sanitizeAgeYearMonth, parseAgeYearMonth, formatAgeYearMonth } from '@/shared/utils/yearMonth'
import { RequiredMark } from '@/shared/components/FormFieldLabel'

interface Props {
  isNas: boolean
  ageStatement: number | null
  ageStatementMonths?: number | null
  onNasChange: (isNas: boolean) => void
  onAgeChange: (age: number | null) => void
  onMonthsChange?: (months: number | null) => void
  /**
   * 숙성 연수와 NAS 중 반드시 하나를 골라야 하는 화면인지.
   * 켜면 필수 표시(*)와 안내 문구를 붙인다 — 검증 자체는 호출부 폼이 한다.
   */
  required?: boolean
  /** 검증 실패 메시지 */
  error?: string
  /** 오류 포커스 앵커 이름 — 마스터와 에디션이 같은 화면에 둘 다 나오므로 구분한다. */
  fieldName?: string
}

const INPUT_CLS = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'

export default function NasToggle({
  isNas,
  ageStatement,
  ageStatementMonths,
  onNasChange,
  onAgeChange,
  onMonthsChange,
  required = false,
  error,
  fieldName = 'ageStatement',
}: Props) {
  const [ageText, setAgeText] = useState(formatAgeYearMonth(ageStatement, ageStatementMonths ?? null))

  /** 둘 중 하나를 이미 고른 상태인지 — 고르기 전에만 안내를 띄울 때 쓴다. */
  const hasAgeChoice = isNas || ageStatement != null || ageStatementMonths != null

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
          {required && <RequiredMark />}
          {isNas && (
            <span className="ml-1.5 text-neutral-400 font-normal">(NAS 선택 시 저장되지 않음)</span>
          )}
        </label>

        <input
          type="text"
          data-field={fieldName}
          value={ageText}
          onChange={(e) => handleAgeTextChange(e.target.value)}
          disabled={isNas}
          aria-invalid={!!error}
          placeholder="예: 12 또는 12-06"
          maxLength={5}
          className={`${INPUT_CLS} ${
            isNas
              ? 'opacity-40 cursor-not-allowed bg-neutral-50 border-neutral-300'
              : error
                ? 'border-red-400'
                : 'border-neutral-300'
          }`}
        />

        {/* 둘 중 하나만 고를 수 있다는 것을 오류 전에 알려준다 —
            NAS 체크박스는 입력칸과 떨어져 있어 관계가 보이지 않는다. */}
        {required && !error && !hasAgeChoice && (
          <p className="text-xs text-neutral-400">
            숙성 연수를 입력하거나 NAS 를 체크해주세요. 둘 중 하나만 고를 수 있습니다.
          </p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  )
}
