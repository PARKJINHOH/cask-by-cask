const moneyInputFormatter = new Intl.NumberFormat('ko-KR');

export function parsePriceInput(value: string | number | null | undefined): number {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  return digits === '' ? 0 : Number(digits);
}

export function formatPriceInput(value: string | number | null | undefined): string {
  const parsed = typeof value === 'number' ? value : parsePriceInput(value);
  return moneyInputFormatter.format(Math.max(0, parsed));
}

export function formatOptionalPriceInput(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const parsed = typeof value === 'number' ? value : parsePriceInput(value);
  return parsed === 0 ? '' : formatPriceInput(parsed);
}
