import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useMe } from '@/domain/user/hooks/useUser'
import MyReviewList from '@/domain/review/components/MyReviewList'
import MyFavorites from '@/domain/wishlist/components/MyFavorites'
import AccountSettings from '@/domain/user/components/AccountSettings'
import MaturingPowerSection from '@/domain/score/components/MaturingPowerSection'
import MessagesTab from '@/domain/message/components/MessagesTab'
import BlockedUsersTab from '@/domain/user/components/BlockedUsersTab'
import ByobHistoryTab from '@/domain/byob/components/ByobHistoryTab'
import { BottleCollectionTab } from '@/domain/user-bottle/components/BottleCollectionTab'
import MyPriceReportsTab from '@/domain/pricetracker/components/MyPriceReportsTab'
import MyPriceAlertsTab from '@/domain/pricetracker/components/MyPriceAlertsTab'
import LevelBadge from '@/shared/components/LevelBadge'
import DefaultAvatar from '@/shared/components/DefaultAvatar'
import SeoMeta from '@/shared/components/SeoMeta'
import { useMessageList } from '@/domain/message/hooks/useMessages'
import SocialHistoryTab from '@/domain/social/components/SocialHistoryTab'

type Tab = 'maturing' | 'reviews' | 'social' | 'wishlist' | 'tasteTrees' | 'byob' | 'collection' | 'priceReports' | 'priceAlerts' | 'messages' | 'blocks' | 'settings'

const ALL_TABS: { value: Tab; labelKey: string; adminHidden?: boolean }[] = [
  { value: 'maturing',     labelKey: 'mypage.maturingTab',    adminHidden: true },
  { value: 'reviews',      labelKey: 'mypage.reviewsTab' },
  { value: 'social',       labelKey: 'social.mypageTab' },
  { value: 'wishlist',     labelKey: 'mypage.wishlistTab' },
  { value: 'tasteTrees',   labelKey: 'mypage.tasteTreesTab' },
  { value: 'byob',         labelKey: 'mypage.byobTab' },
  { value: 'collection',   labelKey: 'mypage.collectionTab' },
  { value: 'priceReports', labelKey: 'mypage.priceReportsTab' },
  { value: 'priceAlerts',  labelKey: 'mypage.priceAlertsTab' },
  { value: 'messages',     labelKey: 'mypage.messagesTab' },
  { value: 'blocks',       labelKey: 'mypage.blocksTab' },
  { value: 'settings',     labelKey: 'mypage.settingsTab' },
]

const ROLE_LABEL: Record<string, string> = {
  MEMBER: '회원',
  ADMIN: '관리자',
  DISTILLERY: '증류소',
}

export default function MyPage() {
  const { t, i18n } = useTranslation()
  const authUser = useAuthStore((s) => s.user)
  const { data: profile } = useMe()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const role = profile?.role ?? authUser?.role ?? ''
  const isAdmin = role === 'ADMIN'

  const tabs = ALL_TABS.filter((t) => !(isAdmin && t.adminHidden))

  const tabParam = searchParams.get('tab') as Tab | null
  const messageIdParam = searchParams.get('messageId') ? Number(searchParams.get('messageId')) : undefined

  const [tab, setTab] = useState<Tab>(() => {
    if (tabParam && tabs.some((t) => t.value === tabParam)) return tabParam
    return isAdmin ? 'reviews' : 'maturing'
  })

  useEffect(() => {
    if (tabParam && tabs.some((t) => t.value === tabParam)) {
      setTab(tabParam)
    }
  }, [tabParam]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['me'] })
    queryClient.invalidateQueries({ queryKey: ['scoreHistory', 'me'] })
  }, [queryClient])

  const { data: allMsgData } = useMessageList('ALL')
  const unreadMsgCount = allMsgData?.content?.filter((m) => m.hasUnread).length ?? 0

  const nickname        = profile?.nickname     ?? authUser?.nickname  ?? ''
  const email           = profile?.email        ?? authUser?.email     ?? ''
  const createdAt       = profile?.createdAt
  const currentLevel    = profile?.currentLevel ?? 1
  const isFixed         = profile?.nicknameFixed === true
  const profileImageUrl = profile?.profileImageUrl ?? authUser?.profileImageUrl
  const avatarSeed      = String(profile?.id ?? authUser?.id ?? nickname ?? '?')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <SeoMeta title={t('mypage.title', '마이페이지')} description={`${t('mypage.title', '마이페이지')}.`} noindex />
      {/* Profile card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm flex items-center gap-5">
        {/* 레벨 아이콘 + 아바타 */}
        <div className="relative flex-shrink-0">
          {/* 고정닉: amber gradient 테두리 래퍼 */}
          <div className={isFixed
            ? 'p-[3px] rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-amber-600'
            : ''
          }>
            <div className={`w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center
              text-xl font-bold text-primary-800 select-none overflow-hidden
              ${isFixed ? 'ring-2 ring-white' : ''}`}>
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={nickname} className="w-full h-full object-cover" />
              ) : (
                <DefaultAvatar seed={avatarSeed} px={30} />
              )}
            </div>
          </div>
          {role === 'MEMBER' && (
            <div className="absolute -bottom-1 -right-1">
              <LevelBadge level={currentLevel} size={22} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-neutral-900 truncate">{nickname}</h1>
            {isFixed && (
              <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full
                text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                {t('mypage.fixedNickname', '고정닉')}
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-400 truncate">{email}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
              font-medium bg-primary-50 text-primary-900">
              {t(`mypage.role.${role}`, ROLE_LABEL[role] ?? role)}
            </span>
            {role === 'MEMBER' && (
              <span className="text-xs text-amber-600 font-semibold">
                Lv.{currentLevel}
              </span>
            )}
            {createdAt && (
              <span className="text-xs text-neutral-400">
                {t('mypage.joinedDate', {
                  date: new Date(createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ko-KR'),
                  defaultValue: `가입일 ${new Date(createdAt).toLocaleDateString('ko-KR')}`
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="md:grid md:grid-cols-[200px_1fr] lg:grid-cols-[240px_1fr] md:gap-6 lg:gap-8 items-start">
        {/* Left Sidebar Menu (Desktop/Tablet) */}
        <div className="hidden md:flex flex-col bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 space-y-1">
          {tabs.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-all gap-3
                ${
                  tab === value
                    ? 'bg-primary-50 text-primary-900 font-semibold shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
            >
              <span className="truncate">{t(labelKey)}</span>
              {value === 'messages' && unreadMsgCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white flex-shrink-0">
                  {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right Content Area */}
        <div className="space-y-6 min-w-0">
          {/* Top Tab Bar (Mobile only) */}
          <div className="md:hidden flex gap-1 border-b border-neutral-200 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {tabs.map(({ value, labelKey }) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`inline-flex items-center transition-colors border-b-2 -mb-px
                  whitespace-nowrap flex-shrink-0
                  text-xs px-2.5 py-2 gap-1
                  sm:text-sm sm:px-3 sm:py-2.5 sm:gap-1.5
                  ${
                    tab === value
                      ? 'border-primary-800 text-primary-900'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
              >
                {t(labelKey)}
                {value === 'messages' && unreadMsgCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
                    {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active Tab Panel */}
          <div>
            {tab === 'maturing'  && <MaturingPowerSection profile={profile ?? { id: 0, email, nickname, role, createdAt: '' }} />}
            {tab === 'reviews'   && <MyReviewList />}
            {tab === 'social'    && <SocialHistoryTab />}
            {tab === 'wishlist'  && <MyFavorites />}
            {tab === 'tasteTrees' && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                <h2 className="text-lg font-black text-neutral-950">{t('tasteTree.myTrees')}</h2>
                <p className="mt-2 text-sm text-neutral-500">{t('tasteTree.myTreesDesc')}</p>
                <Link to="/taste-trees/mine" className="mt-5 inline-flex rounded-lg bg-primary-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-900">
                  {t('tasteTree.openMyTrees')}
                </Link>
              </div>
            )}
            {tab === 'byob'        && <ByobHistoryTab />}
            {tab === 'collection'  && <BottleCollectionTab />}
            {tab === 'priceReports' && <MyPriceReportsTab />}
            {tab === 'priceAlerts'  && <MyPriceAlertsTab />}
            {tab === 'messages'    && <MessagesTab initialMessageId={messageIdParam} />}
            {tab === 'blocks'      && <BlockedUsersTab />}
            {tab === 'settings'  && <AccountSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}
