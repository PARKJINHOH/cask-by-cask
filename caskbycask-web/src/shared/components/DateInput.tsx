import { forwardRef, type InputHTMLAttributes } from 'react'

/**
 * 날짜 입력 박스. 네이티브 `<input type="date">` 기본 동작을 그대로 사용한다.
 *
 * - 연/월/일 텍스트를 클릭하면 해당 세그먼트가 선택되어 키보드로 숫자 입력이 가능하다.
 * - 우측 달력 아이콘을 클릭하면 네이티브 달력 피커가 열린다.
 * - 연도는 항상 4자리(yyyy)로 제한: max 가 없으면 네이티브 date 는 연도를 최대 6자리까지
 *   허용하므로 기본 max='9999-12-31' 을 둔다. (호출부에서 max 를 넘기면 그 값이 우선)
 */
const DateInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function DateInput({ className = '', max = '9999-12-31', ...props }, ref) {
    return (
      <input
        ref={ref}
        type="date"
        max={max}
        className={className}
        {...props}
      />
    )
  },
)

export default DateInput
