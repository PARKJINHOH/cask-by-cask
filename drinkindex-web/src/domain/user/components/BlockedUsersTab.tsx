import { useTranslation } from 'react-i18next'
import { useBlockedUsers, useUnblockUser } from '../hooks/useUser'
import UserBadge from '@/shared/components/UserBadge'
import { useToast } from '@/shared/hooks/useToast'
import { formatDate } from '@/shared/utils/format'
import type { UserRole } from '@/domain/auth/types/auth.types'

export default function BlockedUsersTab() {
  const { t, i18n } = useTranslation()
  const { data: blocked = [], isLoading } = useBlockedUsers()
  const unblockMutation = useUnblockUser()
  const { showToast } = useToast()

  const handleUnblock = (userId: number, nickname: string) => {
    if (!window.confirm(t('mypage.blocks.unblockConfirm', { nickname }))) return
    unblockMutation.mutate(userId, {
      onSuccess: () => showToast(t('mypage.blocks.unblockSuccess'), 'success'),
    })
  }

  if (isLoading) {
    return <div className="py-16 text-center text-neutral-400 text-sm">{t('common.loading')}</div>
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-semibold text-neutral-900 mb-1">{t('mypage.blocks.title')}</h2>
      <p className="text-sm text-neutral-500 mb-5">{t('mypage.blocks.desc')}</p>

      {blocked.length === 0 ? (
        <div className="py-12 text-center text-neutral-400 text-sm">{t('mypage.blocks.empty')}</div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {blocked.map((b) => (
            <li key={b.userId} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <UserBadge
                  user={{
                    id: b.userId,
                    nickname: b.nickname,
                    role: b.role as UserRole,
                    currentLevel: b.currentLevel,
                    maturingPower: b.maturingPower,
                    nicknameFixed: b.nicknameFixed,
                    profileImageUrl: b.profileImageUrl,
                  }}
                  size="md"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  {t('mypage.blocks.blockedAt', { date: formatDate(b.blockedAt, i18n.language) })}
                </p>
              </div>
              <button
                onClick={() => handleUnblock(b.userId, b.nickname)}
                disabled={unblockMutation.isPending}
                className="flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg border border-neutral-300
                  text-neutral-700 hover:border-primary-400 hover:text-primary-800 hover:bg-primary-50
                  disabled:opacity-40 transition-colors"
              >
                {t('mypage.blocks.unblock')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
