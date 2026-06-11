import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotificationsPage } from '@/domain/notification/hooks/useNotifications'
import { useMarkNotificationRead } from '@/domain/notification/hooks/useNotificationPolling'
import type { NotificationItem, NotificationType } from '@/domain/notification/types/notification.types'
import SeoMeta from '@/shared/components/SeoMeta'

type Tab = '' | NotificationType

const TABS: { key: Tab; labelKey: string }[] = [
  { key: '', labelKey: 'notification.all' },
  { key: 'COMMENT', labelKey: 'notification.comment' },
  { key: 'REPLY', labelKey: 'notification.reply' },
  { key: 'MENTION', labelKey: 'notification.mention' },
  { key: 'LIKE', labelKey: 'notification.like' },
  { key: 'MESSAGE', labelKey: 'notification.message' },
  { key: 'SYSTEM', labelKey: 'notification.system' },
]

const TYPE_ICON: Record<NotificationType, string> = {
  COMMENT: '💬', REPLY: '↩', MENTION: '@', LIKE: '♥', MESSAGE: '✉', SYSTEM: 'ℹ',
  BYOB_APPLY: '🍾', BYOB_APPROVE: '✅', BYOB_REJECT: '❌', BYOB_REMOVE: '🚫',
  REQUEST_APPROVED: '✅', REQUEST_REJECTED: '❌',
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days}일 전` : new Date(dateStr).toLocaleDateString('ko-KR')
}

function targetPath(item: NotificationItem): string | null {
  if (!item.targetId) return null
  switch (item.type) {
    case 'COMMENT':
    case 'REPLY':
    case 'MENTION':
    case 'LIKE':
      if (item.targetType === 'NOTICE') return `/community/notice/${item.targetId}`
      return `/community/free/${item.targetId}`
    case 'MESSAGE':
      return '/mypage?tab=messages'
    case 'BYOB_APPLY':
    case 'BYOB_APPROVE':
    case 'BYOB_REJECT':
    case 'BYOB_REMOVE':
      return `/community/byob/${item.targetId}`
    case 'REQUEST_APPROVED':
      return `/spirits/${item.targetId}`
    case 'REQUEST_REJECTED':
      return null
    default:
      return null
  }
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('')
  const [page, setPage] = useState(0)
  const { markRead, markAllRead } = useMarkNotificationRead()

  const { data, isLoading } = useNotificationsPage((tab as NotificationType) || undefined, page)

  const items = data?.content ?? []

  const changeTab = (key: Tab) => {
    setTab(key)
    setPage(0)
  }

  const handleClick = async (item: NotificationItem) => {
    if (!item.isRead) await markRead(item.id)
    const path = targetPath(item)
    if (path) navigate(path)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <SeoMeta title={t('notification.title')} description="DrinkIndex 알림함." noindex />
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">{t('notification.title')}</h1>
        <button
          onClick={markAllRead}
          className="text-sm text-neutral-500 hover:text-primary-800 transition-colors"
        >
          {t('notification.markAllRead')}
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-neutral-200 mb-5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => changeTab(key)}
            className={[
              'flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary-800 text-primary-800'
                : 'border-transparent text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-neutral-400">로딩 중...</div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-sm text-neutral-400">{t('notification.noNotification')}</div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={[
                'w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-neutral-50 transition-colors',
                !item.isRead ? 'bg-primary-50/30' : '',
              ].join(' ')}
            >
              <span className="text-xl w-7 text-center flex-shrink-0 mt-0.5">
                {TYPE_ICON[item.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className={['text-sm leading-snug', !item.isRead ? 'font-medium text-neutral-800' : 'text-neutral-600'].join(' ')}>
                  {item.message}
                </p>
                <p className="text-xs text-neutral-400 mt-1">{relativeTime(item.createdAt)}</p>
              </div>
              {!item.isRead && (
                <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            disabled={data.page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-40
              hover:bg-neutral-50 transition-colors"
          >
            ←
          </button>
          <span className="text-sm text-neutral-500">
            {data.page + 1} / {data.totalPages}
          </span>
          <button
            disabled={data.last}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg disabled:opacity-40
              hover:bg-neutral-50 transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
