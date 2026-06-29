import { useTranslation } from 'react-i18next';
import type { UserBottle } from '../types/userBottle.types';

interface Props {
  bottles: UserBottle[];
  editable?: boolean;
  onEdit?: (b: UserBottle) => void;
  onDelete?: (b: UserBottle) => void;
  onToggleStatus?: (id: number) => void;
  onTogglePublic?: (id: number) => void;
}

export function BottleTable({ bottles, editable, onEdit, onDelete, onToggleStatus, onTogglePublic }: Props) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const money = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });

  const displayName = (b: UserBottle) =>
    b.spiritId
      ? (isEn ? (b.spiritNameEn || b.spiritNameKo || '') : (b.spiritNameKo || ''))
      : (b.spiritNameText || '');

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-amber-50 text-neutral-600 text-left text-xs">
            {['category', 'purchaseDate', 'name', 'batch', 'bottlingYear', 'price', 'store', 'status'].map(k => (
              <th key={k} className="px-3 py-2 whitespace-nowrap font-medium">
                {t(`collection.table.${k}`)}
              </th>
            ))}
            {editable && <th className="px-3 py-2 text-center">{t('collection.table.visibility')}</th>}
            {editable && <th className="px-3 py-2 text-center">{t('collection.table.actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {bottles.map(b => (
            <tr key={b.id} className="border-b hover:bg-neutral-50">
              <td className="px-3 py-2 text-amber-600 font-medium whitespace-nowrap text-xs">
                {t(`collection.filter.${b.category}`)}
              </td>
              <td className="px-3 py-2 text-neutral-500 whitespace-nowrap">{b.purchaseDate ?? '-'}</td>
              <td className="px-3 py-2 font-medium">{displayName(b)}</td>
              <td className="px-3 py-2 text-neutral-400">{b.batch ?? '-'}</td>
              <td className="px-3 py-2 text-neutral-400">{b.bottlingYear ?? '-'}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                {b.price != null && b.price > 0 ? money.format(b.price) : '-'}
              </td>
              <td className="px-3 py-2 text-neutral-600 max-w-[120px] truncate" title={b.store ?? undefined}>{b.store ?? '-'}</td>
              <td className="px-3 py-2 text-center">
                <button onClick={() => editable && onToggleStatus?.(b.id)} disabled={!editable}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    b.status === 'OPENED' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
                  } ${editable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
                  {t(`collection.status.${b.status}`)}
                </button>
              </td>
              {editable && (
                <td className="px-3 py-2 text-center">
                  <button onClick={() => onTogglePublic?.(b.id)}
                    className={b.isPublic ? 'text-blue-500' : 'text-neutral-300'}>
                    <span className="text-xs">{b.isPublic ? t('collection.visibility.public') : t('collection.visibility.private')}</span>
                  </button>
                </td>
              )}
              {editable && (
                <td className="px-3 py-2">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => onEdit?.(b)} className="text-neutral-400 hover:text-amber-600 text-xs px-1">{t('collection.editBottle')}</button>
                    <button onClick={() => onDelete?.(b)} className="text-neutral-400 hover:text-red-500 text-xs px-1">{t('collection.deleteBottle')}</button>
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
