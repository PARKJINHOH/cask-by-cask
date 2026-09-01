import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useByobList } from '@/domain/byob/hooks/useByob'
import ByobCard from '@/domain/byob/components/ByobCard'
import Pagination from '@/shared/components/Pagination'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { ByobStatus } from '@/domain/byob/types/byob.types'
import { isBoardListNoindex, listPageHrefWithParams, metadataSearchParamsFromUrl } from '@/shared/utils/seoIndexing'
import { buildBreadcrumbSchema, buildItemListSchema } from '@/shared/utils/seoSchema'

const PAGE_SIZE = 12

type StatusFilter = 'ALL' | ByobStatus

const FILTER_OPTIONS: StatusFilter[] = ['ALL', 'OPEN', 'CLOSED', 'CANCELLED']

// 자유게시판 말머리 필터와 동일 구조: 버튼 자체에 테두리(테두리가 제일 바깥)
const STATUS_LABEL_KEY: Record<ByobStatus, string> = {
  OPEN:      'byob.statusOpen',
  CLOSED:    'byob.statusClosed',
  CANCELLED: 'byob.statusCancelled',
}
const STATUS_FILTER_STYLE: Record<ByobStatus, { on: string; off: string }> = {
  OPEN:      { on: 'border-green-400 bg-green-50 text-green-700',     off: 'border-green-400 text-green-700 bg-white hover:bg-green-50' },
  CLOSED:    { on: 'border-yellow-400 bg-yellow-50 text-yellow-700',  off: 'border-yellow-400 text-yellow-700 bg-white hover:bg-yellow-50' },
  CANCELLED: { on: 'border-neutral-400 bg-neutral-100 text-neutral-600', off: 'border-neutral-300 text-neutral-500 bg-white hover:bg-neutral-50' },
}
const ALL_FILTER_STYLE = {
  on:  'border-primary-500 bg-primary-50 text-primary-900',
  off: 'border-neutral-200 text-neutral-600 bg-white hover:border-neutral-300',
}

export default function ByobListPage() {
  const { t, i18n } = useTranslation()
  const { isLoggedIn } = useAuthStore()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = ((searchParams.get('status') ?? 'ALL') as StatusFilter)
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const detailState = { returnTo: `${location.pathname}${location.search}` }
  const setListParam = (nextStatus: StatusFilter, nextPage = 0) =>
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        if (nextStatus === 'ALL') n.delete('status')
        else n.set('status', nextStatus)
        n.set('page', String(nextPage))
        return n
      },
      { replace: true },
    )

  const { data, isLoading } = useByobList({
    status: status === 'ALL' ? undefined : status,
    page,
    size: PAGE_SIZE,
  })

  const items = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const seoTitle = t('byob.title')
  const seoDescription = t('byob.subtitle')
  const seoCanonical = buildCanonical('/ko/community/byob')
  const seoNoindex = isBoardListNoindex('byob', metadataSearchParamsFromUrl(searchParams))
  const seoJsonLd = [
    buildBreadcrumbSchema([
      { name: t('menu.home', '홈'), path: '/ko' },
      { name: seoTitle, path: '/ko/community/byob' },
    ]),
    {
      '@type': 'CollectionPage' as const,
      name: seoTitle,
      description: seoDescription,
      url: seoCanonical,
    },
    ...(items.length > 0 ? [buildItemListSchema(
      items
        .filter((item) => item.status !== 'CANCELLED')
        .map((item) => ({ name: item.title, path: `/ko/community/byob/${item.id}` })),
    )] : []),
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoMeta
        title={seoTitle}
        description={seoDescription}
        canonical={seoCanonical}
        locale={i18n.language === 'en' ? 'en_US' : 'ko_KR'}
        noindex={seoNoindex}
        deferJsonLd={data == null && !seoNoindex}
        jsonLd={i18n.language === 'en' ? undefined : seoJsonLd}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('byob.title')}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t('byob.subtitle')}</p>
        </div>
        {isLoggedIn && (
          <div className="flex items-center gap-2">
            {/* 내가 주최·참여한 모임은 마이페이지가 아니라 이 메뉴 안에서 본다 */}
            <Link
              to="/community/byob/mine"
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg
                border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              {t('byob.myGatherings')}
            </Link>
            <Link
              to="/community/byob/write"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg
                bg-primary-800 text-white hover:bg-primary-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('byob.write')}
            </Link>
          </div>
        )}
      </div>

      {/* 상태 필터 — 자유게시판 말머리 필터와 동일하게 버튼 테두리가 제일 바깥 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_OPTIONS.map((opt) => {
          const active = status === opt
          const style = opt === 'ALL'
            ? (active ? ALL_FILTER_STYLE.on : ALL_FILTER_STYLE.off)
            : (active ? STATUS_FILTER_STYLE[opt].on : STATUS_FILTER_STYLE[opt].off)
          return (
            <button
              key={opt}
              onClick={() => setListParam(opt, 0)}
              className={['px-3 py-1.5 text-xs font-medium rounded-full border transition-colors', style].join(' ')}
            >
              {opt === 'ALL' ? t('byob.statusAll') : t(STATUS_LABEL_KEY[opt])}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-neutral-400 text-sm">{t('common.loading')}</div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-neutral-400 text-sm">{t('byob.noPost')}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((byob) => (
              <ByobCard key={byob.id} byob={byob} state={detailState} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => setListParam(status, p)}
                buildHref={(p) => listPageHrefWithParams('/ko/community/byob', searchParams, p)}
                scrollTarget="page"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
