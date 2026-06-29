import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserBottle } from '../types/userBottle.types';

interface Props {
  bottles: UserBottle[];
  editable?: boolean;
  onDetail?: (b: UserBottle) => void;
  onDelete?: (b: UserBottle) => void;
  onToggleStatus?: (id: number) => void;
  onTogglePublic?: (id: number) => void;
}

type SortKey = 'category' | 'name' | 'purchaseDate' | 'price' | 'status' | 'visibility';
type SortDir = 'asc' | 'desc';

export function BottleTable({ bottles, editable, onDetail, onDelete, onToggleStatus, onTogglePublic }: Props) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const money = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const displayName = (b: UserBottle) =>
    b.spiritId
      ? (isEn ? (b.spiritNameEn || b.spiritNameKo || '') : (b.spiritNameKo || ''))
      : (b.spiritNameText || '');

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedBottles = useMemo(() => {
    if (!sortKey) return bottles;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...bottles].sort((a, b) => {
      switch (sortKey) {
        case 'category':
          return dir * a.category.localeCompare(b.category);
        case 'name':
          return dir * displayName(a).localeCompare(displayName(b));
        case 'purchaseDate':
          return dir * ((a.purchaseDate ?? '').localeCompare(b.purchaseDate ?? ''));
        case 'price':
          return dir * ((a.price ?? 0) - (b.price ?? 0));
        case 'status':
          return dir * a.status.localeCompare(b.status);
        case 'visibility':
          return dir * (Number(a.isPublic) - Number(b.isPublic));
        default:
          return 0;
      }
    });
  }, [bottles, sortKey, sortDir, isEn]);

  const sortableColumns: { key: string; sortKey?: SortKey }[] = [
    { key: 'category', sortKey: 'category' },
    { key: 'purchaseDate', sortKey: 'purchaseDate' },
    { key: 'name', sortKey: 'name' },
    { key: 'batch' },
    { key: 'price', sortKey: 'price' },
    { key: 'status', sortKey: 'status' },
  ];

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <span className="text-neutral-300 ml-0.5">↕</span>;
    return <span className="text-amber-600 ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-amber-50 text-neutral-600 text-left text-xs">
            {sortableColumns.map(col => (
              <th
                key={col.key}
                onClick={col.sortKey ? () => handleSort(col.sortKey!) : undefined}
                className={`px-3 py-2 whitespace-nowrap font-medium ${col.sortKey ? 'cursor-pointer select-none hover:text-amber-700' : ''}`}
              >
                {t(`collection.table.${col.key}`)}
                {col.sortKey && <SortIcon columnKey={col.sortKey} />}
              </th>
            ))}
            {editable && (
              <th
                onClick={() => handleSort('visibility')}
                className="px-3 py-2 text-center whitespace-nowrap min-w-20 font-medium cursor-pointer select-none hover:text-amber-700"
              >
                {t('collection.table.visibility')}
                <SortIcon columnKey="visibility" />
              </th>
            )}
            {editable && <th className="px-3 py-2 text-center whitespace-nowrap min-w-16 font-medium">{t('collection.table.actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {sortedBottles.map(b => (
            <tr key={b.id} className="border-b hover:bg-neutral-50">
              <td className="px-3 py-2 text-amber-600 font-medium whitespace-nowrap text-xs">
                {t(`collection.filter.${b.category}`)}
              </td>
              <td className="px-3 py-2 text-neutral-500 whitespace-nowrap text-xs">
                {formatDate(b.purchaseDate)}
              </td>
              <td className="px-3 py-2 font-medium min-w-40">
                <button
                  onClick={() => onDetail?.(b)}
                  className="text-left hover:text-amber-600 hover:underline transition-colors cursor-pointer"
                >
                  {displayName(b)}
                </button>
              </td>
              <td className="px-3 py-2 text-neutral-400 max-w-[160px] truncate" title={b.batch ?? undefined}>{b.batch ?? '-'}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap text-xs text-neutral-600">
                {b.price != null && b.price > 0 ? money.format(b.price) : '-'}
              </td>
              <td className="px-3 py-2 text-center whitespace-nowrap min-w-20">
                <button onClick={() => editable && onToggleStatus?.(b.id)} disabled={!editable}
                  className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                    b.status === 'OPENED' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                  } ${editable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
                    {t(`collection.status.${b.status}`)}
                </button>
              </td>
              {editable && (
                <td className="px-3 py-2 text-center whitespace-nowrap min-w-20">
                  <button onClick={() => onTogglePublic?.(b.id)}
                    className={`text-xs whitespace-nowrap ${b.isPublic ? 'text-blue-500' : 'text-neutral-300'}`}>
                    {b.isPublic ? t('collection.visibility.public') : t('collection.visibility.private')}
                  </button>
                </td>
              )}
              {editable && (
                <td className="px-3 py-2 whitespace-nowrap min-w-16">
                  <div className="flex flex-nowrap gap-2 justify-center">
                    <button onClick={() => onDelete?.(b)} className="text-neutral-400 hover:text-red-500 text-xs px-1 whitespace-nowrap">{t('collection.deleteBottle')}</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
