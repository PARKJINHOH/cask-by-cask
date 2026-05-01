import { useState } from 'react'
import { useAuthStore } from '@/domain/auth/store/authStore'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Pagination from '@/shared/components/Pagination'
import CommentItem from './CommentItem'
import CommentForm from './CommentForm'
import { useComments } from '../hooks/useComments'

interface CommentListProps {
  spiritId: number
  onNeedLogin: () => void
}

export default function CommentList({ spiritId, onNeedLogin }: CommentListProps) {
  const user = useAuthStore((s) => s.user)
  const [page, setPage]             = useState(0)
  const [replyingToId, setReplyingToId] = useState<number | null>(null)

  const { data, isLoading } = useComments(spiritId, page)

  const handleGuestClick = () => { onNeedLogin() }

  return (
    <div className="space-y-4">
      {/* New comment form for logged-in users */}
      {user ? (
        <div className="bg-neutral-50 rounded-xl p-4">
          <CommentForm
            spiritId={spiritId}
            placeholder="이 술에 대한 이야기를 나눠보세요..."
            onSuccess={() => setPage(0)}
          />
        </div>
      ) : (
        <button
          onClick={handleGuestClick}
          className="w-full py-3 border border-dashed border-neutral-300 rounded-xl
            text-sm text-neutral-400 hover:text-primary-600 hover:border-primary-300 transition-colors"
        >
          로그인하고 댓글을 남겨보세요 →
        </button>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-primary-600" />
        </div>
      ) : !data || data.empty ? (
        <EmptyState title="아직 댓글이 없습니다." description="첫 번째 댓글을 남겨보세요!" />
      ) : (
        <>
          <div className="divide-y divide-neutral-50">
            {data.content.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                spiritId={spiritId}
                currentUserId={user?.id}
                replyingToId={replyingToId}
                onReplyToggle={(id) => {
                  if (!user) { onNeedLogin(); return }
                  setReplyingToId(id)
                }}
                onNeedLogin={onNeedLogin}
              />
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={data.totalPages}
            onPageChange={(p) => { setPage(p); setReplyingToId(null) }}
            className="mt-4"
          />
        </>
      )}
    </div>
  )
}
