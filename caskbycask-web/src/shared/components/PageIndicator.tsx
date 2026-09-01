import type { TFunction } from 'i18next'
import { matchPath, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Breadcrumb, { type Crumb } from './Breadcrumb'
import { requestLeave } from '@/shared/hooks/useUnsavedChangesGuard'

interface IndicatorConfig {
  items: Crumb[]
  backTo?: string
}

const MY_REVIEWS_PATH = '/mypage?tab=reviews'

function exact(path: string, pathname: string) {
  return matchPath({ path, end: true }, pathname)
}

function safeReturnTo(state: unknown, fallback: string, allowed: RegExp) {
  const returnTo = typeof state === 'object' && state !== null && 'returnTo' in state
    ? (state as { returnTo?: unknown }).returnTo
    : undefined

  return typeof returnTo === 'string' && allowed.test(returnTo) ? returnTo : fallback
}

function homeCrumb(t: TFunction, current = false): Crumb {
  return { label: t('nav.home'), to: current ? undefined : '/' }
}

function sectionCrumbs(t: TFunction, label: string, to: string, current?: string): Crumb[] {
  return [
    homeCrumb(t),
    { label, to: current ? to : undefined },
    ...(current ? [{ label: current }] : []),
  ]
}

function boardLabel(t: TFunction, boardType?: string) {
  if (boardType === 'notice') return t('menu.communityNews')
  if (boardType === 'free') return t('menu.communityBoard')
  if (boardType === 'photo') return t('photoGallery.title')
  return t('menu.communityAll')
}

function getIndicatorConfig(pathname: string, state: unknown, t: TFunction): IndicatorConfig {
  if (pathname === '/') return { items: [homeCrumb(t, true)] }

  let match = exact('/spirits/:id/review/:reviewId/edit', pathname)
  if (match) {
    const detailTo = `/spirits/${match.params.id}`
    return {
      items: [homeCrumb(t), { label: t('nav.spirits'), to: '/spirits' }, { label: t('pageIndicator.reviewEdit') }],
      backTo: detailTo,
    }
  }

  match = exact('/spirits/:id/review/write', pathname)
  if (match) {
    const detailTo = `/spirits/${match.params.id}`
    return {
      items: [homeCrumb(t), { label: t('nav.spirits'), to: '/spirits' }, { label: t('pageIndicator.reviewWrite') }],
      backTo: detailTo,
    }
  }

  match = exact('/spirits/:id/:slug?', pathname)
  if (match) {
    return {
      items: sectionCrumbs(t, t('nav.spirits'), '/spirits', t('pageIndicator.detail')),
      backTo: safeReturnTo(state, '/spirits', /^\/spirits(?:\?|$)/),
    }
  }
  if (exact('/spirits', pathname)) return { items: sectionCrumbs(t, t('nav.spirits'), '/spirits') }

  if (exact('/notices/:id', pathname)) {
    return {
      items: sectionCrumbs(t, t('menu.notice'), '/notices', t('pageIndicator.detail')),
      backTo: '/notices',
    }
  }
  if (exact('/notices', pathname)) return { items: sectionCrumbs(t, t('menu.notice'), '/notices') }

  if (exact('/ranking', pathname)) return { items: sectionCrumbs(t, t('pageIndicator.ranking'), '/ranking') }
  if (exact('/calendar', pathname)) return { items: sectionCrumbs(t, t('menu.calendar'), '/calendar') }
  if (exact('/faq', pathname)) return { items: sectionCrumbs(t, t('menu.faq'), '/faq') }
  if (exact('/about', pathname)) return { items: sectionCrumbs(t, t('footer.about'), '/about') }
  if (exact('/inquiry', pathname)) return { items: sectionCrumbs(t, t('pageIndicator.inquiry'), '/inquiry') }

  if (exact('/login', pathname)) {
    return { items: sectionCrumbs(t, t('nav.login'), '/login'), backTo: '/' }
  }
  if (exact('/signup', pathname)) {
    return { items: sectionCrumbs(t, t('nav.signup'), '/signup'), backTo: '/' }
  }
  if (exact('/account-recovery', pathname)) {
    return {
      items: [homeCrumb(t), { label: t('nav.login'), to: '/login' }, { label: t('pageIndicator.accountRecovery') }],
      backTo: '/login',
    }
  }
  if (exact('/oauth/callback', pathname) || exact('/oauth/signup', pathname)) {
    return { items: sectionCrumbs(t, t('pageIndicator.account'), '/login'), backTo: '/' }
  }

  const legalRoutes: Record<string, string> = {
    '/terms': 'pageIndicator.terms',
    '/privacy': 'pageIndicator.privacy',
    '/operation-policy': 'pageIndicator.operationPolicy',
  }
  if (legalRoutes[pathname]) {
    return {
      items: sectionCrumbs(t, t(legalRoutes[pathname]), pathname),
      backTo: pathname === '/terms' || pathname === '/privacy' ? '/signup' : '/',
    }
  }

  match = exact('/community/byob/:id/edit', pathname)
  if (match) {
    const detailTo = `/community/byob/${match.params.id}`
    return {
      items: [homeCrumb(t), { label: t('menu.community'), to: '/community/all' }, { label: t('menu.communityByob'), to: '/community/byob' }, { label: t('pageIndicator.edit') }],
      backTo: detailTo,
    }
  }
  if (exact('/community/byob/write', pathname)) {
    return {
      items: [homeCrumb(t), { label: t('menu.community'), to: '/community/all' }, { label: t('menu.communityByob'), to: '/community/byob' }, { label: t('pageIndicator.write') }],
      backTo: '/community/byob',
    }
  }
  if (exact('/community/byob/:id', pathname)) {
    return {
      items: [homeCrumb(t), { label: t('menu.community'), to: '/community/all' }, { label: t('menu.communityByob'), to: '/community/byob' }, { label: t('pageIndicator.detail') }],
      backTo: '/community/byob',
    }
  }
  if (exact('/community/byob', pathname)) {
    return { items: [homeCrumb(t), { label: t('menu.community'), to: '/community/all' }, { label: t('menu.communityByob') }] }
  }

  match = exact('/community/:boardType/:id/edit', pathname)
  if (match) {
    const boardTo = `/community/${match.params.boardType}`
    return {
      items: [homeCrumb(t), { label: t('menu.community'), to: '/community/all' }, { label: boardLabel(t, match.params.boardType), to: boardTo }, { label: t('pageIndicator.edit') }],
      backTo: `/community/${match.params.boardType}/${match.params.id}`,
    }
  }
  match = exact('/community/:boardType/write', pathname)
  if (match) {
    const boardTo = `/community/${match.params.boardType}`
    return {
      items: [homeCrumb(t), { label: t('menu.community'), to: '/community/all' }, { label: boardLabel(t, match.params.boardType), to: boardTo }, { label: t('pageIndicator.write') }],
      backTo: boardTo,
    }
  }
  match = exact('/community/:boardType/:id', pathname)
  if (match) {
    const boardTo = `/community/${match.params.boardType}`
    return {
      items: [homeCrumb(t), { label: t('menu.community'), to: '/community/all' }, { label: boardLabel(t, match.params.boardType), to: boardTo }, { label: t('pageIndicator.detail') }],
      backTo: boardTo,
    }
  }
  match = exact('/community/:boardType', pathname)
  if (match) {
    return {
      items: [homeCrumb(t), { label: t('menu.community'), to: '/community/all' }, { label: boardLabel(t, match.params.boardType) }],
    }
  }

  if (exact('/tier-lists/:shareKey', pathname)) {
    return {
      items: sectionCrumbs(t, t('menu.tierList'), '/tier-lists', t('pageIndicator.sharedView')),
      backTo: '/tier-lists',
    }
  }
  if (exact('/tier-lists', pathname)) return { items: sectionCrumbs(t, t('menu.tierList'), '/tier-lists') }

  match = exact('/taste-trees/:id/edit', pathname)
  if (match) {
    return {
      items: sectionCrumbs(t, t('menu.tasteTree'), '/taste-trees', t('pageIndicator.edit')),
      backTo: '/taste-trees/mine',
    }
  }
  if (exact('/taste-trees/new', pathname)) {
    return {
      items: sectionCrumbs(t, t('menu.tasteTree'), '/taste-trees', t('pageIndicator.write')),
      backTo: '/taste-trees',
    }
  }
  if (exact('/taste-trees/mine', pathname)) {
    return {
      items: sectionCrumbs(t, t('menu.tasteTree'), '/taste-trees', t('pageIndicator.myContent')),
      backTo: '/taste-trees',
    }
  }
  if (exact('/taste-trees/t/:shareKey', pathname)) {
    return {
      items: sectionCrumbs(t, t('menu.tasteTree'), '/taste-trees', t('pageIndicator.detail')),
      backTo: '/taste-trees',
    }
  }
  if (exact('/taste-trees', pathname)) return { items: sectionCrumbs(t, t('menu.tasteTree'), '/taste-trees') }

  if (exact('/notifications', pathname)) {
    return { items: sectionCrumbs(t, t('pageIndicator.notifications'), '/notifications'), backTo: '/' }
  }
  if (exact('/users/:userId/bottles', pathname)) {
    return { items: sectionCrumbs(t, t('pageIndicator.userBottles'), pathname), backTo: '/' }
  }
  if (exact('/users/:userId/reviews', pathname)) {
    return { items: sectionCrumbs(t, t('pageIndicator.userReviews'), pathname), backTo: '/' }
  }

  if (exact('/producers/:id', pathname)) {
    return {
      items: sectionCrumbs(t, t('pageIndicator.producer'), pathname, t('pageIndicator.detail')),
      backTo: '/spirits',
    }
  }

  match = exact('/price-tracker/spirits/:id', pathname)
  if (match) {
    return {
      items: sectionCrumbs(t, t('pageIndicator.priceTracker'), '/price-tracker', t('pageIndicator.detail')),
      backTo: '/price-tracker',
    }
  }
  if (exact('/price-tracker/register', pathname)) {
    return {
      items: sectionCrumbs(t, t('pageIndicator.priceTracker'), '/price-tracker', t('pageIndicator.priceRegister')),
      backTo: '/price-tracker',
    }
  }
  if (exact('/price-tracker', pathname)) {
    return { items: sectionCrumbs(t, t('pageIndicator.priceTracker'), '/price-tracker') }
  }

  // 마이페이지 "내 리뷰" 에서 진입하는 리뷰 수정 페이지 (승인 리뷰 / 하위 에디션 요청)
  if (exact('/review/request/:requestId', pathname) || exact('/review/:reviewId', pathname)) {
    return {
      items: [
        homeCrumb(t),
        { label: t('nav.mypage'), to: MY_REVIEWS_PATH },
        { label: t('pageIndicator.reviewEdit') },
      ],
      backTo: MY_REVIEWS_PATH,
    }
  }

  if (exact('/mypage', pathname)) return { items: sectionCrumbs(t, t('nav.mypage'), '/mypage'), backTo: '/' }

  if (exact('/request/spirit/my', pathname)) {
    return {
      items: [homeCrumb(t), { label: t('menu.request'), to: '/request/spirit' }, { label: t('menu.requestSpirit'), to: '/request/spirit' }, { label: t('pageIndicator.myRequests') }],
      backTo: '/request/spirit',
    }
  }
  if (exact('/request/spirit', pathname)) {
    return { items: [homeCrumb(t), { label: t('menu.request'), to: '/request/spirit' }, { label: t('menu.requestSpirit') }] }
  }
  if (exact('/request/producer', pathname)) {
    return { items: [homeCrumb(t), { label: t('menu.request'), to: '/request/spirit' }, { label: t('menu.requestProducer') }] }
  }
  if (exact('/request/feedback/new', pathname)) {
    return {
      items: [homeCrumb(t), { label: t('menu.request'), to: '/request/feedback' }, { label: t('menu.requestFeedback'), to: '/request/feedback' }, { label: t('pageIndicator.write') }],
      backTo: '/request/feedback',
    }
  }
  match = exact('/request/feedback/:id/edit', pathname)
  if (match) {
    return {
      items: [homeCrumb(t), { label: t('menu.request'), to: '/request/feedback' }, { label: t('menu.requestFeedback'), to: '/request/feedback' }, { label: t('pageIndicator.edit') }],
      backTo: `/request/feedback/${match.params.id}`,
    }
  }
  if (exact('/request/feedback/:id', pathname)) {
    return {
      items: [homeCrumb(t), { label: t('menu.request'), to: '/request/feedback' }, { label: t('menu.requestFeedback'), to: '/request/feedback' }, { label: t('pageIndicator.detail') }],
      backTo: safeReturnTo(state, '/request/feedback', /^\/request\/feedback(?:\?|$)/),
    }
  }
  if (exact('/request/feedback', pathname)) {
    return { items: [homeCrumb(t), { label: t('menu.request'), to: '/request/feedback' }, { label: t('menu.requestFeedback') }] }
  }

  return { items: [homeCrumb(t), { label: t('common.notFound') }], backTo: '/' }
}

export default function PageIndicator() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  if (location.pathname === '/') return null

  const config = getIndicatorConfig(location.pathname, location.state, t)

  return (
    <div className="border-b border-neutral-200 bg-white" data-page-indicator>
      <div className="user-layout-container flex min-h-11 items-center gap-2 px-4 py-1.5 sm:gap-3">
        {config.backTo && (
          <button
            type="button"
            // 글쓰기·수정 화면에도 backTo 가 있어, 그냥 이동시키면 작성 내용이 확인 없이 사라진다.
            // 작성 중인 화면이 없으면 requestLeave 가 그대로 통과시킨다.
            onClick={() => requestLeave(() => navigate(config.backTo!))}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={t('common.back')}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
            </svg>
            <span>{t('common.back')}</span>
          </button>
        )}
        {config.backTo && <span className="h-4 w-px shrink-0 bg-neutral-200" aria-hidden="true" />}
        <Breadcrumb items={config.items} className="min-w-0 overflow-hidden" />
      </div>
    </div>
  )
}
