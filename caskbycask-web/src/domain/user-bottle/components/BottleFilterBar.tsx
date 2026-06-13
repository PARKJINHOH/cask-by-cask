import { useTranslation } from 'react-i18next';
import type { SpiritCategory, BottleStatus } from '../types/userBottle.types';

const CATS: (SpiritCategory | 'ALL')[] = ['ALL', 'WHISKY', 'COGNAC', 'WINE', 'OTHER'];
const STATUSES: (BottleStatus | 'ALL')[] = ['ALL', 'OPENED', 'UNOPENED'];

interface Props {
  category?: SpiritCategory;
  status?: BottleStatus;
  view: 'table' | 'card';
  onCategoryChange: (v?: SpiritCategory) => void;
  onStatusChange: (v?: BottleStatus) => void;
  onViewChange: (v: 'table' | 'card') => void;
  onAdd?: () => void;
}

export function BottleFilterBar({ category, status, view, onCategoryChange, onStatusChange, onViewChange, onAdd }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <div className="flex gap-1 flex-wrap">
        {CATS.map(c => (
          <button key={c}
            onClick={() => onCategoryChange(c === 'ALL' ? undefined : c)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              (c === 'ALL' && !category) || c === category
                ? 'bg-amber-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}>
            {c === 'ALL' ? t('collection.filter.all') : t(`collection.filter.${c}`)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <select value={status ?? 'ALL'}
          onChange={e => onStatusChange(e.target.value === 'ALL' ? undefined : e.target.value as BottleStatus)}
          className="text-sm border border-neutral-300 rounded px-2 py-1">
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s === 'ALL' ? t('collection.filter.all') : t(`collection.status.${s}`)}
            </option>
          ))}
        </select>
        <div className="hidden md:flex gap-1">
          {(['table', 'card'] as const).map(v => (
            <button key={v} onClick={() => onViewChange(v)}
              className={`px-2 py-1 text-sm rounded ${view === v ? 'bg-amber-600 text-white' : 'bg-neutral-100'}`}>
              {v === 'table' ? '≡' : '⊞'}
            </button>
          ))}
        </div>
        {onAdd && (
          <button onClick={onAdd}
            className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 transition-colors">
            {t('collection.addBottle')}
          </button>
        )}
      </div>
    </div>
  );
}
