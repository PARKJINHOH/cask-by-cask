import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRecentNotifications } from '../hooks/useNotifications'
import { useMarkNotificationRead } from '../hooks/useNotificationPolling'
import type { NotificationItem, NotificationType } from '../types/notification.types'

type Tab = '' | 'COMMENT' | 'MENTION' | 'MESSAGE' | 'BYOB_APPLY' | 'BYOB_APPROVE'

const TABS: { key: Tab; labelKey: string }[] = [
  { key: '', labelKey: 'notification.all' },
  { key: 'COMMENT', labelKey: 'notification.comment' },
  { key: 'MENTION', labelKey: 'notification.mention' },
  { key: 'MESSAGE', labelKey: 'notification.message' },
  { key: 'BYOB_APPLY', labelKey: 'notification.byob' },
]

const TYPE_ICON: Record<NotificationType, string> = {
  COMMENT: '💬', REPLY: '↩', MENTION: '@', LIKE: '♥', MESSAGE: '✉', SYSTEM: 'ℹ',
  BYOB_APPLY: '🍾', BYOB_APPROVE: '✅', BYOB_REJECT: '❌', BYOB_REMOVE: '🚫',
  REQUEST_APPROVED: '✅', REQUEST_REJECTED: '❌', PRICE_ALERT: '₩',
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
  if (item.targetType === 'MY_REVIEWS' || item.targetType === 'SPIRIT_VARIANT_REVIEW_REQUEST') {
    return '/mypage?tab=reviews'
  }
  if (!item.targetId) return null
  switch (item.targetType) {
    case 'FREE':    return `/community/free/${item.targetId}`
    case 'NOTICE':  return `/community/notice/${item.targetId}`
    case 'PHOTO':   return `/community/photo/${item.targetId}`
    case 'POST':    return `/community/free/${item.targetId}`
    case 'BYOB':    return `/community/byob/${item.targetId}`
    case 'MESSAGE': return `/mypage?tab=messages&messageId=${item.targetId}`
    case 'SPIRIT':  return `/spirits/${item.targetId}`
    // 목표가 알림 — targetId 는 spiritId 다.
    case 'SPIRIT_PRICE': return `/price-tracker/spirits/${item.targetId}`
    default:        return null
  }
}

interface Props { onClose: () => void }

export default function NotificationDropdown({ onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('')
  // BYOB 탭은 BYOB_APPLY로 쿼리하되, 프론트에서 BYOB_APPROVE도 함께 표시
  const queryTab = tab === 'BYOB_APPROVE' ? undefined : (tab as NotificationType || undefined)
  const { data: rawItems = [] } = useRecentNotifications(queryTab)
  const items = tab === 'BYOB_APPLY'
    ? rawItems.filter((n) => n.type === 'BYOB_APPLY' || n.type === 'BYOB_APPROVE' || n.type === 'BYOB_REJECT' || n.type === 'BYOB_REMOVE')
    : rawItems
  const { markRead, markAllRead } = useMarkNotificationRead()

  const handleClick = async (item: NotificationItem) => {
    if (!item.isRead) await markRead(item.id)
    const path = targetPath(item)
    if (path) { navigate(path); onClose() }
  }

  return (
    <div className="fixed left-3 right-3 top-16 mt-2 w-auto bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-96">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
        <span className="text-sm font-semibold text-neutral-800">{t('notification.title')}</span>
        <button
          onClick={markAllRead}
          className="text-xs text-neutral-400 hover:text-primary-800 transition-colors"
        >
          {t('notification.markAllRead')}
        </button>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-neutral-100 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'flex-shrink-0 px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
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
      <div className="max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-neutral-400">{t('notification.noNotification')}</div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={[
                'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-50',
                !item.isRead ? 'bg-primary-50/40' : '',
              ].join(' ')}
            >
              <span className="text-xl flex-shrink-0 mt-0.5 w-6 text-center">
                {TYPE_ICON[item.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className={['text-sm leading-snug', !item.isRead ? 'font-medium text-neutral-800' : 'text-neutral-600'].join(' ')}>
                  {item.message}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">{relativeTime(item.createdAt)}</p>
              </div>
              {!item.isRead && (
                <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
              )}
            </button>
          ))
        )}
      </div>

      {/* 전체보기 */}
      <div className="px-4 py-3 border-t border-neutral-100 text-center">
        <Link
          to="/notifications"
          onClick={onClose}
          className="text-xs text-primary-800 hover:text-primary-900 font-medium"
        >
          {t('notification.viewAll')} →
        </Link>
      </div>
    </div>
  )
}
