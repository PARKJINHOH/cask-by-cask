export interface SanitizeNumberOptions {
  /** 소수점을 허용할지. false 면 정수만 남긴다. 기본값 true. */
  decimal?: boolean
  /** 음수를 허용할지. 기본값 false. */
  negative?: boolean
}

/**
 * 숫자 입력칸의 값을 정규화한다.
 *
 * <p>두 가지를 바로잡는다.
 * <ul>
 *   <li>숫자가 아닌 글자를 버린다 — `type="number"` 는 지수 표기(`1e5`)와 부호를 그대로
 *       통과시켜서, 화면에는 글자가 남는데 `value` 는 빈 문자열이 되는 상태가 만들어진다.</li>
 *   <li>앞자리 0 을 없앤다 — `"01"` → `"1"`, `"007"` → `"7"`.
 *       값 자체인 `"0"` 과 소수의 `"0.5"` 는 그대로 둔다.</li>
 * </ul>
 *
 * <p>입력 도중 상태(`"0."`, `"-"`)는 살려 둔다. 타이핑 중에 글자가 사라지면 소수점이나
 * 음수를 아예 칠 수 없다.
 *
 * <p>전화번호·인증번호처럼 **앞자리 0 이 의미를 갖는 숫자열에는 쓰지 않는다** — 그런 값은
 * 수량이 아니라 식별자다.
 */
export function sanitizeNumberInput(
  raw: string,
  { decimal = true, negative = false }: SanitizeNumberOptions = {},
): string {
  if (raw === '') return ''

  const sign = negative && raw.trimStart().startsWith('-') ? '-' : ''
  let body = raw.replace(/[^\d.]/g, '')

  if (decimal) {
    // 소수점은 하나만 — 두 번째부터는 버린다.
    const [head, ...rest] = body.split('.')
    body = rest.length > 0 ? `${head}.${rest.join('')}` : head
  } else {
    body = body.replace(/\./g, '')
  }

  const dotIndex = body.indexOf('.')
  const intPart = dotIndex < 0 ? body : body.slice(0, dotIndex)
  const fracPart = dotIndex < 0 ? null : body.slice(dotIndex + 1)

  // 뒤에 숫자가 더 있을 때만 앞자리 0 을 걷어낸다 → "0" 과 "0.5" 의 0 은 살아남는다.
  const normalizedInt = intPart.replace(/^0+(?=\d)/, '')
  const value = fracPart === null ? normalizedInt : `${normalizedInt}.${fracPart}`

  return `${sign}${value}`
}
