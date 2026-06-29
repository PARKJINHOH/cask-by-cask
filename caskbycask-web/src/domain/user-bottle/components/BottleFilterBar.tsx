import { useTranslation } from 'react-i18next';
import type { SpiritCategory, BottleStatus } from '../types/userBottle.types';

const CATS: (SpiritCategory | 'ALL')[] = ['ALL', 'WHISKY', 'COGNAC', 'WINE', 'OTHER'];
const STATUSES: (BottleStatus | 'ALL')[] = ['ALL', 'OPENED', 'UNOPENED'];

interface Props {
  category?: SpiritCategory;
  status?: BottleStatus;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (v?: string) => void;
  onEndDateChange?: (v?: string) => void;
  onReset?: () => void;
  view: 'table' | 'card';
  onCategoryChange: (v?: SpiritCategory) => void;
  onStatusChange: (v?: BottleStatus) => void;
  onViewChange: (v: 'table' | 'card') => void;
  onAdd?: () => void;
}

export function BottleFilterBar({
  category,
  status,
  startDate,
  endDate,
  view,
  onCategoryChange,
  onStatusChange,
  onStartDateChange,
  onEndDateChange,
  onReset,
  onViewChange,
  onAdd,
}: Props) {
  const { t, i18n } = useTranslation();

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
        {onReset && (
          <button
            onClick={onReset}
            title={t('collection.filter.reset', '필터 초기화')}
            className="h-9 w-9 flex items-center justify-center border border-neutral-300 rounded hover:bg-neutral-50 transition-colors text-neutral-500"
            type="button"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18"
              />
            </svg>
          </button>
        )}

        {onStartDateChange && onEndDateChange && (
          <div className="flex items-center gap-1">
            <input
              type="date"
              max="9999-12-31"
              lang={i18n.language}
              value={startDate ?? ''}
              onChange={e => onStartDateChange(e.target.value || undefined)}
              placeholder={t('collection.filter.startDate')}
              className="h-9 text-sm border border-neutral-300 rounded px-2 w-[130px]"
            />
            <span className="text-neutral-400 text-sm">{t('collection.filter.dateSeparator')}</span>
            <input
              type="date"
              max="9999-12-31"
              lang={i18n.language}
              value={endDate ?? ''}
              onChange={e => onEndDateChange(e.target.value || undefined)}
              placeholder={t('collection.filter.endDate')}
              className="h-9 text-sm border border-neutral-300 rounded px-2 w-[130px]"
            />
          </div>
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
