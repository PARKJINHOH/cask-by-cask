import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BottleSortDir, BottleSortKey, UserBottle } from '../types/userBottle.types';
import { getUserBottleDisplayNames } from '../utils/userBottleDisplayName';

interface Props {
  bottles: UserBottle[];
  editable?: boolean;
  onDetail?: (b: UserBottle) => void;
  onToggleStatus?: (id: number) => void;
  onTogglePublic?: (id: number) => void;
  sortKey?: BottleSortKey;
  sortDir?: BottleSortDir;
  onSort?: (key: BottleSortKey) => void;
}

/**
 * 컬럼 폭은 % 로 지정한다.
 * `table-fixed` + % 폭 조합이라 브라우저 폭이 줄어들면 컬럼이 가로 스크롤 없이 함께 축소되고,
 * 넘치는 텍스트(품명·배치)는 truncate 로 말줄임 처리된다.
 */
const COLUMN_WIDTHS = {
  category: '9%',
  purchaseDate: '10%',
  name: '29%',
  batch: '13%',
  volume: '11%',
  price: '14%',
  status: '9%',
  visibility: '8%',
} as const;

export function BottleTable({
  bottles,
  editable,
  onDetail,
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

  const sortableColumns: { key: keyof typeof COLUMN_WIDTHS; sortKey?: BottleSortKey; align?: 'right' | 'center' }[] = [
    { key: 'category', sortKey: 'CATEGORY' },
    { key: 'purchaseDate', sortKey: 'PURCHASE_DATE' },
    { key: 'name', sortKey: 'NAME' },
    { key: 'batch' },
    { key: 'volume', align: 'right' },
    { key: 'price', sortKey: 'PRICE', align: 'right' },
    { key: 'status', sortKey: 'STATUS', align: 'center' },
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

  // 공개 컬럼이 없으면 남는 폭을 품명 컬럼에 더해 빈 공간이 생기지 않게 한다.
  const nameWidth = editable
    ? COLUMN_WIDTHS.name
    : `calc(${COLUMN_WIDTHS.name} + ${COLUMN_WIDTHS.visibility})`;

  const cellBase = 'px-1.5 py-1.5 sm:px-2 lg:px-3 text-[11px] lg:text-xs';
  const alignCls = (align?: 'right' | 'center') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        {sortableColumns.map(col => (
          <col
            key={col.key}
            style={{ width: col.key === 'name' ? nameWidth : COLUMN_WIDTHS[col.key] }}
          />
        ))}
        {editable && <col style={{ width: COLUMN_WIDTHS.visibility }} />}
      </colgroup>
      <thead>
        <tr className="bg-amber-50 text-neutral-600">
          {sortableColumns.map(col => (
            <th
              key={col.key}
              onClick={col.sortKey ? () => handleSort(col.sortKey!) : undefined}
              className={`${cellBase} ${alignCls(col.align)} truncate font-medium
                ${col.sortKey ? 'cursor-pointer select-none hover:text-amber-700' : ''}`}
            >
              {t(`collection.table.${col.key}`)}
              {col.sortKey && <SortIcon columnKey={col.sortKey} />}
            </th>
          ))}
          {editable && (
            <th
              onClick={() => handleSort('VISIBILITY')}
              className={`${cellBase} truncate text-center font-medium cursor-pointer select-none hover:text-amber-700`}
            >
              {t('collection.table.visibility')}
              <SortIcon columnKey="VISIBILITY" />
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {displayBottles.map(b => {
          const displayName = getUserBottleDisplayNames(b, isEn ? 'en' : 'ko').primaryName;
          return (
          <tr key={b.id} className="border-b hover:bg-neutral-50">
            <td className={`${cellBase} text-amber-600 font-medium truncate`}>
              {t(`collection.filter.${b.category}`)}
            </td>
            <td className={`${cellBase} text-neutral-500 truncate`}>
              {formatDate(b.purchaseDate)}
            </td>
            <td className={`${cellBase} font-medium`}>
              <button
                onClick={() => onDetail?.(b)}
                title={displayName}
                className="block w-full truncate text-left hover:text-amber-600 hover:underline transition-colors cursor-pointer"
              >
                {displayName}
              </button>
            </td>
            <td className={`${cellBase} text-neutral-400 truncate`} title={b.batch ?? undefined}>
              {b.batch ?? '-'}
            </td>
            <td className={`${cellBase} text-right text-neutral-600 truncate`}>
              {b.volumeMl != null ? `${b.volumeMl.toLocaleString()} ml` : '-'}
            </td>
            <td className={`${cellBase} text-right text-neutral-600 truncate`}>
              {b.price != null && b.price > 0 ? money.format(b.price) : '-'}
            </td>
            <td className={`${cellBase} text-center`}>
              <button onClick={() => editable && onToggleStatus?.(b.id)} disabled={!editable}
                className={`inline-block max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] lg:text-[11px] ${
                  b.status === 'OPENED' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                } ${editable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
                  {t(`collection.status.${b.status}`)}
              </button>
            </td>
            {editable && (
              <td className={`${cellBase} text-center`}>
                <button onClick={() => onTogglePublic?.(b.id)}
                  className={`block w-full truncate text-[10px] lg:text-[11px] cursor-pointer ${b.isPublic ? 'text-blue-500' : 'text-neutral-300'}`}>
                  {b.isPublic ? t('collection.visibility.public') : t('collection.visibility.private')}
                </button>
              </td>
            )}
          </tr>
          );
        })}
      </tbody>
    </table>
  );
}
