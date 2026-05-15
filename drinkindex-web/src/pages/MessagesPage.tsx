import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useMessageList, useMessageThread, useMessageActions } from '@/domain/message/hooks/useMessages'
import type { MessageBox } from '@/domain/message/types/message.types'
import { communityApi } from '@/domain/community/api/communityApi'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'

// ── 날짜 포맷 ──────────────────────────────────────────────────
function formatTime(d: string) {
  const date = new Date(d)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  return isToday
    ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}

// ── 새 쪽지 모달 ───────────────────────────────────────────────
interface NewMessageModalProps {
  onClose: () => void
  onSend: (receiverNickname: string, content: string) => void
  isSending: boolean
  onBadWord: (w: string[]) => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function NewMessageModal({ onClose, onSend, isSending, onBadWord: _onBadWord }: NewMessageModalProps) {
  const { t } = useTranslation()
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(nickname), 300)
    return () => clearTimeout(debounceRef.current)
  }, [nickname])

  const { data: suggestions = [] } = useQuery({
    queryKey: ['users', 'search', search],
    queryFn: () => communityApi.searchUsers(search, 5).then((r) => r.data.data ?? []),
    enabled: search.length > 0 && showDropdown,
    staleTime: 10_000,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (nickname.trim() && content.trim()) onSend(nickname.trim(), content.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-neutral-900">{t('messages.newMessage')}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 받는 사람 */}
          <div className="relative">
            <label className="block text-xs text-neutral-500 mb-1">{t('messages.to')}</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setShowDropdown(true) }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder={t('messages.recipientPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onMouseDown={() => { setNickname(u.nickname); setShowDropdown(false) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors"
                  >
                    {u.nickname}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 내용 */}
          <div>
            <label className="block text-xs text-neutral-500 mb-1">{t('messages.content')}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder={t('messages.contentPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <div className="text-right text-xs text-neutral-400 mt-0.5">{content.length}/5000</div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!nickname.trim() || !content.trim() || isSending}
              className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSending ? '...' : t('messages.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── 쪽지 상세 (스레드) ──────────────────────────────────────────
interface ThreadPanelProps {
  threadId: number
  currentUser: string
  onClose: () => void
  onDelete: () => void
}

function ThreadPanel({ threadId, currentUser, onClose, onDelete }: ThreadPanelProps) {
  const { t } = useTranslation()
  const { toasts, showToast, removeToast } = useToast()
  const { data: thread } = useMessageThread(threadId)
  const { replyMutation } = useMessageActions()
  const [replyContent, setReplyContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.items])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim()) return
    replyMutation.mutate(
      { id: threadId, content: replyContent.trim() },
      {
        onSuccess: () => setReplyContent(''),
        onError: (err: unknown) => {
          const data = (err as { response?: { data?: { code?: string; detectedWords?: string[] } } })?.response?.data
          if (data?.code === 'BAD_WORD_DETECTED') {
            showToast(`욕설이 포함되어 있습니다: ${data.detectedWords?.join(', ')}`, 'error')
          } else {
            showToast(t('common.error'), 'error')
          }
        },
      },
    )
  }

  if (!thread) return <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">로딩 중...</div>

  const partner = currentUser === thread.senderNickname ? thread.receiverNickname : thread.senderNickname

  return (
    <div className="flex flex-col h-full">
      <Toast toasts={toasts} onRemove={removeToast} />
      {/* 상단 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="sm:hidden p-1 text-neutral-400 hover:text-neutral-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-sm font-semibold text-neutral-800">{partner}</p>
          </div>
        </div>
        <button
          onClick={() => { if (window.confirm(t('messages.deleteConfirm'))) onDelete() }}
          className="text-xs text-neutral-400 hover:text-red-500 transition-colors px-2 py-1"
        >
          {t('messages.delete')}
        </button>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {thread.items.map((item) => {
          const isMine = item.senderNickname === currentUser
          return (
            <div key={item.id} className={['flex', isMine ? 'justify-end' : 'justify-start'].join(' ')}>
              <div className={['max-w-[75%]', isMine ? '' : ''].join(' ')}>
                {!isMine && (
                  <p className="text-xs text-neutral-400 mb-1 ml-1">{item.senderNickname}</p>
                )}
                <div className={[
                  'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
                  isMine ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-neutral-100 text-neutral-800 rounded-tl-sm',
                ].join(' ')}>
                  {item.content}
                </div>
                <p className={['text-xs text-neutral-400 mt-1', isMine ? 'text-right' : 'ml-1'].join(' ')}>
                  {formatTime(item.createdAt)}
                  {isMine && item.isRead && <span className="ml-1">읽음</span>}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 답장 입력 */}
      <form onSubmit={handleReply} className="flex-shrink-0 border-t border-neutral-200 px-4 py-3 flex gap-2">
        <textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(e) } }}
          rows={1}
          maxLength={5000}
          placeholder={t('messages.contentPlaceholder')}
          className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 max-h-24 overflow-y-auto"
          style={{ height: 'auto' }}
        />
        <button
          type="submit"
          disabled={!replyContent.trim() || replyMutation.isPending}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 flex-shrink-0"
        >
          {t('messages.send')}
        </button>
      </form>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function MessagesPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [box, setBox] = useState<MessageBox>('INBOX')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showThread, setShowThread] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const { toasts, showToast, removeToast } = useToast()

  const { data: listData } = useMessageList(box)
  const messages = listData?.content ?? []
  const { sendMutation, deleteMutation } = useMessageActions()

  const handleSelect = (id: number) => {
    setSelectedId(id)
    setShowThread(true)
  }

  const handleSend = (receiverNickname: string, content: string) => {
    sendMutation.mutate(
      { receiverNickname, content },
      {
        onSuccess: (res) => {
          setShowNewModal(false)
          const newId = res.data.data?.id
          if (newId) { setSelectedId(newId); setShowThread(true) }
        },
        onError: (err: unknown) => {
          const data = (err as { response?: { data?: { code?: string; detectedWords?: string[] } } })?.response?.data
          if (data?.code === 'BAD_WORD_DETECTED') {
            showToast(`욕설이 포함되어 있습니다: ${data.detectedWords?.join(', ')}`, 'error')
          } else {
            showToast(t('common.error'), 'error')
          }
        },
      },
    )
  }

  const handleDelete = () => {
    if (!selectedId) return
    deleteMutation.mutate(selectedId, {
      onSuccess: () => { setSelectedId(null); setShowThread(false) },
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">{t('messages.title')}</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {t('messages.newMessage')}
        </button>
      </div>

      {/* PC: 2컬럼 / 모바일: 스택 */}
      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[400px]">
        {/* 좌측: 목록 */}
        <div className={[
          'flex flex-col bg-white border border-neutral-200 rounded-2xl overflow-hidden',
          'sm:w-80 sm:flex-shrink-0',
          showThread ? 'hidden sm:flex' : 'flex w-full',
        ].join(' ')}>
          {/* 탭 */}
          <div className="flex border-b border-neutral-200">
            {(['INBOX', 'SENT'] as MessageBox[]).map((b) => (
              <button
                key={b}
                onClick={() => { setBox(b); setSelectedId(null) }}
                className={[
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  box === b ? 'text-primary-600 border-b-2 border-primary-600' : 'text-neutral-500',
                ].join(' ')}
              >
                {b === 'INBOX' ? t('messages.inbox') : t('messages.sent')}
              </button>
            ))}
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {messages.length === 0 ? (
              <div className="py-16 text-center text-sm text-neutral-400">{t('messages.noMessages')}</div>
            ) : (
              messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleSelect(msg.id)}
                  className={[
                    'w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 transition-colors',
                    selectedId === msg.id ? 'bg-primary-50' : '',
                  ].join(' ')}
                >
                  <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 text-sm font-bold text-neutral-600 uppercase">
                    {msg.partnerNickname.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={['text-sm truncate', msg.hasUnread ? 'font-semibold text-neutral-800' : 'text-neutral-600'].join(' ')}>
                        {msg.partnerNickname}
                      </span>
                      <span className="text-xs text-neutral-400 flex-shrink-0">{formatTime(msg.createdAt)}</span>
                    </div>
                    <p className="text-xs text-neutral-400 truncate">{msg.lastMessage}</p>
                  </div>
                  {msg.hasUnread && box === 'INBOX' && (
                    <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* 우측: 상세 */}
        <div className={[
          'flex-1 bg-white border border-neutral-200 rounded-2xl overflow-hidden',
          showThread ? 'flex flex-col w-full sm:w-auto' : 'hidden sm:flex sm:flex-col',
        ].join(' ')}>
          {selectedId ? (
            <ThreadPanel
              threadId={selectedId}
              currentUser={user?.nickname ?? ''}
              onClose={() => setShowThread(false)}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">
              {t('messages.selectThread')}
            </div>
          )}
        </div>
      </div>

      {/* 새 쪽지 모달 */}
      {showNewModal && (
        <NewMessageModal
          onClose={() => setShowNewModal(false)}
          onSend={handleSend}
          isSending={sendMutation.isPending}
          onBadWord={(w) => showToast(`욕설이 포함되어 있습니다: ${w.join(', ')}`, 'error')}
        />
      )}
    </div>
  )
}
