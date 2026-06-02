import { useTranslation } from 'react-i18next';
import type { BottleStats as IBottleStats } from '../types/userBottle.types';

export function BottleStats({ stats }: { stats: IBottleStats }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-3 px-4 py-3 bg-amber-50 rounded-lg text-sm text-neutral-700">
      <span className="font-semibold">
        {t('collection.stats.totalBottles', { count: stats.totalCount })}
      </span>
      {stats.totalPrice > 0 && (
        <span>{t('collection.stats.totalPrice', { price: stats.totalPrice.toLocaleString() })}</span>
      )}
      <span className="text-green-600">
        {t('collection.stats.opened', { count: stats.openedCount })}
      </span>
      <span className="text-neutral-500">
        {t('collection.stats.unopened', { count: stats.unopenedCount })}
      </span>
      {stats.categoryStats.map(cs => (
        <span key={cs.category} className="text-amber-700">
          {t(`collection.filter.${cs.category}`)} {cs.count}
        </span>
      ))}
    </div>
  );
}
