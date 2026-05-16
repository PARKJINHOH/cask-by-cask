import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useInfiniteNotifications } from '@/domain/notification/hooks/useNotifications'
import { useMarkNotificationRead } from '@/domain/notification/hooks/useNotificationPolling'
import type { NotificationItem, NotificationType } from '@/domain/notification/types/notification.types'

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
  switch (item.targetType) {
    case 'FREE':    return `/community/free/${item.targetId}`
    case 'NOTICE':  return `/community/notice/${item.targetId}`
    case 'POST':    return `/community/free/${item.targetId}` // 하위 호환
    case 'MESSAGE': return '/messages'
    default:        return null
  }
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('')
  const observerRef = useRef<HTMLDivElement>(null)
  const { markRead, markAllRead } = useMarkNotificationRead()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteNotifications(tab as NotificationType || undefined)

  const items = data?.pages.flatMap((p) => p.content) ?? []

  // 무한 스크롤 트리거
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
      },
      { threshold: 0.1 },
    )
    if (observerRef.current) observer.observe(observerRef.current)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleClick = async (item: NotificationItem) => {
    if (!item.isRead) await markRead(item.id)
    const path = targetPath(item)
    if (path) navigate(path)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">{t('notification.title')}</h1>
        <button
          onClick={markAllRead}
          className="text-sm text-neutral-500 hover:text-primary-600 transition-colors"
        >
          {t('notification.markAllRead')}
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-neutral-200 mb-5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary-600 text-primary-600'
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

      {/* 무한 스크롤 트리거 */}
      <div ref={observerRef} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && <span className="text-xs text-neutral-400">로딩 중...</span>}
      </div>
    </div>
  )
}
