import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useCreateComment, useUpdateComment } from '../hooks/useComments'
import { communityApi } from '../api/communityApi'
import type { PostCommentItem, UserMention, CommunityEmoji } from '../types/community.types'
import Button from '@/shared/components/Button'
import EmojiPicker from './EmojiPicker'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import FormFieldLabel from '@/shared/components/FormFieldLabel'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

interface Props {
  postId: number
  parentId?: number
  parentNickname?: string
  replyMentionedUserId?: number
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
  replyMentionedUserId,
  editingComment,
  forcedSecret = false,
  onSuccess,
  onCancel,
  onBadWord,
}: Props) {
  const { t } = useTranslation()
  const [content, setContent] = useState(editingComment?.content ?? '')
  const [isSecret, setIsSecret] = useState(forcedSecret)
  const [selectedMention, setSelectedMention] = useState<{ id: number; nickname: string } | null>(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const createMutation = useCreateComment(postId)
  const updateMutation = useUpdateComment(postId)
  const isPending = createMutation.isPending || updateMutation.isPending

  // 부모/형제 대댓글이 비밀댓글이면 자동으로 비밀댓글 강제 적용
  useEffect(() => {
    if (forcedSecret) setIsSecret(true)
  }, [forcedSecret])

  const debouncedQuery = useDebouncedValue(mentionQuery)

  const { data: mentionUsers = [] } = useQuery({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: () => communityApi.searchUsers(debouncedQuery).then((r) => r.data.data ?? []),
    enabled: debouncedQuery.length > 0,
    staleTime: 10_000,
  })

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    if (selectedMention && !val.includes(`@${selectedMention.nickname}`)) {
      setSelectedMention(null)
    }

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
  }, [selectedMention])

  const selectMention = (user: UserMention) => {
    if (mentionStart === null || !textareaRef.current) return
    const cursor = textareaRef.current.selectionStart ?? content.length
    const before = content.slice(0, mentionStart)
    const after = content.slice(cursor)
    const inserted = `@${user.nickname} `
    setContent(before + inserted + after)
    setSelectedMention({ id: user.id, nickname: user.nickname })
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
        mentionedUserId: selectedMention?.id ?? replyMentionedUserId,
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
  }, [createMutation, parentId, selectedMention, replyMentionedUserId, isSecret, onSuccess, onBadWord, t])

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
          mentionedUserId: selectedMention?.id ?? replyMentionedUserId,
          isSecret,
        })
      }
      setContent('')
      setSelectedMention(null)
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
        <FormFieldLabel required className="mb-1.5">{t('comment.contentLabel')}</FormFieldLabel>
        <AutoGrowTextarea
          ref={textareaRef}
          required
          aria-required="true"
          value={content}
          onChange={handleChange}
          maxLength={MAX_LENGTH}
          rows={editingComment ? 3 : 2}
          placeholder={t('comment.placeholder')}
          className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-xl min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent placeholder:text-neutral-400 transition-shadow"
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
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium
                text-neutral-500 hover:bg-primary-50 hover:text-primary-700 active:scale-95 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
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
