import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { tasteTreeApi } from '@/domain/taste-tree/api/tasteTreeApi'
import TasteTreePlayer from '@/domain/taste-tree/components/TasteTreePlayer'
import type { TasteTreeAnswer } from '@/domain/taste-tree/types/tasteTree.types'
import { useAuthStore } from '@/domain/auth/store/authStore'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

const LEVEL_ORDER = ['BEGINNER', 'NOVICE', 'INTERMEDIATE', 'EXPERT']

export default function TasteTreePage() {
  const { shareKey: routeShareKey } = useParams<{ shareKey?: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const [selectedShareKey, setSelectedShareKey] = useState(routeShareKey ?? '')
  const { toasts, showToast, removeToast } = useToast()

  const officialQuery = useQuery({
    queryKey: ['taste-trees', 'official'],
    queryFn: () => tasteTreeApi.getOfficial().then((response) => response.data.data ?? []),
  })

  const officialTrees = [...(officialQuery.data ?? [])].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.experienceLevel ?? '') - LEVEL_ORDER.indexOf(b.experienceLevel ?? ''),
  )

  useEffect(() => {
    if (!routeShareKey && !selectedShareKey && officialTrees[0]) {
      setSelectedShareKey(officialTrees[0].shareKey)
    }
  }, [officialTrees, routeShareKey, selectedShareKey])

  const activeShareKey = routeShareKey ?? selectedShareKey
  const treeQuery = useQuery({
    queryKey: ['taste-trees', 'share', activeShareKey],
    queryFn: () => tasteTreeApi.getShared(activeShareKey).then((response) => response.data.data!),
    enabled: Boolean(activeShareKey),
  })

  const completeMutation = useMutation({
    mutationFn: (answers: TasteTreeAnswer[]) => tasteTreeApi.complete(activeShareKey, answers),
    onSuccess: (response) => {
      const result = response.data.data
      if (result) navigate(`/taste-trees/result/${result.shareKey}`)
    },
    onError: () => showToast(t('tasteTree.completeFailed'), 'error'),
  })

  const bookmarkMutation = useMutation({
    mutationFn: () => tasteTreeApi.toggleBookmark(activeShareKey),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['taste-trees'] })
      showToast(response.data.data?.bookmarked ? t('tasteTree.saved') : t('tasteTree.unsaved'), 'success')
    },
  })

  const cloneMutation = useMutation({
    mutationFn: () => tasteTreeApi.clone(activeShareKey),
    onSuccess: (response) => {
      const clone = response.data.data
      if (clone) navigate(`/taste-trees/${clone.id}/edit`)
    },
    onError: () => showToast(t('tasteTree.cloneFailed'), 'error'),
  })

  const requireLogin = (action: () => void) => {
    if (isLoggedIn) {
      action()
      return
    }
    navigate('/login', { state: { from: location } })
  }

  const tree = treeQuery.data

  if ((officialQuery.isLoading && !routeShareKey) || treeQuery.isLoading || !activeShareKey) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-neutral-100" />
        <div className="mt-5 h-[560px] animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    )
  }

  if (treeQuery.isError || !tree) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-neutral-950">{t('tasteTree.notFound')}</h1>
        <Link to="/taste-trees" className="mt-5 inline-block rounded-lg bg-primary-800 px-5 py-2.5 text-sm font-bold text-white">
          {t('tasteTree.officialTrees')}
        </Link>
      </div>
    )
  }

  const officialLevel = tree.type === 'OFFICIAL' ? tree.content.experienceLevel : null
  const pageTitle = officialLevel ? t(`tasteTree.officialTitle.${officialLevel}`) : tree.title
  const pageDescription = officialLevel
    ? t(`tasteTree.officialDescription.${officialLevel}`)
    : (tree.description ?? t('tasteTree.subtitle'))

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:py-9">
      <SeoMeta
        title={pageTitle}
        description={pageDescription}
        canonical={buildCanonical(routeShareKey ? `/taste-trees/t/${routeShareKey}` : '/taste-trees')}
      />
      <Toast toasts={toasts} onRemove={removeToast} />

      <header className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 px-5 py-7 text-white shadow-sm sm:px-8 sm:py-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tree.type === 'OFFICIAL' ? 'bg-amber-400 text-amber-950' : 'bg-white/10 text-stone-100'}`}>
              {tree.type === 'OFFICIAL' ? t('tasteTree.officialBadge') : t('tasteTree.userTree')}
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{pageTitle}</h1>
            {tree.ownerNickname && (
              <p className="mt-2 text-xs font-semibold text-stone-300">
                {t('tasteTree.createdBy', { nickname: tree.ownerNickname })}
              </p>
            )}
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-300">{pageDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tree.type === 'USER' && (
              <button
                type="button"
                onClick={() => requireLogin(() => bookmarkMutation.mutate())}
                disabled={bookmarkMutation.isPending}
                className="rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-50"
              >
                {tree.bookmarked ? t('tasteTree.savedTree') : t('tasteTree.saveTree')}
              </button>
            )}
            <button
              type="button"
              onClick={() => requireLogin(() => cloneMutation.mutate())}
              disabled={cloneMutation.isPending}
              className="rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-50"
            >
              {t('tasteTree.makeMine')}
            </button>
            <Link
              to={isLoggedIn ? '/taste-trees/new' : '/login'}
              state={isLoggedIn ? undefined : { from: { pathname: '/taste-trees/new' } }}
              className="hidden rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-black text-amber-950 hover:bg-amber-300 lg:inline-flex"
            >
              {t('tasteTree.createMyTree')}
            </Link>
          </div>
        </div>
      </header>

      {tree.type === 'OFFICIAL' && officialTrees.length > 0 && (
        <nav className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-neutral-200 bg-white p-2 lg:grid-cols-4" aria-label={t('tasteTree.levelTabs')}>
          {officialTrees.map((summary) => {
            const active = summary.shareKey === activeShareKey
            return (
              <button
                key={summary.id}
                type="button"
                onClick={() => {
                  if (routeShareKey) {
                    navigate(`/taste-trees/t/${summary.shareKey}`)
                    return
                  }
                  setSelectedShareKey(summary.shareKey)
                }}
                className={`rounded-xl px-3 py-3 text-left transition-colors ${active ? 'bg-primary-800 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-50'}`}
              >
                <span className="block text-sm font-bold">{t(`tasteTree.level.${summary.experienceLevel}`)}</span>
                <span className={`mt-1 hidden text-xs lg:block ${active ? 'text-stone-300' : 'text-neutral-400'}`}>
                  {t(`tasteTree.levelDesc.${summary.experienceLevel}`)}
                </span>
              </button>
            )
          })}
        </nav>
      )}

      <TasteTreePlayer
        key={tree.versionId}
        content={tree.content}
        completing={completeMutation.isPending}
        onComplete={async (answers) => completeMutation.mutateAsync(answers).then(() => undefined)}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <p className="text-xs text-neutral-500">
          {tree.type === 'OFFICIAL' ? t('tasteTree.officialNotice') : t('tasteTree.userNotice')}
        </p>
        <Link to="/taste-trees/mine" className="text-xs font-bold text-primary-800 hover:underline">
          {t('tasteTree.myTrees')}
        </Link>
      </div>
    </div>
  )
}
