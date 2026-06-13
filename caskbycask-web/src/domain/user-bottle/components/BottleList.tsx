import { useTranslation } from 'react-i18next';
import EmptyState from '@/shared/components/EmptyState';
import type { UserBottle } from '../types/userBottle.types';
import { BottleTable } from './BottleTable';
import { BottleCard } from './BottleCard';

interface Props {
  bottles: UserBottle[];
  view: 'table' | 'card';
  editable?: boolean;
  onEdit?: (b: UserBottle) => void;
  onDelete?: (b: UserBottle) => void;
  onToggleStatus?: (id: number) => void;
  onTogglePublic?: (id: number) => void;
}

export function BottleList({ bottles, view, editable, onEdit, onDelete, onToggleStatus, onTogglePublic }: Props) {
  const { t } = useTranslation();
  const shared = { bottles, editable, onEdit, onDelete, onToggleStatus, onTogglePublic };

  if (bottles.length === 0) {
    return (
      <EmptyState
        title={t('collection.empty')}
        description={t('collection.emptyDesc')}
        className="border border-neutral-200 rounded-2xl bg-white"
      />
    );
  }

  return (
    <>
      {/* PC: view 상태 따름 */}
      <div className="hidden md:block">
        {view === 'table'
          ? <BottleTable {...shared} />
          : <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {bottles.map(b => <BottleCard key={b.id} bottle={b} editable={editable}
                onEdit={onEdit} onDelete={onDelete}
                onToggleStatus={onToggleStatus} onTogglePublic={onTogglePublic} />)}
            </div>
        }
      </div>
      {/* 모바일: 카드 고정 */}
      <div className="md:hidden grid grid-cols-1 gap-3 pt-2">
        {bottles.map(b => <BottleCard key={b.id} bottle={b} editable={editable}
          onEdit={onEdit} onDelete={onDelete}
          onToggleStatus={onToggleStatus} onTogglePublic={onTogglePublic} />)}
      </div>
    </>
  );
}
