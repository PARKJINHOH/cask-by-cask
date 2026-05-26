import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useMe } from '@/domain/user/hooks/useUser'
import MyReviewList from '@/domain/review/components/MyReviewList'
import MyFavorites from '@/domain/wishlist/components/MyFavorites'
import AccountSettings from '@/domain/user/components/AccountSettings'
import MaturingPowerSection from '@/domain/score/components/MaturingPowerSection'
import MessagesTab from '@/domain/message/components/MessagesTab'
import ByobHistoryTab from '@/domain/byob/components/ByobHistoryTab'
import { BottleCollectionTab } from '@/domain/user-bottle/components/BottleCollectionTab'
import LevelIcon from '@/shared/components/icons/LevelIcon'
import SeoMeta from '@/shared/components/SeoMeta'
import { useMessageList } from '@/domain/message/hooks/useMessages'

type Tab = 'maturing' | 'reviews' | 'wishlist' | 'byob' | 'collection' | 'messages' | 'settings'

const ALL_TABS: { value: Tab; label: string; adminHidden?: boolean }[] = [
  { value: 'maturing',  label: '숙성력',   adminHidden: true },
  { value: 'reviews',   label: '내 리뷰' },
  { value: 'wishlist',  label: '즐겨찾기' },
  { value: 'byob',       label: 'BYOB 이력' },
  { value: 'collection', label: '내 컬렉션' },
  { value: 'messages',   label: '쪽지' },
  { value: 'settings',  label: '계정 설정' },
]

const ROLE_LABEL: Record<string, string> = {
  MEMBER: '회원',
  ADMIN: '관리자',
  DISTILLERY: '증류소',
}

export default function MyPage() {
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
  const maturingPower   = profile?.maturingPower ?? 0
  const isFixed         = profile?.nicknameFixed === true
  const profileImageUrl = profile?.profileImageUrl ?? authUser?.profileImageUrl

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <SeoMeta title="마이페이지" description="DrinkIndex 마이페이지." noindex />
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
                nickname ? nickname[0].toUpperCase() : '?'
              )}
            </div>
          </div>
          {role === 'MEMBER' && (
            <div className="absolute -bottom-1 -right-1">
              <LevelIcon level={currentLevel} size={20} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-neutral-900 truncate">{nickname}</h1>
            {isFixed && (
              <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full
                text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                고정닉
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-400 truncate">{email}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
              font-medium bg-primary-50 text-primary-900">
              {ROLE_LABEL[role] ?? role}
            </span>
            {role === 'MEMBER' && (
              <span className="text-xs text-amber-600 font-semibold">
                숙성력 Lv.{currentLevel} ({maturingPower.toLocaleString()}p)
              </span>
            )}
            {createdAt && (
              <span className="text-xs text-neutral-400">
                가입일 {new Date(createdAt).toLocaleDateString('ko-KR')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-neutral-200 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {tabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
              whitespace-nowrap flex-shrink-0 ${
              tab === value
                ? 'border-primary-800 text-primary-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {label}
            {value === 'messages' && unreadMsgCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
                {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === 'maturing'  && <MaturingPowerSection profile={profile ?? { id: 0, email, nickname, role, createdAt: '' }} />}
      {tab === 'reviews'   && <MyReviewList />}
      {tab === 'wishlist'  && <MyFavorites />}
      {tab === 'byob'        && <ByobHistoryTab />}
      {tab === 'collection'  && <BottleCollectionTab />}
      {tab === 'messages'    && <MessagesTab initialMessageId={messageIdParam} />}
      {tab === 'settings'  && <AccountSettings />}
    </div>
  )
}
