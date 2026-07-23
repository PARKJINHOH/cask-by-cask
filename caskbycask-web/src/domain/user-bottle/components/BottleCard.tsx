import { useTranslation } from 'react-i18next';
import type { UserBottle } from '../types/userBottle.types';
import { getUserBottleDisplayNames } from '../utils/userBottleDisplayName';

interface Props {
  bottle: UserBottle;
  editable?: boolean;
  onDetail?: (b: UserBottle) => void;
  onDelete?: (b: UserBottle) => void;
  onToggleStatus?: (id: number) => void;
  onTogglePublic?: (id: number) => void;
}

export function BottleCard({ bottle: b, editable, onDetail, onDelete, onToggleStatus, onTogglePublic }: Props) {
  const { t, i18n } = useTranslation();
  const money = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });
  const { primaryName: name } = getUserBottleDisplayNames(b, i18n.language);

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {b.imageUrls[0] && (
        <img src={b.imageUrls[0]} alt={name} className="w-full h-28 object-cover rounded-md mb-3" />
      )}
      <div className="flex items-start justify-between gap-3 mb-1">
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
          {t(`collection.filter.${b.category}`)}
        </span>
        {editable && (
          <button
            onClick={() => onTogglePublic?.(b.id)}
            className={`text-xs whitespace-nowrap ${b.isPublic ? 'text-blue-500' : 'text-neutral-300'}`}
          >
            {b.isPublic ? t('collection.visibility.public') : t('collection.visibility.private')}
          </button>
        )}
      </div>
      <h3
        onClick={() => onDetail?.(b)}
        className="font-semibold text-neutral-900 text-sm leading-snug mt-1 cursor-pointer hover:text-amber-600 hover:underline transition-colors"
      >
        {name}
      </h3>
      {b.batch && <p className="text-xs text-neutral-400 mt-0.5 truncate" title={b.batch}>{b.batch}</p>}
      <div className="flex items-center justify-between gap-3 mt-2">
        <span className="text-sm font-medium whitespace-nowrap">
          {b.price != null && b.price > 0 ? money.format(b.price) : '-'}
        </span>
        <button
          onClick={() => editable && onToggleStatus?.(b.id)}
          disabled={!editable}
          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
            b.status === 'OPENED' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
          } ${editable ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {t(`collection.status.${b.status}`)}
        </button>
      </div>
      {editable && (
        <div className="flex flex-nowrap gap-3 mt-3 pt-2 border-t border-neutral-100">
          <button onClick={() => onDelete?.(b)} className="text-xs text-neutral-500 hover:text-red-500 whitespace-nowrap">
            {t('collection.deleteBottle')}
          </button>
        </div>
      )}
    </div>
  );
}
