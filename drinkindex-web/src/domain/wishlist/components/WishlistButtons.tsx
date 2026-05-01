import { useAuthStore } from '@/domain/auth/store/authStore'
import { useWishlistStatus, useToggleWishlist } from '../hooks/useWishlist'
import type { WishlistType } from '../types/wishlist.types'

interface WishlistButtonsProps {
  spiritId: number
  onNeedLogin: () => void
}

const TYPES: { type: WishlistType; label: string; icon: string; activeClass: string }[] = [
  { type: 'TRIED',      label: '마셔봤어요',      icon: '✓', activeClass: 'bg-green-600 text-white border-green-600' },
  { type: 'WISHLIST',   label: '마시고 싶어요',   icon: '♥', activeClass: 'bg-rose-500 text-white border-rose-500' },
  { type: 'COLLECTION', label: '컬렉션',          icon: '★', activeClass: 'bg-amber-500 text-white border-amber-500' },
]

export default function WishlistButtons({ spiritId, onNeedLogin }: WishlistButtonsProps) {
  const isLoggedIn     = useAuthStore((s) => s.isLoggedIn)
  const { data: activeTypes } = useWishlistStatus(spiritId)
  const toggleMutation = useToggleWishlist()

  const handleToggle = async (type: WishlistType) => {
    if (!isLoggedIn) { onNeedLogin(); return }
    await toggleMutation.mutateAsync({ spiritId, type })
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="위시리스트">
      {TYPES.map(({ type, label, icon, activeClass }) => {
        const active = activeTypes?.has(type) ?? false
        return (
          <button
            key={type}
            onClick={() => handleToggle(type)}
            aria-pressed={active}
            disabled={toggleMutation.isPending}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border',
              'transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
              active
                ? activeClass
                : 'bg-white border-neutral-200 text-neutral-600 hover:border-primary-400 hover:text-primary-600',
            ].join(' ')}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        )
      })}
    </div>
  )
}
