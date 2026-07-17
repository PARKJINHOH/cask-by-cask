import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { tasteTreeApi } from '@/domain/taste-tree/api/tasteTreeApi'
import type { TasteTreeSummary } from '@/domain/taste-tree/types/tasteTree.types'
import SeoMeta from '@/shared/components/SeoMeta'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

function TreeCard({ tree, created, onDelete }: { tree: TasteTreeSummary; created: boolean; onDelete: (id: number) => void }) {
  const { t } = useTranslation()
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-black text-stone-600">
            {created ? (tree.publishedVersion ? t('tasteTree.publishedVersion', { version: tree.publishedVersion }) : t('tasteTree.draft')) : t('tasteTree.savedTree')}
          </span>
          <h2 className="mt-3 truncate text-lg font-black text-neutral-950">{tree.title}</h2>
          {tree.ownerNickname && !created && (
            <p className="mt-1 text-xs text-neutral-400">{t('tasteTree.createdBy', { nickname: tree.ownerNickname })}</p>
          )}
        </div>
        {tree.hasDraft && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">{t('tasteTree.hasDraft')}</span>}
      </div>
      {tree.description && <p className="mt-3 line-clamp-2 text-sm leading-5 text-neutral-500">{tree.description}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        {tree.publishedVersion && (
          <Link to={`/taste-trees/t/${tree.shareKey}`} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50">
            {t('tasteTree.view')}
          </Link>
        )}
        {created && (
          <Link to={`/taste-trees/${tree.id}/edit`} className="rounded-lg bg-primary-800 px-3 py-2 text-xs font-bold text-white hover:bg-primary-900">
            {tree.hasDraft || !tree.publishedVersion ? t('tasteTree.continueEditing') : t('common.edit')}
          </Link>
        )}
        {created && (
          <button onClick={() => onDelete(tree.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
            {t('common.delete')}
          </button>
        )}
      </div>
    </article>
  )
}

export default function MyTasteTreesPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'created' | 'saved'>('created')
  const queryClient = useQueryClient()
  const { toasts, showToast, removeToast } = useToast()
  const query = useQuery({
    queryKey: ['taste-trees', 'mine'],
    queryFn: () => tasteTreeApi.getMine().then((response) => response.data.data!),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => tasteTreeApi.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['taste-trees', 'mine'] })
      showToast(t('tasteTree.deleted'), 'success')
    },
  })

  const remove = (id: number) => {
    if (window.confirm(t('tasteTree.deleteConfirm'))) deleteMutation.mutate(id)
  }
  const trees = query.data?.[tab] ?? []

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SeoMeta title={t('tasteTree.myTrees')} description={t('tasteTree.myTreesDesc')} noindex />
      <Toast toasts={toasts} onRemove={removeToast} />
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">{t('tasteTree.eyebrow')}</p>
          <h1 className="mt-2 text-3xl font-black text-neutral-950">{t('tasteTree.myTrees')}</h1>
          <p className="mt-2 text-sm text-neutral-500">{t('tasteTree.myTreesDesc')}</p>
        </div>
        <Link to="/taste-trees/new" className="hidden rounded-lg bg-primary-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-900 lg:inline-flex">
          {t('tasteTree.createMyTree')}
        </Link>
      </header>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 lg:hidden">
        <p className="text-sm font-bold text-amber-900">{t('tasteTree.pcOnlyTitle')}</p>
        <p className="mt-1 text-xs leading-5 text-amber-800">{t('tasteTree.pcOnlyDesc')}</p>
      </div>

      <div className="mb-5 inline-flex rounded-xl border border-neutral-200 bg-white p-1">
        {(['created', 'saved'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === key ? 'bg-primary-800 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            {key === 'created' ? t('tasteTree.createdTrees') : t('tasteTree.savedTrees')}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2"><div className="h-48 animate-pulse rounded-2xl bg-neutral-100" /><div className="h-48 animate-pulse rounded-2xl bg-neutral-100" /></div>
      ) : trees.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {trees.map((tree) => <TreeCard key={tree.id} tree={tree} created={tab === 'created'} onDelete={remove} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-16 text-center">
          <p className="text-sm font-bold text-neutral-700">{tab === 'created' ? t('tasteTree.noCreatedTrees') : t('tasteTree.noSavedTrees')}</p>
          <Link to="/taste-trees" className="mt-3 inline-block text-sm font-bold text-primary-800 hover:underline">{t('tasteTree.exploreOfficial')}</Link>
        </div>
      )}
    </div>
  )
}
