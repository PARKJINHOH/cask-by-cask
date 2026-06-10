import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useWishlistStatus, useToggleWishlist } from '../hooks/useWishlist'

interface WishlistButtonsProps {
  spiritId: number
  onNeedLogin: () => void
}

export default function WishlistButtons({ spiritId, onNeedLogin }: WishlistButtonsProps) {
  const { t } = useTranslation()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const { data: activeTypes } = useWishlistStatus(spiritId)
  const toggleMutation = useToggleWishlist()

  const active = activeTypes?.has('COLLECTION') ?? false

  const handleToggle = async () => {
    if (!isLoggedIn) { onNeedLogin(); return }
    await toggleMutation.mutateAsync({ spiritId, type: 'COLLECTION' })
  }

  return (
    <button
      onClick={handleToggle}
      aria-pressed={active}
      aria-label={t('wishlist.favorites')}
      disabled={toggleMutation.isPending}
      title={t('wishlist.favorites')}
      className={[
        'w-10 h-10 flex items-center justify-center rounded-full border-2 transition-colors',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        active
          ? 'bg-amber-600 border-amber-600 text-white'
          : 'bg-white border-neutral-200 text-neutral-400 hover:border-amber-500 hover:text-amber-600',
      ].join(' ')}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
