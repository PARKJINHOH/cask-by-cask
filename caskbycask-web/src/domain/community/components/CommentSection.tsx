import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useComments } from '../hooks/useComments'
import CommunityCommentItem from './CommunityCommentItem'
import CommunityCommentForm from './CommunityCommentForm'
import Pagination from '@/shared/components/Pagination'
import { useState, useEffect } from 'react'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useRequireLogin } from '@/domain/auth/hooks/useRequireLogin'

interface Props {
  postId: number
}

const SIZE = 30

export default function CommentSection({ postId }: Props) {
  const { t } = useTranslation()
  const requireLogin = useRequireLogin()
  const { isLoggedIn } = useAuthStore()
  const [page, setPage] = useState(0)
  const { toasts, showToast, removeToast } = useToast()

  const { data, isLoading } = useComments(postId, page, SIZE)
  const comments = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  // 관리자 신고 페이지 등에서 ?comment={id} 로 진입 시 해당 댓글로 스크롤 + 잠깐 강조
  const [searchParams] = useSearchParams()
  const targetCommentId = searchParams.get('comment')
  useEffect(() => {
    if (!targetCommentId || isLoading) return
    const el = document.getElementById(`comment-${targetCommentId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.style.transition = 'background-color 0.6s ease'
    el.style.backgroundColor = 'rgba(251, 191, 36, 0.18)' // amber-400/18%
    const timer = setTimeout(() => { el.style.backgroundColor = '' }, 2600)
    return () => clearTimeout(timer)
  }, [targetCommentId, isLoading, data])

  const handleBadWord = (words: string[]) => {
    showToast(`욕설이 포함되어 있습니다: ${words.join(', ')}`, 'error')
  }

  // 로그인 후 보던 글(그리고 갤러리라면 ?post= 모달까지)로 그대로 돌아온다.
  const handleLoginNeeded = () => {
    requireLogin()
  }

  return (
    <div>
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 댓글 입력 */}
      {isLoggedIn ? (
        <div className="mb-6">
          <CommunityCommentForm
            postId={postId}
            onSuccess={() => {}}
            onBadWord={handleBadWord}
          />
        </div>
      ) : (
        <div className="mb-6 py-4 text-center text-sm text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
          <button onClick={() => requireLogin()} className="text-primary-800 hover:underline">
            {t('post.loginToComment')}
          </button>
        </div>
      )}

      {/* 댓글 목록 */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-neutral-400">{t('common.loading')}</div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-sm text-neutral-400">{t('comment.noComment')}</div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {comments.map((comment) => (
            <CommunityCommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              isLoggedIn={isLoggedIn}
              onLoginNeeded={handleLoginNeeded}
              onBadWord={handleBadWord}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
