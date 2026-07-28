import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SpiritCategory, UserBottle } from '@/domain/user-bottle/types/userBottle.types';
import { usePublicBottles } from '@/domain/user-bottle/hooks/useUserBottle';
import { BottleStats } from '@/domain/user-bottle/components/BottleStats';
import { BottleFilterBar } from '@/domain/user-bottle/components/BottleFilterBar';
import { BottleList } from '@/domain/user-bottle/components/BottleList';
import { BottleDetailModal } from '@/domain/user-bottle/components/BottleDetailModal';

export default function UserBottlePublicPage() {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const [category, setCategory] = useState<SpiritCategory | undefined>();
  const [view, setView] = useState<'table' | 'card'>('table');
  const [detailBottle, setDetailBottle] = useState<UserBottle | null>(null);

  const { data, isLoading } = usePublicBottles(Number(userId), category);

  if (isLoading) return <div className="py-8 text-center text-neutral-400">{t('common.loading')}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-neutral-900">
        {t('collection.publicPage.title', { nickname: data?.ownerNickname ?? `#${userId}` })}
      </h1>
      {data?.stats && <BottleStats stats={data.stats} />}
      <BottleFilterBar
        category={category} view={view}
        onCategoryChange={setCategory} onViewChange={setView}
      />
      <BottleList
        bottles={data?.bottles ?? []} view={view} editable={false}
        onDetail={b => setDetailBottle(b)}
      />
      <BottleDetailModal
        bottle={detailBottle}
        open={!!detailBottle}
        editable={false}
        onClose={() => setDetailBottle(null)}
      />
    </div>
  );
}
