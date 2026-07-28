import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BottleSortDir, BottleSortKey, UserBottle } from '../types/userBottle.types';
import { getUserBottleDisplayNames } from '../utils/userBottleDisplayName';

interface Props {
  bottles: UserBottle[];
  editable?: boolean;
  onDetail?: (b: UserBottle) => void;
  onDelete?: (b: UserBottle) => void;
  onToggleStatus?: (id: number) => void;
  onTogglePublic?: (id: number) => void;
  sortKey?: BottleSortKey;
  sortDir?: BottleSortDir;
  onSort?: (key: BottleSortKey) => void;
}

export function BottleTable({
  bottles,
  editable,
  onDetail,
  onDelete,
  onToggleStatus,
  onTogglePublic,
  sortKey,
  sortDir,
  onSort,
}: Props) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const money = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });
  const [localSortKey, setLocalSortKey] = useState<BottleSortKey | null>(null);
  const [localSortDir, setLocalSortDir] = useState<BottleSortDir>('ASC');
  const effectiveSortKey = onSort ? sortKey : localSortKey;
  const effectiveSortDir = onSort ? sortDir : localSortDir;

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  const sortableColumns: { key: string; sortKey?: BottleSortKey }[] = [
    { key: 'category', sortKey: 'CATEGORY' },
    { key: 'purchaseDate', sortKey: 'PURCHASE_DATE' },
    { key: 'name', sortKey: 'NAME' },
    { key: 'batch' },
    { key: 'volume' },
    { key: 'price', sortKey: 'PRICE' },
    { key: 'status', sortKey: 'STATUS' },
  ];

  const handleSort = (nextKey: BottleSortKey) => {
    if (onSort) {
      onSort(nextKey);
      return;
    }
    if (nextKey === localSortKey) {
      setLocalSortDir(current => current === 'ASC' ? 'DESC' : 'ASC');
      return;
    }
    setLocalSortKey(nextKey);
    setLocalSortDir('ASC');
  };

  const displayBottles = useMemo(() => {
    if (onSort || !localSortKey) return bottles;
    const direction = localSortDir === 'ASC' ? 1 : -1;
    return [...bottles].sort((left, right) => {
      switch (localSortKey) {
        case 'CATEGORY':
          return direction * left.category.localeCompare(right.category);
        case 'PURCHASE_DATE':
          return direction * (left.purchaseDate ?? '').localeCompare(right.purchaseDate ?? '');
        case 'NAME':
          return direction * getUserBottleDisplayNames(left, isEn ? 'en' : 'ko').primaryName.localeCompare(
            getUserBottleDisplayNames(right, isEn ? 'en' : 'ko').primaryName,
          );
        case 'PRICE':
          return direction * ((left.price ?? 0) - (right.price ?? 0));
        case 'STATUS':
          return direction * left.status.localeCompare(right.status);
        case 'VISIBILITY':
          return direction * (Number(left.isPublic) - Number(right.isPublic));
      }
    });
  }, [bottles, isEn, localSortDir, localSortKey, onSort]);

  const SortIcon = ({ columnKey }: { columnKey: BottleSortKey }) => {
    if (effectiveSortKey !== columnKey) return <span className="text-neutral-300 ml-0.5">↕</span>;
    return <span className="text-amber-600 ml-0.5">{effectiveSortDir === 'ASC' ? '↑' : '↓'}</span>;
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
                onClick={() => handleSort('VISIBILITY')}
                className="px-3 py-2 text-center whitespace-nowrap min-w-20 font-medium cursor-pointer select-none hover:text-amber-700"
              >
                {t('collection.table.visibility')}
                <SortIcon columnKey="VISIBILITY" />
              </th>
            )}
            {editable && <th className="px-3 py-2 text-center whitespace-nowrap min-w-16 font-medium">{t('collection.table.actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {displayBottles.map(b => {
            const displayName = getUserBottleDisplayNames(b, isEn ? 'en' : 'ko').primaryName;
            return (
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
                  {displayName}
                </button>
              </td>
              <td className="px-3 py-2 text-neutral-400 max-w-[160px] truncate" title={b.batch ?? undefined}>{b.batch ?? '-'}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap text-xs text-neutral-600">
                {b.volumeMl != null ? `${b.volumeMl.toLocaleString()} ml` : '-'}
              </td>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
