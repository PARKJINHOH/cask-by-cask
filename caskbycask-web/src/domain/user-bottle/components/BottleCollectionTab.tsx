import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  BottleSortDir,
  BottleSortKey,
  UserBottle,
  SpiritCategory,
  BottleStatus,
} from '../types/userBottle.types';
import { useMyBottles, useDeleteBottle, useToggleBottleStatus, useToggleBottlePublic } from '../hooks/useUserBottle';
import { getUserBottleDisplayNames } from '../utils/userBottleDisplayName';
import { BottleStats } from './BottleStats';
import { BottleFilterBar } from './BottleFilterBar';
import { BottleList } from './BottleList';
import { BottleFormModal } from './BottleFormModal';
import { BottleDetailModal } from './BottleDetailModal';
import Pagination from '@/shared/components/Pagination';

export function BottleCollectionTab() {
  const { t, i18n } = useTranslation();
  const [category, setCategory] = useState<SpiritCategory | undefined>();
  const [status, setStatus] = useState<BottleStatus | undefined>();
  const [year, setYear] = useState<number | undefined>();
  const [view, setView] = useState<'table' | 'card'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserBottle | undefined>();
  const [detailBottle, setDetailBottle] = useState<UserBottle | null>(null);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<BottleSortKey>('PURCHASE_DATE');
  const [sortDir, setSortDir] = useState<BottleSortDir>('DESC');

  const language = i18n.language === 'en' ? 'en' : 'ko';
  const { data, isLoading } = useMyBottles({
    category,
    status,
    year,
    page,
    size: 10,
    sortKey,
    sortDir,
    lang: language,
  });
  const deleteMut = useDeleteBottle();
  const toggleStatusMut = useToggleBottleStatus();
  const togglePublicMut = useToggleBottlePublic();

  useEffect(() => {
    if (!data) return;
    if (data.totalPages === 0 && page !== 0) setPage(0);
    else if (data.totalPages > 0 && page >= data.totalPages) setPage(data.totalPages - 1);
  }, [data, page]);

  const handleDelete = (b: UserBottle) => {
    const name = getUserBottleDisplayNames(b, language).primaryName;
    if (confirm(t('collection.deleteConfirm', { name }))) {
      deleteMut.mutate(b.id);
      setDetailBottle(null);
    }
  };

  const handleEditFromDetail = (b: UserBottle) => {
    setDetailBottle(null);
    setEditing(b);
    setModalOpen(true);
  };

  const handleReset = () => {
    setCategory(undefined);
    setStatus(undefined);
    setYear(undefined);
    setPage(0);
  };

  const handleSort = (nextKey: BottleSortKey) => {
    setPage(0);
    if (nextKey === sortKey) {
      setSortDir(current => current === 'ASC' ? 'DESC' : 'ASC');
      return;
    }
    setSortKey(nextKey);
    setSortDir('ASC');
  };

  if (isLoading) return <div className="py-8 text-center text-neutral-400">{t('common.loading')}</div>;

  return (
    <div className="space-y-3">
      {data?.stats && <BottleStats stats={data.stats} />}
      <BottleFilterBar
        category={category} status={status}
        year={year}
        availableYears={data?.purchaseYears ?? []}
        view={view}
        onCategoryChange={(value) => { setPage(0); setCategory(value); }}
        onStatusChange={(value) => { setPage(0); setStatus(value); }}
        onYearChange={(value) => { setPage(0); setYear(value); }}
        onReset={handleReset}
        onViewChange={setView}
        onAdd={() => { setEditing(undefined); setModalOpen(true); }}
      />
      <BottleList
        bottles={data?.bottles ?? []} view={view} editable
        sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
        onDetail={b => setDetailBottle(b)}
        onToggleStatus={id => toggleStatusMut.mutate(id)}
        onTogglePublic={id => togglePublicMut.mutate(id)}
      />
      {(data?.totalPages ?? 0) > 1 && (
        <Pagination
          currentPage={page}
          totalPages={data?.totalPages ?? 0}
          onPageChange={setPage}
          className="mt-4"
        />
      )}
      <BottleDetailModal
        bottle={detailBottle}
        open={!!detailBottle}
        editable
        onClose={() => setDetailBottle(null)}
        onEdit={handleEditFromDetail}
        onDelete={handleDelete}
      />
      <BottleFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}
