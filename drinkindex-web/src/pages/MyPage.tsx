import { useState } from 'react'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useMe } from '@/domain/user/hooks/useUser'
import MyReviewList from '@/domain/review/components/MyReviewList'
import MyWishlist from '@/domain/wishlist/components/MyWishlist'
import AccountSettings from '@/domain/user/components/AccountSettings'

type Tab = 'reviews' | 'wishlist' | 'settings'

const TABS: { value: Tab; label: string }[] = [
  { value: 'reviews',  label: '내 리뷰' },
  { value: 'wishlist', label: '위시리스트' },
  { value: 'settings', label: '계정 설정' },
]

const ROLE_LABEL: Record<string, string> = {
  MEMBER: '회원',
  ADMIN: '관리자',
  DISTILLERY: '증류소',
}

export default function MyPage() {
  const authUser = useAuthStore((s) => s.user)
  const { data: profile } = useMe()
  const [tab, setTab] = useState<Tab>('reviews')

  const nickname  = profile?.nickname  ?? authUser?.nickname  ?? ''
  const email     = profile?.email     ?? authUser?.email     ?? ''
  const role      = profile?.role      ?? authUser?.role      ?? ''
  const createdAt = profile?.createdAt

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Profile card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm flex items-center gap-5">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center
          text-xl font-bold text-primary-600 flex-shrink-0 select-none">
          {nickname ? nickname[0].toUpperCase() : '?'}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-neutral-900 truncate">{nickname}</h1>
          <p className="text-sm text-neutral-400 truncate">{email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
              font-medium bg-primary-50 text-primary-700">
              {ROLE_LABEL[role] ?? role}
            </span>
            {createdAt && (
              <span className="text-xs text-neutral-400">
                가입일 {new Date(createdAt).toLocaleDateString('ko-KR')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === value
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === 'reviews'  && <MyReviewList />}
      {tab === 'wishlist' && <MyWishlist />}
      {tab === 'settings' && <AccountSettings />}
    </div>
  )
}
