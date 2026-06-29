import { useTranslation } from 'react-i18next';
import type { SpiritCategory, BottleStatus } from '../types/userBottle.types';

const CATS: (SpiritCategory | 'ALL')[] = ['ALL', 'WHISKY', 'COGNAC', 'WINE', 'OTHER'];
const STATUSES: (BottleStatus | 'ALL')[] = ['ALL', 'OPENED', 'UNOPENED'];

interface Props {
  category?: SpiritCategory;
  status?: BottleStatus;
  year?: number;
  years?: number[];
  view: 'table' | 'card';
  onCategoryChange: (v?: SpiritCategory) => void;
  onStatusChange: (v?: BottleStatus) => void;
  onYearChange?: (v?: number) => void;
  onViewChange: (v: 'table' | 'card') => void;
  onAdd?: () => void;
}

export function BottleFilterBar({
  category,
  status,
  year,
  years = [],
  view,
  onCategoryChange,
  onStatusChange,
  onYearChange,
  onViewChange,
  onAdd,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 py-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-1 flex-wrap">
        {CATS.map(c => (
          <button
            key={c}
            onClick={() => onCategoryChange(c === 'ALL' ? undefined : c)}
            className={`h-9 px-3 rounded-full text-sm transition-colors ${
              (c === 'ALL' && !category) || c === category
                ? 'bg-amber-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {c === 'ALL' ? t('collection.filter.all') : t(`collection.filter.${c}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {onYearChange && (
          <select
            value={year ?? 'ALL'}
            onChange={e => onYearChange(e.target.value === 'ALL' ? undefined : Number(e.target.value))}
            className="h-9 min-w-28 text-sm border border-neutral-300 rounded px-2"
          >
            <option value="ALL">{t('collection.filter.allYears')}</option>
            {years.map(y => (
              <option key={y} value={y}>{t('collection.filter.year', { year: y })}</option>
            ))}
          </select>
        )}

        <select
          value={status ?? 'ALL'}
          onChange={e => onStatusChange(e.target.value === 'ALL' ? undefined : e.target.value as BottleStatus)}
          className="h-9 min-w-24 text-sm border border-neutral-300 rounded px-2"
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s === 'ALL' ? t('collection.filter.all') : t(`collection.status.${s}`)}
            </option>
          ))}
        </select>

        <div className="hidden md:flex gap-1">
          {(['table', 'card'] as const).map(v => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`h-9 px-3 text-sm rounded ${view === v ? 'bg-amber-600 text-white' : 'bg-neutral-100 text-neutral-600'}`}
            >
              {t(`collection.view.${v}`)}
            </button>
          ))}
        </div>

        {onAdd && (
          <button
            onClick={onAdd}
            className="h-9 px-3 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 transition-colors whitespace-nowrap"
          >
            {t('collection.addBottle')}
          </button>
        )}
      </div>
    </div>
  );
}
