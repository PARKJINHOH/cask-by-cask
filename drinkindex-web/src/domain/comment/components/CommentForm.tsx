import { useState } from 'react'
import Button from '@/shared/components/Button'
import { useCreateComment, useUpdateComment } from '../hooks/useComments'
import type { CommentItem } from '../types/comment.types'

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
  placeholder = '댓글을 입력하세요...',
  onSuccess,
  onCancel,
}: CommentFormProps) {
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
      setError('저장 중 오류가 발생했습니다.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Reply-to indicator */}
      {parentNickname && !editingComment && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg">
          <span className="text-primary-400 text-sm">↩</span>
          <span className="text-sm text-primary-700 font-medium flex-1">
            @ {parentNickname}에게 답글
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="답글 취소"
              className="text-primary-300 hover:text-primary-600 transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={1000}
        rows={editingComment ? 3 : 2}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg resize-none
          focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
          placeholder:text-neutral-400"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400 tabular-nums">{content.length}/1000</span>
        <div className="flex gap-2">
          {onCancel && !parentNickname && (
            <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
              취소
            </Button>
          )}
          <Button size="sm" type="submit" isLoading={isPending} disabled={!content.trim()}>
            {editingComment ? '수정' : parentId ? '답글 등록' : '댓글 등록'}
          </Button>
        </div>
      </div>
    </form>
  )
}
