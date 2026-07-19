import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/shared/components/Button'
import { useCreateComment, useUpdateComment } from '../hooks/useComments'
import type { CommentItem } from '../types/comment.types'
import FormFieldLabel from '@/shared/components/FormFieldLabel'

export interface CommentFormProps {
  spiritId: number
  parentId?: number
  parentNickname?: string
  editingComment?: CommentItem
  placeholder?: string
  onSuccess: () => void
  onCancel?: () => void
}

export default function CommentForm({
  spiritId,
  parentId,
  parentNickname,
  editingComment,
  placeholder,
  onSuccess,
  onCancel,
}: CommentFormProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('comment.placeholder')
  const [content, setContent] = useState(editingComment?.content ?? '')
  const [error, setError]     = useState('')

  const createMutation = useCreateComment(spiritId)
  const updateMutation = useUpdateComment(spiritId)
  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setError('')
    try {
      if (editingComment) {
        await updateMutation.mutateAsync({ commentId: editingComment.id, data: { content } })
      } else {
        await createMutation.mutateAsync({ content, parentId })
      }
      setContent('')
      onSuccess()
    } catch {
      setError(t('comment.saveError'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Reply-to indicator */}
      {parentNickname && !editingComment && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg">
          <span className="text-primary-400 text-sm">↩</span>
          <span className="text-sm text-primary-900 font-medium flex-1">
            {t('comment.replyTo', { nickname: parentNickname })}
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label={t('comment.cancelReplyAria')}
              className="text-primary-300 hover:text-primary-800 transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <FormFieldLabel required className="mb-1.5">{t('comment.contentLabel')}</FormFieldLabel>
      <textarea
        required
        aria-required="true"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={1000}
        rows={editingComment ? 3 : 2}
        placeholder={resolvedPlaceholder}
        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none
          focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
          placeholder:text-neutral-400"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400 tabular-nums">{content.length}/1000</span>
        <div className="flex gap-2">
          {onCancel && !parentNickname && (
            <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
              {t('comment.cancel')}
            </Button>
          )}
          <Button size="sm" type="submit" isLoading={isPending} disabled={!content.trim()}>
            {editingComment ? t('comment.submitEdit') : parentId ? t('comment.submitReply') : t('comment.submit')}
          </Button>
        </div>
      </div>
    </form>
  )
}
