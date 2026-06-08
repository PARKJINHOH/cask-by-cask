import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useByobComments, useByobActions } from '../hooks/useByob'
import type { ByobComment } from '../types/byob.types'
import DefaultAvatar from '@/shared/components/DefaultAvatar'

interface CommentItemProps {
  comment: ByobComment
  myUserId: number
  hostUserId: number
  onReply: (parentId: number) => void
  onDelete: (cid: number) => void
}

function CommentItem({ comment, myUserId, hostUserId, onReply, onDelete }: CommentItemProps) {
  const isOwner = comment.authorUserId === myUserId

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
          <DefaultAvatar seed={String(comment.authorUserId)} px={16} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-neutral-800">{comment.authorNickname}</span>
            {comment.authorUserId === hostUserId && (
              <span className="text-xs bg-primary-100 text-primary-800 px-1.5 py-0.5 rounded font-medium">
                주최자
              </span>
            )}
            <span className="text-xs text-neutral-400">
              {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{comment.content}</p>
          <div className="flex gap-3 mt-1">
            {comment.parentId === null && (
              <button
                onClick={() => onReply(comment.id)}
                className="text-xs text-primary-600 hover:text-primary-800"
              >
                답글
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-neutral-400 hover:text-red-500"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {comment.replies?.map((reply) => (
        <div key={reply.id} className="ml-9 flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
            <DefaultAvatar seed={String(reply.authorUserId)} px={14} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-medium text-neutral-800">{reply.authorNickname}</span>
              {reply.authorUserId === hostUserId && (
                <span className="text-xs bg-primary-100 text-primary-800 px-1.5 py-0.5 rounded font-medium">
                  주최자
                </span>
              )}
              <span className="text-xs text-neutral-400">
                {new Date(reply.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{reply.content}</p>
            {reply.authorUserId === myUserId && (
              <button
                onClick={() => onDelete(reply.id)}
                className="text-xs text-neutral-400 hover:text-red-500 mt-1"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

interface Props {
  byobId: number
  myUserId: number
  hostUserId: number
  isHost: boolean
  hasAccess: boolean
}

export default function ByobCommentSection({ byobId, myUserId, hostUserId, isHost, hasAccess }: Props) {
  const { t } = useTranslation()
  const { data: comments = [] } = useByobComments(byobId, hasAccess)
  const { createCommentMutation, deleteCommentMutation } = useByobActions(byobId)
  const [content, setContent] = useState('')
  const [replyParentId, setReplyParentId] = useState<number | null>(null)

  if (!hasAccess) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    await createCommentMutation.mutateAsync({
      content: content.trim(),
      parentId: replyParentId ?? undefined,
    })
    setContent('')
    setReplyParentId(null)
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <h3 className="text-base font-semibold text-neutral-900 mb-4">{t('byob.commentsPublic')}</h3>

      {comments.length === 0 ? (
        <p className="text-sm text-neutral-400 mb-4">{t('byob.noComment')}</p>
      ) : (
        <div className="space-y-4 mb-5">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              myUserId={myUserId}
              hostUserId={hostUserId}
              onReply={(parentId) => setReplyParentId(parentId)}
              onDelete={(cid) => deleteCommentMutation.mutate(cid)}
            />
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        {replyParentId !== null && (
          <div className="flex items-center gap-2 text-xs text-primary-700 bg-primary-50
            px-3 py-1.5 rounded-lg">
            <span>답글 작성 중</span>
            <button type="button" onClick={() => setReplyParentId(null)} className="ml-auto text-neutral-400">
              ✕
            </button>
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 200))}
          rows={3}
          placeholder={isHost ? t('byob.hostCommentPlaceholder') : t('byob.commentPlaceholder')}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400">{content.length}/200</span>
          <button
            type="submit"
            disabled={!content.trim() || createCommentMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-800 text-white
              hover:bg-primary-900 disabled:opacity-50 transition-colors"
          >
            {t('common.submit')}
          </button>
        </div>
      </form>
    </div>
  )
}
