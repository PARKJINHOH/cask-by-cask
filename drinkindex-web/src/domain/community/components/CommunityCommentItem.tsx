import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteComment } from '../hooks/useComments'
import type { PostCommentItem } from '../types/community.types'
import type { UserRole } from '@/domain/auth/types/auth.types'
import UserBadge from '@/shared/components/UserBadge'
import EmojiReactionBar from './EmojiReactionBar'
import CommunityCommentForm from './CommunityCommentForm'

interface Props {
  comment: PostCommentItem
  postId: number
  isLoggedIn: boolean
  depth?: number
  onLoginNeeded: () => void
  onBadWord: (words: string[]) => void
}

function renderContent(content: string) {
  const parts = content.split(/(@[\w가-힣]+|\[emoji-img:[^\]]+\])/g)
  return parts.map((part, i) => {
    if (/^@[\w가-힣]+/.test(part))
      return <span key={i} className="text-primary-600 font-medium">{part}</span>
    const imgMatch = part.match(/^\[emoji-img:(.+)\]$/)
    if (imgMatch)
      return <img key={i} src={imgMatch[1]} alt="이모지" className="inline-block h-12 w-auto align-middle" />
    return <span key={i}>{part}</span>
  })
}

function isEmojiOnly(content: string) {
  return /^\[emoji-img:.+\]$/.test(content.trim())
}

export default function CommunityCommentItem({ comment, postId, isLoggedIn, depth = 0, onLoginNeeded, onBadWord }: Props) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const emojiComment = isEmojiOnly(comment.content)
  const [isReplying, setIsReplying] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const deleteMutation = useDeleteComment(postId)

  const handleDelete = async () => {
    if (!window.confirm(t('comment.deleteConfirm'))) return
    deleteMutation.mutate(comment.id)
  }

  return (
    <div className={depth > 0 ? 'pl-5 border-l-2 border-neutral-100 ml-2' : ''}>
      {/* 삭제된 댓글 */}
      {comment.isDeleted ? (
        <div className="py-3">
          <p className="text-xs text-neutral-400 italic">삭제된 댓글입니다.</p>
          {comment.children.length > 0 && (
            <div className="mt-1 space-y-0">
              {comment.children.map((child) => (
                <CommunityCommentItem
                  key={child.id}
                  comment={child}
                  postId={postId}
                  isLoggedIn={isLoggedIn}
                  depth={depth + 1}
                  onLoginNeeded={onLoginNeeded}
                  onBadWord={onBadWord}
                />
              ))}
            </div>
          )}
        </div>
      ) : isEditing ? (
        <div className="py-2">
          <CommunityCommentForm
            postId={postId}
            editingComment={comment}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
            onBadWord={onBadWord}
          />
        </div>
      ) : (
        <div className="py-3">
          {/* 헤더 */}
          <div className="flex items-center gap-2 mb-1">
            {comment.authorRole ? (
              <UserBadge
                user={{ nickname: comment.authorNickname ?? t('board.anonymous'), role: comment.authorRole as UserRole, currentLevel: comment.authorLevel, maturingPower: comment.authorMaturingPower ?? undefined, nicknameFixed: comment.authorNicknameFixed }}
                size="sm"
              />
            ) : (
              <span className="text-xs font-semibold text-neutral-700">
                {comment.authorNickname ?? t('board.anonymous')}
              </span>
            )}
            <span className="text-xs text-neutral-400">
              {new Date(comment.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* 본문 */}
          <p className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
            {renderContent(comment.content)}
          </p>

          {/* 이모지 반응 */}
          <EmojiReactionBar
            commentId={comment.id}
            postId={postId}
            reactions={comment.emojiReactions}
            isLoggedIn={isLoggedIn}
            onLoginNeeded={onLoginNeeded}
          />

          {/* 액션 버튼 */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              {comment.isMyComment && (
                <>
                  {!emojiComment && (
                    <button type="button" onClick={() => setIsEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                      {t('common.edit')}
                    </button>
                  )}
                  <button type="button" onClick={handleDelete} className="text-xs text-neutral-400 hover:text-red-500 transition-colors">
                    {t('common.delete')}
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isLoggedIn && depth === 0 && (
                <button
                  type="button"
                  onClick={() => setIsReplying((v) => !v)}
                  className="text-xs text-neutral-400 hover:text-primary-600 transition-colors"
                >
                  {t('comment.reply')}
                </button>
              )}
              {!comment.isMyComment && isLoggedIn && (
                <button
                  type="button"
                  onClick={() => setShowReport(true)}
                  className="text-xs text-neutral-400 hover:text-red-500 transition-colors"
                >
                  {t('comment.report')}
                </button>
              )}
            </div>
          </div>

          {/* 답글 폼 */}
          {isReplying && (
            <div className="mt-3 pl-3 border-l-2 border-primary-200">
              <CommunityCommentForm
                postId={postId}
                parentId={comment.id}
                parentNickname={comment.authorNickname ?? undefined}
                onSuccess={() => setIsReplying(false)}
                onCancel={() => setIsReplying(false)}
                onBadWord={onBadWord}
              />
            </div>
          )}
        </div>
      )}

      {/* 신고 미니 모달 */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold mb-3">{t('comment.reportTitle')}</h3>
            <p className="text-xs text-neutral-500 mb-4">신고 기능은 준비 중입니다.</p>
            <button onClick={() => setShowReport(false)} className="w-full py-2 text-sm border border-neutral-200 rounded-lg">
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* 대댓글 (삭제된 댓글은 isDeleted 블록 내부에서 렌더링) */}
      {!comment.isDeleted && comment.children.length > 0 && (
        <div className="space-y-0 mt-1">
          {comment.children.map((child) => (
            <CommunityCommentItem
              key={child.id}
              comment={child}
              postId={postId}
              isLoggedIn={isLoggedIn}
              depth={depth + 1}
              onLoginNeeded={onLoginNeeded}
              onBadWord={onBadWord}
            />
          ))}
        </div>
      )}
    </div>
  )
}
