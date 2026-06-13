import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteComment, useReportComment } from '../hooks/useComments'
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
      return <span key={i} className="text-primary-800 font-medium">{part}</span>
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
  // 본인 또는 형제 대댓글이 비밀댓글이면 이후 답글도 강제로 비밀댓글
  const forcedSecret = comment.isSecret || comment.children.some((c) => c.isSecret)
  const [isReplying, setIsReplying] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDone, setReportDone] = useState(false)
  const deleteMutation = useDeleteComment(postId)
  const reportMutation = useReportComment(postId)

  const handleDelete = async () => {
    if (!window.confirm(t('comment.deleteConfirm'))) return
    deleteMutation.mutate(comment.id)
  }

  const closeReport = () => {
    setShowReport(false)
    setReportReason('')
    setReportDone(false)
    reportMutation.reset()
  }

  const handleReport = async () => {
    try {
      await reportMutation.mutateAsync({ commentId: comment.id, reason: reportReason.trim() || undefined })
      setReportDone(true)
    } catch {
      // 폼 유지 — 사용자가 재시도 가능
    }
  }

  const reportErrorMsg =
    (reportMutation.error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message
    ?? t('comment.reportError')

  return (
    <div id={`comment-${comment.id}`} className={depth > 0 ? 'pl-5 border-l-2 border-neutral-100 ml-2' : ''}>
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
      ) : comment.isHidden ? (
        <div className="py-3">
          <p className="text-xs text-neutral-400 italic flex items-center gap-1">
            <span aria-hidden="true">🚫</span>{t('comment.hiddenPlaceholder')}
          </p>
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
      ) : comment.isSecretMasked ? (
        <div className="py-3">
          <p className="text-xs text-neutral-400 italic flex items-center gap-1">
            <span aria-hidden="true">🔒</span>{t('comment.secretPlaceholder')}
          </p>
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
                user={{ id: comment.authorId ?? undefined, nickname: comment.authorNickname ?? t('board.anonymous'), role: comment.authorRole as UserRole, currentLevel: comment.authorLevel, maturingPower: comment.authorMaturingPower ?? undefined, nicknameFixed: comment.authorNicknameFixed, profileImageUrl: comment.authorProfileImageUrl }}
                size="sm"
                levelIconSize={18}
                nameClassName="text-sm"
              />
            ) : (
              <span className="text-xs font-semibold text-neutral-700">
                {comment.authorNickname ?? t('board.anonymous')}
              </span>
            )}
            <span className="text-xs text-neutral-400">
              {new Date(comment.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
            {comment.isSecret && (
              <span className="inline-flex items-center gap-0.5 text-[10px] leading-none px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
                <span aria-hidden="true">🔒</span>{t('comment.secretBadge')}
              </span>
            )}
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

          {/* 액션 버튼 — 한 줄 우측 정렬 */}
          <div className="flex items-center justify-end gap-1 mt-2">
            {isLoggedIn && depth === 0 && (
              <button
                type="button"
                onClick={() => setIsReplying((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium
                  text-neutral-500 hover:bg-primary-50 hover:text-primary-700 active:scale-95 transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </svg>
                {t('comment.reply')}
              </button>
            )}
            {comment.isMyComment && !emojiComment && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium
                  text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 active:scale-95 transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                {t('common.edit')}
              </button>
            )}
            {comment.isMyComment && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium
                  text-neutral-500 hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {t('common.delete')}
              </button>
            )}
            {!comment.isMyComment && isLoggedIn && (
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium
                  text-neutral-400 hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                {t('comment.report')}
              </button>
            )}
          </div>

          {/* 답글 폼 */}
          {isReplying && (
            <div className="mt-3 pl-3 border-l-2 border-primary-200">
              <CommunityCommentForm
                postId={postId}
                parentId={comment.id}
                parentNickname={comment.authorNickname ?? undefined}
                forcedSecret={forcedSecret}
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={closeReport}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            {reportDone ? (
              <>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <span aria-hidden="true" className="text-red-500">⚑</span>{t('comment.report')}
                </h3>
                <p className="text-xs text-neutral-500 mb-4">{t('comment.reportSuccess')}</p>
                <button onClick={closeReport} className="w-full py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                  {t('common.close')}
                </button>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold mb-3">{t('comment.reportTitle')}</h3>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder={t('comment.reportPlaceholder')}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg resize-none
                    focus:outline-none focus:ring-1 focus:ring-red-400 mb-2"
                />
                {reportMutation.isError && (
                  <p className="text-xs text-red-600 mb-2">{reportErrorMsg}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={closeReport}
                    className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
                  >
                    {t('comment.cancel')}
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={reportMutation.isPending}
                    className="flex-1 py-2 text-sm font-medium rounded-lg bg-red-600 text-white
                      hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {reportMutation.isPending ? t('comment.reporting') : t('comment.reportSubmit')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 대댓글 (삭제·마스킹된 댓글은 각 블록 내부에서 렌더링) */}
      {!comment.isDeleted && !comment.isSecretMasked && comment.children.length > 0 && (
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
