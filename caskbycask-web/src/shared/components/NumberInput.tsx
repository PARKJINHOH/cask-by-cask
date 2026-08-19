import { forwardRef, type InputHTMLAttributes } from 'react'
import { sanitizeNumberInput } from '@/shared/utils/numberInput'

/** `type="number"` 가 값으로 받아 주지만 우리는 원치 않는 글쇠. */
const BLOCKED_KEYS = new Set(['e', 'E', '+'])

export type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * 숫자만 받는 입력칸 — `<input type="number">` 를 그대로 대체한다.
 *
 * <p>브라우저의 `type="number"` 는 두 가지가 헐겁다. 지수 표기(`1e5`)와 부호를 글쇠로
 * 받아 주는데 그때 `value` 는 빈 문자열이 되어 **화면에는 글자가 보이는데 상태는 비는**
 * 상태가 만들어지고, `"007"` 같은 앞자리 0 도 그대로 통과시킨다.
 *
 * <p>여기서 두 겹으로 막는다. 글쇠 단계에서 지수·부호를 먼저 걸러 내고, 붙여넣기처럼
 * 글쇠를 거치지 않는 입력은 onChange 에서 정규화한다. 값을 손본 뒤 부모의 onChange 를
 * 부르므로 호출부는 평소대로 `event.target.value` 만 읽으면 된다.
 *
 * <p>소수점·음수 허용 여부는 이미 붙어 있는 `step`·`min` 에서 읽는다 — 정수 `step` 이면
 * 소수점을 막고, `min` 이 0 이상이면 음수를 막는다. 둘 다 없으면 종전대로 다 받는다.
 *
 * <p>전화번호·인증번호처럼 앞자리 0 이 뜻을 갖는 칸에는 쓰지 않는다.
 */
const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { onChange, onKeyDown, step, min, ...rest },
  ref,
) {
  const allowDecimal = step === undefined || !Number.isInteger(Number(step))
  const allowNegative = min !== undefined && Number(min) < 0

  return (
    <input
      {...rest}
      ref={ref}
      type="number"
      step={step}
      min={min}
      onKeyDown={(event) => {
        if (BLOCKED_KEYS.has(event.key)
          || (!allowNegative && event.key === '-')
          || (!allowDecimal && event.key === '.')) {
          event.preventDefault()
          return
        }
        onKeyDown?.(event)
      }}
      onChange={(event) => {
        const cleaned = sanitizeNumberInput(event.target.value, {
          decimal: allowDecimal,
          negative: allowNegative,
        })
        // React 가 노드에 심어 둔 value 서술자를 거치므로 변경 추적기도 함께 갱신된다.
        if (cleaned !== event.target.value) event.target.value = cleaned
        onChange?.(event)
      }}
    />
  )
})

export default NumberInput
