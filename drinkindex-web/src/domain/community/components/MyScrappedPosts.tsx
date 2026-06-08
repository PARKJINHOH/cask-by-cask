import { useState } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Pagination from '@/shared/components/Pagination'
import AdultBadge from '@/shared/components/AdultBadge'
import { useMyScrappedPosts, useUnscrapPost } from '../hooks/usePosts'
import type { PostListItem } from '../types/community.types'

function boardPathOf(boardType: PostListItem['boardType']): string {
  return boardType === 'NOTICE' ? 'notice' : 'free'
}

export default function MyScrappedPosts() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useMyScrappedPosts(page, 20)
  const unscrapMutation = useUnscrapPost()

  const handleUnscrap = async (postId: number, title: string) => {
    if (!confirm(`'${title}' 게시글을 스크랩 해제할까요?`)) return
    await unscrapMutation.mutateAsync(postId)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="text-primary-800" />
      </div>
    )
  }

  if (!data || data.empty) {
    return (
      <EmptyState
        title="스크랩한 게시글이 없습니다"
        description="게시글 상세 페이지에서 책갈피 아이콘을 눌러 스크랩할 수 있어요."
      />
    )
  }

  return (
    <div className="space-y-4">
      <ul className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100 overflow-hidden">
        {data.content.map((post) => (
          <li key={post.id} className="relative group">
            <Link
              to={`/community/${boardPathOf(post.boardType)}/${post.id}`}
              className="block px-4 py-3 pr-12 hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-neutral-400">
                  {post.boardType === 'NOTICE' ? '소식' : '자유'}
                </span>
                {post.prefix && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full border"
                    style={post.prefix.colorHex
                      ? { color: post.prefix.colorHex, borderColor: post.prefix.colorHex }
                      : { color: '#6b7280', borderColor: '#d1d5db' }}
                  >
                    {post.prefix.name}
                  </span>
                )}
                {post.isLocked && <span className="text-neutral-400 text-sm">🔒</span>}
              </div>
              <p className={[
                'text-sm font-medium line-clamp-1',
                post.isLocked ? 'text-red-600' : 'text-neutral-800',
              ].join(' ')}>
                {post.adultOnly && <AdultBadge className="mr-1 align-middle" />}
                {post.title}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                <span className="truncate max-w-[8rem]">{post.authorNickname}</span>
                <span>▲ {post.likeCount}</span>
                <span>댓글 {post.commentCount}</span>
                <span>조회 {post.viewCount.toLocaleString()}</span>
                <span className="ml-auto">{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => handleUnscrap(post.id, post.title)}
              disabled={unscrapMutation.isPending}
              aria-label="스크랩 해제"
              title="스크랩 해제"
              className="absolute top-1/2 -translate-y-1/2 right-3 w-7 h-7 rounded-full
                bg-white border border-neutral-200 shadow-sm flex items-center justify-center
                text-neutral-400 hover:text-red-500 hover:border-red-300
                transition-colors opacity-0 group-hover:opacity-100
                disabled:opacity-40"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <Pagination
        currentPage={page}
        totalPages={data.totalPages}
        onPageChange={setPage}
        className="mt-4"
      />
    </div>
  )
}
