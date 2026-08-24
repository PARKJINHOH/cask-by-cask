/**
 * 가격 표기 공용 유틸.
 *
 * 프로젝트 곳곳에서 `new Intl.NumberFormat('ko-KR')` 을 각자 선언하고 "원"을 하드코딩해 왔다.
 * 해외·면세 가격이 늘면서 원 통화와 원화 환산을 함께 보여줘야 하므로 표기를 여기로 모은다.
 *
 * USD 와 TWD 가 둘 다 '$' 를 쓰기 때문에 `US$` / `NT$` 로 구분한다. 맨 '$' 는 쓰지 않는다.
 */

export const CURRENCY_SYMBOL: Record<string, string> = {
  USD: 'US$',
  TWD: 'NT$',
  JPY: '¥',
  CNY: 'CN¥',
  EUR: '€',
  HKD: 'HK$',
  SGD: 'S$',
}

const numberFormat = new Intl.NumberFormat('ko-KR')

export const isKrw = (currency?: string | null): boolean =>
  !currency || currency.toUpperCase() === 'KRW'

/** 숫자만 콤마 구분으로 포맷한다(통화 기호 없음). */
export function formatAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '-'
  return numberFormat.format(Number(value))
}

/** 원화 표기: `259,000원` */
export function formatKrw(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '-'
  return `${numberFormat.format(Number(value))}원`
}

/** 통화 표기: KRW 는 `259,000원`, 외화는 `US$187`. 모르는 통화는 `187 XXX` 로 떨어뜨린다. */
export function formatMoney(value: number | null | undefined, currency?: string | null): string {
  if (value == null || !Number.isFinite(Number(value))) return '-'
  if (isKrw(currency)) return formatKrw(value)

  const code = String(currency).toUpperCase()
  const amount = numberFormat.format(Number(value))
  const symbol = CURRENCY_SYMBOL[code]
  return symbol ? `${symbol}${amount}` : `${amount} ${code}`
}

/**
 * 원 통화와 원화 환산을 함께 표기한다: `US$187 (약 259,000원)`
 *
 * KRW 이거나 환산값이 없으면 한쪽만 돌려준다.
 */
export function formatMoneyWithKrw(
  value: number | null | undefined,
  currency: string | null | undefined,
  krwValue: number | null | undefined,
  approxLabel = '약',
): string {
  if (isKrw(currency)) return formatKrw(krwValue ?? value)
  const original = formatMoney(value, currency)
  if (krwValue == null || !Number.isFinite(Number(krwValue))) return original
  return `${original} (${approxLabel} ${formatKrw(krwValue)})`
}
