import { useTranslation } from 'react-i18next';
import type { SpiritCategory, BottleStatus } from '../types/userBottle.types';

const CATS: (SpiritCategory | 'ALL')[] = ['ALL', 'WHISKY', 'COGNAC', 'WINE', 'OTHER'];
const STATUSES: (BottleStatus | 'ALL')[] = ['ALL', 'OPENED', 'UNOPENED'];

interface Props {
  category?: SpiritCategory;
  status?: BottleStatus;
  year?: number;
  availableYears?: number[];
  onYearChange?: (v?: number) => void;
  onReset?: () => void;
  view: 'table' | 'card';
  onCategoryChange: (v?: SpiritCategory) => void;
  onStatusChange?: (v?: BottleStatus) => void;
  onViewChange: (v: 'table' | 'card') => void;
  onAdd?: () => void;
}

export function BottleFilterBar({
  category,
  status,
  year,
  availableYears = [],
  view,
  onCategoryChange,
  onStatusChange,
  onYearChange,
  onReset,
  onViewChange,
  onAdd,
}: Props) {
  const { t } = useTranslation();
  const hasFirstRow = onYearChange || onStatusChange || onReset || onAdd;

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4">
      {hasFirstRow && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {onYearChange && (
              <select
                value={year ?? 'ALL'}
                onChange={e => onYearChange(e.target.value === 'ALL' ? undefined : Number(e.target.value))}
                className="h-9 min-w-28 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-700"
                aria-label={t('collection.filter.year')}
              >
                <option value="ALL">{t('collection.filter.allYears')}</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}

            {onStatusChange && (
              <select
                value={status ?? 'ALL'}
                onChange={e => onStatusChange(e.target.value === 'ALL' ? undefined : e.target.value as BottleStatus)}
                className="h-9 min-w-24 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-700"
                aria-label={t('collection.form.status')}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s === 'ALL' ? t('collection.filter.allStatuses') : t(`collection.status.${s}`)}
                  </option>
                ))}
              </select>
            )}

            {onReset && (
              <button
                onClick={onReset}
                title={t('collection.filter.reset')}
                aria-label={t('collection.filter.reset')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-neutral-500 transition-colors hover:bg-neutral-50"
                type="button"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 1 0 3-6.708M3 3v6h6" />
                </svg>
              </button>
            )}
          </div>

          {onAdd && (
            <button
              onClick={onAdd}
              className="h-9 shrink-0 whitespace-nowrap rounded-lg bg-amber-600 px-3 text-sm text-white transition-colors hover:bg-amber-700"
            >
              {t('collection.addBottle')}
            </button>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {CATS.map(c => (
            <button
              key={c}
              onClick={() => onCategoryChange(c === 'ALL' ? undefined : c)}
              className={`h-9 rounded-full px-3 text-sm transition-colors ${
                (c === 'ALL' && !category) || c === category
                  ? 'bg-amber-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {c === 'ALL' ? t('collection.filter.all') : t(`collection.filter.${c}`)}
            </button>
          ))}
        </div>

        <div className="hidden shrink-0 gap-1 md:flex">
          {(['table', 'card'] as const).map(v => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`h-9 rounded-lg px-3 text-sm ${
                view === v ? 'bg-amber-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t(`collection.view.${v}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
