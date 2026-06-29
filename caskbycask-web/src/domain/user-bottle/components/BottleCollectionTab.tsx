import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserBottle, SpiritCategory, BottleStatus } from '../types/userBottle.types';
import { useMyBottles, useDeleteBottle, useToggleBottleStatus, useToggleBottlePublic } from '../hooks/useUserBottle';
import { BottleStats } from './BottleStats';
import { BottleFilterBar } from './BottleFilterBar';
import { BottleList } from './BottleList';
import { BottleFormModal } from './BottleFormModal';
import { BottleDetailModal } from './BottleDetailModal';
import Pagination from '@/shared/components/Pagination';

export function BottleCollectionTab() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<SpiritCategory | undefined>();
  const [status, setStatus] = useState<BottleStatus | undefined>();
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();
  const [view, setView] = useState<'table' | 'card'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserBottle | undefined>();
  const [detailBottle, setDetailBottle] = useState<UserBottle | null>(null);
  const [page, setPage] = useState(0);

  const { data, isLoading } = useMyBottles({ category, status });
  const deleteMut = useDeleteBottle();
  const toggleStatusMut = useToggleBottleStatus();
  const togglePublicMut = useToggleBottlePublic();

  // 필터 조건 변경 시 페이지 초기화
  useEffect(() => {
    setPage(0);
  }, [category, status, startDate, endDate]);

  // 클라이언트 사이드 날짜 범위 필터링
  const filteredBottles = useMemo(() => {
    const bottles = data?.bottles ?? [];
    if (!startDate && !endDate) return bottles;
    return bottles.filter(b => {
      if (!b.purchaseDate) return false;
      if (startDate && b.purchaseDate < startDate) return false;
      if (endDate && b.purchaseDate > endDate) return false;
      return true;
    });
  }, [data?.bottles, startDate, endDate]);

  // 동적 통계 계산
  const computedStats = useMemo(() => {
    const totalCount = filteredBottles.length;
    const totalPrice = filteredBottles.reduce((sum, b) => sum + (b.price ?? 0), 0);
    const openedCount = filteredBottles.filter(b => b.status === 'OPENED').length;
    const unopenedCount = totalCount - openedCount;

    const categories: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER'];
    const categoryStats = categories
      .map(cat => ({
        category: cat,
        count: filteredBottles.filter(b => b.category === cat).length,
      }))
      .filter(stat => stat.count > 0);

    return {
      totalCount,
      totalPrice,
      openedCount,
      unopenedCount,
      categoryStats,
    };
  }, [filteredBottles]);

  // 페이징된 보틀 목록
  const paginatedBottles = useMemo(() => {
    return filteredBottles.slice(page * 10, (page + 1) * 10);
  }, [filteredBottles, page]);

  const totalPages = Math.ceil(filteredBottles.length / 10);

  const handleDelete = (b: UserBottle) => {
    const name = b.spiritNameKo || b.spiritNameText || '';
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
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (isLoading) return <div className="py-8 text-center text-neutral-400">{t('common.loading')}</div>;

  return (
    <div className="space-y-3">
      <BottleStats stats={computedStats} />
      <BottleFilterBar
        category={category} status={status}
        startDate={startDate} endDate={endDate}
        view={view}
        onCategoryChange={setCategory} onStatusChange={setStatus}
        onStartDateChange={setStartDate} onEndDateChange={setEndDate}
        onReset={handleReset}
        onViewChange={setView}
        onAdd={() => { setEditing(undefined); setModalOpen(true); }}
      />
      <BottleList
        bottles={paginatedBottles} view={view} editable
        onDetail={b => setDetailBottle(b)}
        onDelete={handleDelete}
        onToggleStatus={id => toggleStatusMut.mutate(id)}
        onTogglePublic={id => togglePublicMut.mutate(id)}
      />
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
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
