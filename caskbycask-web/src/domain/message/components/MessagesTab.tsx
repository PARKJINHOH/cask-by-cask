import { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useMessageList, useMessageThread, useMessageActions } from '../hooks/useMessages'
import { useMessageStore } from '../store/messageStore'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'
import type { MessageSummary } from '../types/message.types'
import FormFieldLabel from '@/shared/components/FormFieldLabel'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

interface Props {
  initialMessageId?: number
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

// ── 목록 아이템 ─────────────────────────────────────────────────
function MessageListItem({
  msg,
  selected,
  onClick,
}: {
  msg: MessageSummary
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors',
        selected ? 'bg-primary-50/60' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        {msg.hasUnread && (
          <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
        )}
        <span className={['text-sm truncate flex-1', msg.hasUnread ? 'font-semibold text-neutral-900' : 'text-neutral-700'].join(' ')}>
          {msg.partnerNickname}
        </span>
        <span className="text-xs text-neutral-400 flex-shrink-0">{formatTime(msg.createdAt)}</span>
      </div>
      <p className="text-xs text-neutral-500 truncate mt-0.5 pl-4">
        {msg.lastMessage}
      </p>
    </button>
  )
}

// ── 스레드 상세 패널 ────────────────────────────────────────────
function ThreadPanel({
  threadId,
  myNickname,
  onDelete,
  onBack,
}: {
  threadId: number
  myNickname: string
  onDelete: () => void
  onBack: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: thread, isLoading } = useMessageThread(threadId)
  const { replyMutation, deleteMutation } = useMessageActions()

  // 스레드 로드 완료 = 서버에서 읽음 처리됨 → 목록 갱신 (뱃지 즉시 감소)
  const readInvalidatedRef = useRef(false)
  useEffect(() => {
    if (thread && !readInvalidatedRef.current) {
      readInvalidatedRef.current = true
      qc.invalidateQueries({ queryKey: ['messages', 'ALL'] })
    }
  }, [thread, qc])

  const { toasts, showToast, removeToast } = useToast()
  const [replyText, setReplyText] = useState('')

  const handleReply = useCallback(async () => {
    const c = replyText.trim()
    if (!c) return
    try {
      await replyMutation.mutateAsync({ id: threadId, content: c })
      setReplyText('')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 400) showToast(t('messages.badWordError', '욕설이 포함되어 있습니다'), 'error')
      else showToast(t('common.error', '오류가 발생했습니다.'), 'error')
    }
  }, [replyText, threadId, replyMutation, showToast, t])

  const handleDelete = useCallback(async () => {
    if (!confirm(t('messages.deleteConfirm', '이 쪽지를 삭제하시겠습니까?'))) return
    onDelete()
    try {
      await deleteMutation.mutateAsync(threadId)
    } catch {
      showToast(t('common.error', '삭제 중 오류가 발생했습니다.'), 'error')
    }
  }, [threadId, deleteMutation, onDelete, showToast, t])

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">{t('common.loading', '불러오는 중...')}</div>
  }
  if (!thread) return null

  return (
    <div className="flex flex-col h-full">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="lg:hidden text-sm text-neutral-500 hover:text-neutral-700 mr-1"
          >
            {t('messages.backToList', '← 목록으로')}
          </button>
          <span className="text-sm font-semibold text-neutral-800">
            {thread.senderNickname === myNickname ? thread.receiverNickname : thread.senderNickname}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          {t('messages.delete', '삭제')}
        </button>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {thread.items.map((item) => {
          const isMine = item.senderNickname === myNickname
          return (
            <div key={item.id} className={['flex flex-col', isMine ? 'items-end' : 'items-start'].join(' ')}>
              <div
                className={[
                  'max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
                  isMine
                    ? 'bg-primary-700 text-white rounded-br-sm'
                    : 'bg-neutral-100 text-neutral-800 rounded-bl-sm',
                ].join(' ')}
              >
                {item.content}
              </div>
              {/* 읽음 표시: 내가 보낸 메시지 기준 - 미읽음이면 "1" 표시 */}
              <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-400">
                {isMine && !item.isRead && (
                  <span className="text-amber-400 font-bold leading-none">1</span>
                )}
                <span>{formatDateTime(item.createdAt)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 답장 영역 */}
      <div className="flex-shrink-0 border-t border-neutral-200 p-3">
        <FormFieldLabel required className="mb-1.5 text-xs">{t('messages.content')}</FormFieldLabel>
        <AutoGrowTextarea
          required
          aria-required="true"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value.slice(0, 100))}
          rows={3}
          maxLength={100}
          placeholder={t('messages.contentPlaceholder', '답장을 입력하세요...')}
          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <div className="flex items-center justify-end mt-1">
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || replyMutation.isPending}
            className="px-4 py-1.5 text-sm font-medium text-white bg-primary-800 rounded-lg hover:bg-primary-900 transition-colors disabled:opacity-50"
          >
            {replyMutation.isPending ? t('common.sending', '전송 중...') : t('messages.send', '보내기')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────
export default function MessagesTab({ initialMessageId }: Props) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<number | null>(initialMessageId ?? null)
  const [showDetail, setShowDetail] = useState<boolean>(Boolean(initialMessageId))
  const { data, isLoading } = useMessageList('ALL')
  const { openPopup } = useMessageStore()
  const { user } = useAuthStore()
  const myNickname = user?.nickname ?? ''

  const messages = data?.content ?? []

  useEffect(() => {
    if (initialMessageId) {
      setSelectedId(initialMessageId)
      setShowDetail(true)
    }
  }, [initialMessageId])

  const handleSelect = (id: number) => {
    setSelectedId(id)
    setShowDetail(true)
  }

  const handleDelete = () => {
    setSelectedId(null)
    setShowDetail(false)
  }

  const unreadCount = messages.filter((m) => m.hasUnread).length

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ minHeight: 480 }}>
      <div className="flex h-full lg:divide-x lg:divide-neutral-200" style={{ minHeight: 480 }}>

        {/* 좌측 목록 패널 */}
        <div className={['flex flex-col w-full lg:w-64 xl:w-72 flex-shrink-0', showDetail ? 'hidden lg:flex' : 'flex'].join(' ')}>
          {/* 헤더 + 새 쪽지 버튼 */}
          <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-700">{t('messages.title', '쪽지함')}</span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => openPopup()}
              className="text-xs text-primary-800 hover:text-primary-900 font-medium"
            >
              {t('messages.newMessageBtn', '+ 새 쪽지')}
            </button>
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-neutral-400">{t('common.loading', '불러오는 중...')}</div>
            ) : messages.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-400">{t('messages.noMessages', '쪽지가 없습니다.')}</div>
            ) : (
              messages.map((msg) => (
                <MessageListItem
                  key={msg.id}
                  msg={msg}
                  selected={selectedId === msg.id}
                  onClick={() => handleSelect(msg.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* 우측 상세 패널 */}
        <div className={['flex-1 flex flex-col min-h-0', showDetail ? 'flex' : 'hidden lg:flex'].join(' ')}>
          {selectedId ? (
            <ThreadPanel
              key={selectedId}
              threadId={selectedId}
              myNickname={myNickname}
              onDelete={handleDelete}
              onBack={() => setShowDetail(false)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">
              {t('messages.selectThread', '쪽지를 선택하세요.')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
