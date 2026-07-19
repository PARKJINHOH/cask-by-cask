import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { tasteTreeApi } from '@/domain/taste-tree/api/tasteTreeApi'
import TasteTreePlayer from '@/domain/taste-tree/components/TasteTreePlayer'
import type { TasteTreeEngagement, TasteTreeSort, TasteTreeType, TasteTreeView } from '@/domain/taste-tree/types/tasteTree.types'
import { useAuthStore } from '@/domain/auth/store/authStore'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

export default function TasteTreePage() {
  const { shareKey } = useParams<{ shareKey?: string }>()
  return shareKey ? <TasteTreeDetail shareKey={shareKey} /> : <TasteTreeDirectory />
}

function TasteTreeDirectory() {
  const { t } = useTranslation()
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const [type, setType] = useState<TasteTreeType>('OFFICIAL')
  const [sort, setSort] = useState<TasteTreeSort>('LATEST')
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const query = useQuery({
    queryKey: ['taste-trees', 'public', type, sort, keyword, page],
    queryFn: () => tasteTreeApi.search({ type, sort, keyword, page, size: 12 }).then((response) => response.data.data!),
  })

  const changeType = (next: TasteTreeType) => { setType(next); setPage(0) }
  const changeSort = (next: TasteTreeSort) => { setSort(next); setPage(0) }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 lg:py-10">
      <SeoMeta title={t('tasteTree.title')} description={t('tasteTree.subtitle')} canonical={buildCanonical('/taste-trees')} />
      <header className="overflow-hidden rounded-2xl bg-stone-950 px-6 py-9 text-white shadow-xl sm:px-10 lg:flex lg:items-end lg:justify-between lg:px-12 lg:py-12">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400">{t('tasteTree.eyebrow')}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t('tasteTree.title')}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">{t('tasteTree.subtitle')}</p>
        </div>
        <div className="mt-7 flex flex-wrap gap-2 lg:mt-0">
          <Link to={isLoggedIn ? '/taste-trees/mine' : '/login'} className="rounded-xl border border-white/25 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10">{t('tasteTree.myTrees')}</Link>
          <Link to={isLoggedIn ? '/taste-trees/new' : '/login'} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-stone-950 hover:bg-amber-300">{t('tasteTree.createMyTree')}</Link>
        </div>
      </header>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid grid-cols-2 gap-2">
            {(['OFFICIAL', 'USER'] as const).map((value) => (
              <button key={value} type="button" onClick={() => changeType(value)} className={`rounded-xl px-5 py-3 text-sm font-black transition ${type === value ? 'bg-stone-950 text-white shadow-sm' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'}`}>
                {value === 'OFFICIAL' ? t('tasteTree.officialTrees') : t('tasteTree.communityTrees')}
              </button>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); setKeyword(keywordInput.trim()); setPage(0) }} className="flex min-w-0 flex-1 gap-2 xl:max-w-xl">
            <input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder={t('tasteTree.searchPlaceholder')} className="min-w-0 flex-1 rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            <button className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-stone-950 hover:bg-amber-400">{t('tasteTree.search')}</button>
          </form>
          <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
            {(['LATEST', 'LIKES', 'VIEWS'] as const).map((value) => (
              <button key={value} type="button" onClick={() => changeSort(value)} className={`whitespace-nowrap rounded-xl border px-4 py-2.5 text-xs font-black ${sort === value ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
                {t(`tasteTree.sort.${value}`)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {query.isLoading ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="h-72 animate-pulse rounded-2xl bg-stone-100" />)}</div>
      ) : query.data?.content.length ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {query.data.content.map((tree, index) => (
            <Link key={tree.id} to={`/taste-trees/t/${tree.shareKey}`} className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl">
              <div className="relative flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-[10px] font-black ${tree.type === 'OFFICIAL' ? 'bg-stone-950 text-white' : 'bg-amber-100 text-amber-900'}`}>{tree.type === 'OFFICIAL' ? t('tasteTree.officialBadge') : t('tasteTree.userTree')}</span>
                <span className="text-xs font-black text-stone-300">#{String(index + 1 + page * 12).padStart(2, '0')}</span>
              </div>
              <h2 className="relative mt-8 line-clamp-2 text-2xl font-black leading-tight text-stone-950 group-hover:text-amber-900">{tree.title}</h2>
              {tree.ownerNickname && <p className="relative mt-2 text-xs font-bold text-stone-400">{t('tasteTree.createdBy', { nickname: tree.ownerNickname })}</p>}
              <p className="relative mt-4 min-h-12 line-clamp-2 text-sm leading-6 text-stone-500">{tree.description || t('tasteTree.userNotice')}</p>
              <div className="relative mt-7 flex items-center gap-4 border-t border-stone-100 pt-4 text-xs font-bold text-stone-500">
                <span className="text-rose-700">{t('tasteTree.like')} {tree.likeCount.toLocaleString()}</span>
                <span>{t('tasteTree.views', { count: tree.viewCount.toLocaleString() })}</span>
                <span className="ml-auto text-amber-800">{t('tasteTree.start')}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white py-20 text-center text-sm font-bold text-stone-500">{t('tasteTree.noPublicTrees')}</div>
      )}

      {query.data && query.data.totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3">
          <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold disabled:opacity-35">{t('tasteTree.previousPage')}</button>
          <span className="text-sm font-black text-stone-700">{page + 1} / {query.data.totalPages}</span>
          <button type="button" disabled={query.data.last} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-bold disabled:opacity-35">{t('tasteTree.nextPage')}</button>
        </nav>
      )}
    </div>
  )
}

function TasteTreeDetail({ shareKey }: { shareKey: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const { toasts, showToast, removeToast } = useToast()
  const queryKey = ['taste-trees', 'share', shareKey]
  const treeQuery = useQuery({ queryKey, queryFn: () => tasteTreeApi.getShared(shareKey).then((response) => response.data.data!) })

  const updateEngagement = (engagement: TasteTreeEngagement) => {
    queryClient.setQueryData<TasteTreeView>(queryKey, (previous) => previous ? {
      ...previous, likedByMe: engagement.liked, likeCount: engagement.likeCount, viewCount: engagement.viewCount,
    } : previous)
  }

  const viewMutation = useMutation({ mutationFn: () => tasteTreeApi.recordView(shareKey), onSuccess: (response) => response.data.data && updateEngagement(response.data.data) })
  useEffect(() => {
    if (treeQuery.data) viewMutation.mutate()
  }, [shareKey, treeQuery.data?.versionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const likeMutation = useMutation({
    mutationFn: (liked: boolean) => liked ? tasteTreeApi.unlike(shareKey) : tasteTreeApi.like(shareKey),
    onSuccess: async (response) => {
      if (response.data.data) updateEngagement(response.data.data)
      await queryClient.invalidateQueries({ queryKey: ['taste-trees', 'public'] })
    },
    onError: () => showToast(t('tasteTree.likeFailed'), 'error'),
  })
  const bookmarkMutation = useMutation({
    mutationFn: () => tasteTreeApi.toggleBookmark(shareKey),
    onSuccess: async () => { await treeQuery.refetch(); await queryClient.invalidateQueries({ queryKey: ['taste-trees', 'mine'] }) },
  })

  const tree = treeQuery.data
  if (treeQuery.isLoading) return <div className="mx-auto max-w-7xl px-4 py-10"><div className="h-[700px] animate-pulse rounded-2xl bg-stone-100" /></div>
  if (!tree) return <div className="mx-auto max-w-4xl px-4 py-20 text-center"><h1 className="text-2xl font-black">{t('tasteTree.notFound')}</h1><Link to="/taste-trees" className="mt-5 inline-block text-amber-800">{t('tasteTree.officialTrees')}</Link></div>

  const requireLogin = (action: () => void) => {
    if (isLoggedIn) action()
    else navigate('/login', { state: { from: location } })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 lg:py-10">
      <SeoMeta title={tree.title} description={tree.description ?? t('tasteTree.subtitle')} canonical={buildCanonical(`/taste-trees/t/${shareKey}`)} />
      <Toast toasts={toasts} onRemove={removeToast} />
      <header className="mb-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8 lg:flex lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/taste-trees" className="text-xs font-black text-stone-400 hover:text-amber-800">{t('tasteTree.allTrees')}</Link>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black ${tree.type === 'OFFICIAL' ? 'bg-stone-950 text-white' : 'bg-amber-100 text-amber-900'}`}>{tree.type === 'OFFICIAL' ? t('tasteTree.officialBadge') : t('tasteTree.userTree')}</span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-950 sm:text-5xl">{tree.title}</h1>
          {tree.ownerNickname && <p className="mt-2 text-xs font-bold text-stone-400">{t('tasteTree.createdBy', { nickname: tree.ownerNickname })}</p>}
          {tree.description && <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-500">{tree.description}</p>}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 lg:mt-0">
          <span className="rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-600">{t('tasteTree.views', { count: tree.viewCount.toLocaleString() })}</span>
          <button type="button" onClick={() => requireLogin(() => tree.canLike && likeMutation.mutate(tree.likedByMe))} disabled={likeMutation.isPending || (isLoggedIn && !tree.canLike)} title={!tree.canLike && isLoggedIn ? t('tasteTree.selfLikeDisabled') : undefined}
            className={`rounded-xl border px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${tree.likedByMe ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-stone-300 text-stone-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'}`}>
            {tree.likedByMe ? t('tasteTree.liked') : t('tasteTree.like')} {tree.likeCount.toLocaleString()}
          </button>
          <button type="button" onClick={() => requireLogin(() => bookmarkMutation.mutate())} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50">{tree.bookmarked ? t('tasteTree.savedTree') : t('tasteTree.saveTree')}</button>
        </div>
      </header>
      <TasteTreePlayer key={tree.versionId} content={tree.content} treeTitle={tree.title} creatorName={tree.ownerNickname ?? (tree.type === 'OFFICIAL' ? 'CaskByCask' : null)} />
    </div>
  )
}
