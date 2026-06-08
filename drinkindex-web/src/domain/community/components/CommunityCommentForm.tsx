import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useCreateComment, useUpdateComment } from '../hooks/useComments'
import { communityApi } from '../api/communityApi'
import type { PostCommentItem, UserMention, CommunityEmoji } from '../types/community.types'
import Button from '@/shared/components/Button'
import EmojiPicker from './EmojiPicker'

interface Props {
  postId: number
  parentId?: number
  parentNickname?: string
  editingComment?: PostCommentItem
  forcedSecret?: boolean // 부모/형제 대댓글이 비밀댓글이라 강제로 비밀댓글이 되는 경우
  onSuccess: () => void
  onCancel?: () => void
  onBadWord?: (words: string[]) => void
}

const MAX_LENGTH = 1000

export default function CommunityCommentForm({
  postId,
  parentId,
  parentNickname,
  editingComment,
  forcedSecret = false,
  onSuccess,
  onCancel,
  onBadWord,
}: Props) {
  const { t } = useTranslation()
  const [content, setContent] = useState(editingComment?.content ?? '')
  const [isSecret, setIsSecret] = useState(forcedSecret)
  const [mentionedUserId, setMentionedUserId] = useState<number | null>(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const createMutation = useCreateComment(postId)
  const updateMutation = useUpdateComment(postId)
  const isPending = createMutation.isPending || updateMutation.isPending

  // 부모/형제 대댓글이 비밀댓글이면 자동으로 비밀댓글 강제 적용
  useEffect(() => {
    if (forcedSecret) setIsSecret(true)
  }, [forcedSecret])

  // @멘션 검색 (디바운스)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(mentionQuery), 300)
    return () => clearTimeout(debounceRef.current)
  }, [mentionQuery])

  const { data: mentionUsers = [] } = useQuery({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: () => communityApi.searchUsers(debouncedQuery).then((r) => r.data.data ?? []),
    enabled: debouncedQuery.length > 0,
    staleTime: 10_000,
  })

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    setMentionedUserId(null) // 내용 변경 시 멘션 초기화

    const cursor = e.target.selectionStart ?? val.length
    const before = val.slice(0, cursor)
    const atMatch = before.match(/@([\w가-힣]*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionStart(cursor - atMatch[0].length)
    } else {
      setMentionQuery('')
      setMentionStart(null)
    }
  }, [])

  const selectMention = (user: UserMention) => {
    if (mentionStart === null || !textareaRef.current) return
    const cursor = textareaRef.current.selectionStart ?? content.length
    const before = content.slice(0, mentionStart)
    const after = content.slice(cursor)
    const inserted = `@${user.nickname} `
    setContent(before + inserted + after)
    setMentionedUserId(user.id)
    setMentionQuery('')
    setMentionStart(null)
    textareaRef.current.focus()
  }

  const handleEmojiSelect = useCallback(async (emoji: CommunityEmoji) => {
    const insert = emoji.unicode ?? (emoji.imageUrl ? `[emoji-img:${emoji.imageUrl}]` : emoji.label)
    setShowEmojiPicker(false)
    setError('')
    try {
      await createMutation.mutateAsync({
        content: insert,
        parentId,
        mentionedUserId: undefined,
        isSecret,
      })
      onSuccess()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { code?: string; detectedWords?: string[] } } })?.response?.data
      if (data?.code === 'BAD_WORD_DETECTED' && data.detectedWords) {
        onBadWord?.(data.detectedWords)
      } else {
        setError(t('comment.saveError'))
      }
    }
  }, [createMutation, parentId, isSecret, onSuccess, onBadWord, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setError('')
    try {
      if (editingComment) {
        await updateMutation.mutateAsync({ commentId: editingComment.id, content })
      } else {
        await createMutation.mutateAsync({
          content,
          parentId,
          mentionedUserId: mentionedUserId ?? undefined,
          isSecret,
        })
      }
      setContent('')
      setMentionedUserId(null)
      setIsSecret(forcedSecret)
      onSuccess()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { code?: string; detectedWords?: string[] } } })?.response?.data
      if (data?.code === 'BAD_WORD_DETECTED' && data.detectedWords) {
        onBadWord?.(data.detectedWords)
      } else {
        setError(t('comment.saveError'))
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* 답글 표시 */}
      {parentNickname && !editingComment && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg">
          <span className="text-primary-400 text-sm">↩</span>
          <span className="text-sm text-primary-900 font-medium flex-1">
            {t('comment.replyTo', { nickname: parentNickname })}
          </span>
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-primary-300 hover:text-primary-800 text-xs">✕</button>
          )}
        </div>
      )}

      {/* 멘션 드롭다운 */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          maxLength={MAX_LENGTH}
          rows={editingComment ? 3 : 2}
          placeholder={t('comment.placeholder')}
          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent placeholder:text-neutral-400"
        />
        {mentionQuery.length > 0 && mentionUsers.length > 0 && (
          <div className="absolute z-10 top-full mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden">
            {mentionUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectMention(u) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 hover:text-primary-900 transition-colors"
              >
                @{u.nickname}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 비밀댓글 체크박스 */}
      {!editingComment && (
        <div>
          <label className={`inline-flex items-center gap-1.5 text-xs select-none w-fit ${forcedSecret ? 'text-neutral-400 cursor-not-allowed' : 'text-neutral-500 cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={isSecret}
              disabled={forcedSecret}
              onChange={(e) => setIsSecret(e.target.checked)}
              className="w-3.5 h-3.5 accent-primary-500"
            />
            <span>🔒 {t('comment.secretCheckbox')}</span>
          </label>
          {forcedSecret && (
            <p className="mt-0.5 pl-5 text-[11px] text-neutral-400">{t('comment.secretCascadeNotice')}</p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 tabular-nums">{content.length}/{MAX_LENGTH}</span>
          {/* 이모지 버튼 */}
          <div
            className="relative"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="text-xs text-neutral-400 hover:text-neutral-600 px-2 py-0.5 rounded border border-neutral-200 hover:border-neutral-300 transition-colors"
            >
              이모지
            </button>
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {onCancel && !parentNickname && (
            <Button variant="ghost" size="sm" type="button" onClick={onCancel}>{t('common.cancel')}</Button>
          )}
          <Button variant="primary" size="sm" type="submit" isLoading={isPending} disabled={!content.trim()}>
            {editingComment ? t('comment.submitEdit') : parentId ? t('comment.submitReply') : t('comment.submit')}
          </Button>
        </div>
      </div>
    </form>
  )
}
