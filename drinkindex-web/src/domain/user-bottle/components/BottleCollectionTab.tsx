import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserBottle, SpiritCategory, BottleStatus } from '../types/userBottle.types';
import { useMyBottles, useDeleteBottle, useToggleBottleStatus, useToggleBottlePublic } from '../hooks/useUserBottle';
import { BottleStats } from './BottleStats';
import { BottleFilterBar } from './BottleFilterBar';
import { BottleList } from './BottleList';
import { BottleFormModal } from './BottleFormModal';

export function BottleCollectionTab() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<SpiritCategory | undefined>();
  const [status, setStatus] = useState<BottleStatus | undefined>();
  const [view, setView] = useState<'table' | 'card'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserBottle | undefined>();

  const { data, isLoading } = useMyBottles({ category, status });
  const deleteMut = useDeleteBottle();
  const toggleStatusMut = useToggleBottleStatus();
  const togglePublicMut = useToggleBottlePublic();

  const handleDelete = (b: UserBottle) => {
    const name = b.spiritNameKo || b.spiritNameText || '';
    if (confirm(t('collection.deleteConfirm', { name }))) deleteMut.mutate(b.id);
  };

  if (isLoading) return <div className="py-8 text-center text-gray-400">{t('common.loading')}</div>;

  return (
    <div className="space-y-3">
      {data?.stats && <BottleStats stats={data.stats} />}
      <BottleFilterBar
        category={category} status={status} view={view}
        onCategoryChange={setCategory} onStatusChange={setStatus}
        onViewChange={setView}
        onAdd={() => { setEditing(undefined); setModalOpen(true); }}
      />
      <BottleList
        bottles={data?.bottles ?? []} view={view} editable
        onEdit={b => { setEditing(b); setModalOpen(true); }}
        onDelete={handleDelete}
        onToggleStatus={id => toggleStatusMut.mutate(id)}
        onTogglePublic={id => togglePublicMut.mutate(id)}
      />
      <BottleFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}
