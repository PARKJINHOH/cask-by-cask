import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SpiritCategory } from '@/domain/user-bottle/types/userBottle.types';
import { usePublicBottles } from '@/domain/user-bottle/hooks/useUserBottle';
import { BottleStats } from '@/domain/user-bottle/components/BottleStats';
import { BottleFilterBar } from '@/domain/user-bottle/components/BottleFilterBar';
import { BottleList } from '@/domain/user-bottle/components/BottleList';

export default function UserBottlePublicPage() {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const [category, setCategory] = useState<SpiritCategory | undefined>();
  const [view, setView] = useState<'table' | 'card'>('table');

  const { data, isLoading } = usePublicBottles(Number(userId), category);

  if (isLoading) return <div className="py-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">
        {t('collection.publicPage.title', { nickname: `#${userId}` })}
      </h1>
      {data?.stats && <BottleStats stats={data.stats} />}
      <BottleFilterBar
        category={category} status={undefined} view={view}
        onCategoryChange={setCategory} onStatusChange={() => {}} onViewChange={setView}
      />
      <BottleList bottles={data?.bottles ?? []} view={view} editable={false} />
    </div>
  );
}
