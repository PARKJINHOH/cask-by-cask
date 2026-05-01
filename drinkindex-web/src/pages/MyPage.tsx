import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useMyWishlist } from '@/domain/wishlist/hooks/useWishlist'
import { useReviews } from '@/domain/review/hooks/useReviews'
import type { WishlistType } from '@/domain/wishlist/types/wishlist.types'
import Badge from '@/shared/components/Badge'
import Spinner from '@/shared/components/Spinner'
import { Link } from 'react-router-dom'

type Tab = 'wishlist' | 'reviews'

const WISHLIST_TYPES: { value: WishlistType; labelKey: string }[] = [
  { value: 'WISHLIST',    labelKey: 'wishlist.wishlist' },
  { value: 'TRIED',       labelKey: 'wishlist.tried' },
  { value: 'COLLECTION',  labelKey: 'wishlist.collection' },
]

export default function MyPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('wishlist')
  const [wishlistType, setWishlistType] = useState<WishlistType | undefined>(undefined)

  const { data: wishlist, isLoading: wishlistLoading } = useMyWishlist(wishlistType)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h1 className="text-xl font-bold text-neutral-900">{user?.nickname}</h1>
        <p className="text-sm text-neutral-400 mt-1">{user?.email}</p>
        <Badge variant="neutral" size="sm" className="mt-2">
          {user?.role}
        </Badge>
      </div>

      <div className="flex gap-1 border-b border-neutral-200 mb-6">
        {(['wishlist', 'reviews'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t_
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t_ === 'wishlist' ? '위시리스트' : '리뷰'}
          </button>
        ))}
      </div>

      {tab === 'wishlist' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setWishlistType(undefined)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                !wishlistType
                  ? 'bg-neutral-800 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t('common.all')}
            </button>
            {WISHLIST_TYPES.map(({ value, labelKey }) => (
              <button
                key={value}
                onClick={() => setWishlistType(value)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  wishlistType === value
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>

          {wishlistLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="text-primary-600" />
            </div>
          ) : !wishlist || wishlist.empty ? (
            <p className="text-center text-neutral-400 py-10">{t('wishlist.noItem')}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {wishlist.content.map((item) => (
                <Link key={item.id} to={`/spirits/${item.spirit.id}`}>
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-neutral-100">
                      {item.spirit.primaryImageUrl ? (
                        <img
                          src={item.spirit.primaryImageUrl}
                          alt={item.spirit.nameKo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          🥃
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <Badge variant="primary" size="sm">{t(`wishlist.${item.type.toLowerCase()}`)}</Badge>
                      <p className="text-sm font-medium mt-1 line-clamp-1">{item.spirit.nameKo}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
