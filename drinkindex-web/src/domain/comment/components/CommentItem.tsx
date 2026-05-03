import { useState } from 'react'
import { formatDate } from '@/shared/utils/format'
import CommentForm from './CommentForm'
import { useToggleLike, useDeleteComment } from '../hooks/useComments'
import { useCreateReport } from '@/domain/report/hooks/useReport'
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
  const [editMode, setEditMode]       = useState(false)
  const [isLiked, setIsLiked]         = useState(false)
  const [localLikes, setLocalLikes]   = useState(comment.likeCount)
  const [reportOpen, setReportOpen]   = useState(false)
  const [reportReason, setReportReason] = useState('')

  const isOwner  = !!currentUserId && currentUserId === comment.userId
  const isReplying = replyingToId === comment.id

  const toggleLikeMutation = useToggleLike(spiritId)
  const deleteMutation     = useDeleteComment(spiritId)
  const reportMutation     = useCreateReport()

  const handleLike = async () => {
    if (!currentUserId) { onNeedLogin(); return }
    const newIsLiked = !isLiked
    setIsLiked(newIsLiked)
    setLocalLikes((v) => (newIsLiked ? v + 1 : Math.max(0, v - 1)))
    try {
      await toggleLikeMutation.mutateAsync(comment.id)
    } catch {
      setIsLiked(!newIsLiked)
      setLocalLikes((v) => (newIsLiked ? Math.max(0, v - 1) : v + 1))
    }
  }

  const handleDelete = async () => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    await deleteMutation.mutateAsync(comment.id)
  }

  const handleReport = async () => {
    try {
      await reportMutation.mutateAsync({
        targetType: 'COMMENT',
        targetId: comment.id,
        reason: reportReason.trim() || undefined,
      })
      setReportOpen(false)
      setReportReason('')
    } catch {
      // keep the form open so the user can retry
    }
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
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    삭제
                  </button>
                </>
              )}
              {depth === 0 && (
                <button
                  onClick={() => {
                    if (!currentUserId) { onNeedLogin(); return }
                    onReplyToggle(isReplying ? null : comment.id)
                  }}
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

          {/* Like + Report row */}
          <div className="mt-1.5 flex items-center gap-3">
            <button
              onClick={handleLike}
              aria-label={`좋아요 ${localLikes}개`}
              className={`flex items-center gap-1 text-xs transition-colors ${
                isLiked ? 'text-rose-500' : 'text-neutral-400 hover:text-rose-500'
              }`}
            >
              <span>{isLiked ? '♥' : '♡'}</span>
              <span className="tabular-nums">{localLikes}</span>
            </button>

            {!isOwner && currentUserId && !reportOpen && (
              <button
                onClick={() => setReportOpen(true)}
                className="text-xs text-neutral-300 hover:text-red-400 transition-colors"
              >
                신고
              </button>
            )}
          </div>

          {/* Inline report form */}
          {!isOwner && currentUserId && reportOpen && (
            <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg space-y-2">
              <p className="text-xs font-medium text-red-700">신고 이유 (선택사항)</p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="신고 이유를 입력해주세요..."
                className="w-full px-2 py-1.5 text-xs border border-red-200 rounded-lg resize-none
                  focus:outline-none focus:ring-1 focus:ring-red-400 bg-white"
              />
              {reportMutation.isError && (
                <p className="text-xs text-red-600">오류가 발생했습니다. 다시 시도해주세요.</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setReportOpen(false); setReportReason('') }}
                  className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={reportMutation.isPending}
                  className="text-xs font-medium text-red-600 hover:text-red-800
                    transition-colors disabled:opacity-50"
                >
                  {reportMutation.isPending ? '신고 중...' : '신고하기'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reply form */}
      {isReplying && depth === 0 && (
        <div className="mb-3">
          <CommentForm
            spiritId={spiritId}
            parentId={comment.id}
            parentNickname={comment.nickname}
            onSuccess={() => onReplyToggle(null)}
            onCancel={() => onReplyToggle(null)}
          />
        </div>
      )}

      {/* Children */}
      {comment.children && comment.children.length > 0 && (
        <div className="ml-4">
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
