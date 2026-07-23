import { useTranslation } from 'react-i18next';
import type { UserBottle } from '../types/userBottle.types';
import { getUserBottleDisplayNames } from '../utils/userBottleDisplayName';

interface Props {
  bottle: UserBottle | null;
  open: boolean;
  editable?: boolean;
  onClose: () => void;
  onEdit?: (b: UserBottle) => void;
  onDelete?: (b: UserBottle) => void;
}

export function BottleDetailModal({ bottle, open, editable, onClose, onEdit, onDelete }: Props) {
  const { t, i18n } = useTranslation();
  const money = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });

  if (!open || !bottle) return null;

  const b = bottle;
  const { primaryName: mainName, secondaryName: subName } = getUserBottleDisplayNames(b, i18n.language);

  const noData = t('collection.detail.noData');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 이미지 영역 */}
        {b.imageUrls.length > 0 && (
          <div className="flex gap-1 overflow-x-auto p-4 pb-0">
            {b.imageUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={mainName}
                className="w-full max-h-48 object-cover rounded-lg flex-shrink-0"
              />
            ))}
          </div>
        )}

        {/* 헤더 */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {t(`collection.filter.${b.category}`)}
              </span>
              <h2 className="font-bold text-neutral-900 text-lg mt-2 leading-snug break-words">{mainName}</h2>
              {subName && (
                <p className="text-sm text-neutral-400 mt-0.5 break-words">{subName}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 text-xl leading-none flex-shrink-0 mt-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 상세 정보 */}
        <div className="px-5 pb-4">
          <div className="bg-neutral-50 rounded-lg divide-y divide-neutral-200">
            <DetailRow label={t('collection.detail.purchaseDate')} value={b.purchaseDate || noData} />
            <DetailRow label={t('collection.detail.price')} value={b.price != null && b.price > 0 ? money.format(b.price) : noData} />
            <DetailRow label={t('collection.detail.store')} value={b.store || noData} />
            <DetailRow label={t('collection.detail.batch')} value={b.batch || noData} />
            <DetailRow label={t('collection.detail.bottlingYear')} value={b.bottlingYear || noData} />
            <DetailRow label={t('collection.detail.status')}>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                b.status === 'OPENED' ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-500'
              }`}>
                {t(`collection.status.${b.status}`)}
              </span>
            </DetailRow>
            <DetailRow label={t('collection.detail.visibility')}>
              <span className={`text-xs ${b.isPublic ? 'text-blue-500' : 'text-neutral-400'}`}>
                {b.isPublic ? t('collection.visibility.public') : t('collection.visibility.private')}
              </span>
            </DetailRow>
          </div>

          {/* 메모 */}
          <div className="mt-3">
            <p className="text-xs font-medium text-neutral-500 mb-1">{t('collection.detail.memo')}</p>
            <div className="bg-neutral-50 rounded-lg px-3 py-2 text-sm text-neutral-700 min-h-[2rem]">
              {b.memo || <span className="text-neutral-400">{t('collection.detail.noMemo')}</span>}
            </div>
          </div>

          {/* 액션 버튼 */}
          {editable && (
            <div className="flex gap-3 mt-4 pt-3 border-t border-neutral-100">
              <button
                onClick={() => onEdit?.(b)}
                className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                {t('collection.editBottle')}
              </button>
              <button
                onClick={() => onDelete?.(b)}
                className="py-2 px-4 border border-red-200 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              >
                {t('collection.deleteBottle')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-xs text-neutral-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-neutral-800 text-right ml-4 truncate">
        {children ?? value}
      </span>
    </div>
  );
}
