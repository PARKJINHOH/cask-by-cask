import { useState } from 'react'
import { formatDate } from '@/shared/utils/format'
import CommentForm from './CommentForm'
import { useToggleLike, useDeleteComment } from '../hooks/useComments'
import type { CommentItem as CommentItemType } from '../types/comment.types'

export interface CommentItemProps {
  comment: CommentItemType
  spiritId: number
  currentUserId?: number
  depth?: number
  replyingToId: number | null
  onReplyToggle: (id: number | null) => void
  onNeedLogin: () => void
}

export default function CommentItem({
  comment,
  spiritId,
  currentUserId,
  depth = 0,
  replyingToId,
  onReplyToggle,
  onNeedLogin,
}: CommentItemProps) {
  const [editMode, setEditMode]         = useState(false)
  const [localLikes, setLocalLikes]     = useState(comment.likeCount)
  const isOwner = !!currentUserId && currentUserId === comment.userId
  const isReplying = replyingToId === comment.id

  const toggleLikeMutation = useToggleLike(spiritId)
  const deleteMutation     = useDeleteComment(spiritId)

  const handleLike = async () => {
    if (!currentUserId) { onNeedLogin(); return }
    const prev = localLikes
    setLocalLikes((v) => (v === comment.likeCount ? v + 1 : comment.likeCount))
    try {
      await toggleLikeMutation.mutateAsync(comment.id)
    } catch {
      setLocalLikes(prev)
    }
  }

  const handleDelete = async () => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    await deleteMutation.mutateAsync(comment.id)
  }

  return (
    <div className={depth > 0 ? 'pl-6 border-l-2 border-neutral-100' : ''}>
      {editMode ? (
        <div className="py-2">
          <CommentForm
            spiritId={spiritId}
            editingComment={comment}
            onSuccess={() => setEditMode(false)}
            onCancel={() => setEditMode(false)}
          />
        </div>
      ) : (
        <div className="py-3">
          {/* Author row */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-900">{comment.nickname}</span>
              <span className="text-xs text-neutral-400">{formatDate(comment.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-xs text-danger-400 hover:text-danger-600 transition-colors"
                  >
                    삭제
                  </button>
                </>
              )}
              {depth === 0 && (
                <button
                  onClick={() => onReplyToggle(isReplying ? null : comment.id)}
                  className={`text-xs transition-colors ${
                    isReplying
                      ? 'text-primary-600'
                      : 'text-neutral-400 hover:text-primary-600'
                  }`}
                >
                  {isReplying ? '취소' : '답글'}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-line">
            {comment.content}
          </p>

          {/* Like */}
          <button
            onClick={handleLike}
            aria-label={`좋아요 ${localLikes}개`}
            className="mt-1.5 flex items-center gap-1 text-xs text-neutral-400
              hover:text-rose-500 transition-colors"
          >
            <span>♥</span>
            <span>{localLikes}</span>
          </button>
        </div>
      )}

      {/* Reply form (inline, shown when this comment is "replying to") */}
      {isReplying && depth === 0 && (
        <div className="mb-3">
          <CommentForm
            spiritId={spiritId}
            parentId={comment.id}
            placeholder={`${comment.nickname}에게 답글...`}
            onSuccess={() => onReplyToggle(null)}
            onCancel={() => onReplyToggle(null)}
          />
        </div>
      )}

      {/* Children */}
      {comment.children && comment.children.length > 0 && (
        <div className="ml-4 space-y-0">
          {comment.children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              spiritId={spiritId}
              currentUserId={currentUserId}
              depth={1}
              replyingToId={null}
              onReplyToggle={() => {}}
              onNeedLogin={onNeedLogin}
            />
          ))}
        </div>
      )}
    </div>
  )
}
