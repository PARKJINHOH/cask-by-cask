import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useNotices } from '@/domain/notice/hooks/useNotices'
import { NOTICE_CATEGORY_LABELS } from '@/domain/notice/types/notice.types'
import type { NoticeCategory } from '@/domain/notice/types/notice.types'
import Pagination from '@/shared/components/Pagination'
import RecommendBadge from '@/shared/components/RecommendBadge'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'

const PAGE_SIZE = 20

// 카테고리 사각형 칩 색상 (모서리 살짝 둥글게 · 중앙 정렬)
const CATEGORY_CHIP_CLASS: Record<NoticeCategory, string> = {
  GENERAL: 'bg-neutral-100 text-neutral-600',
  UPDATE: 'bg-blue-50 text-blue-700',
  EVENT: 'bg-green-50 text-green-700',
  MAINTENANCE: 'bg-orange-50 text-orange-700',
}

function CategoryChip({ category }: { category: NoticeCategory }) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center min-w-[68px] px-2.5 py-1 rounded-md',
        'text-xs font-medium text-center whitespace-nowrap',
        CATEGORY_CHIP_CLASS[category],
      ].join(' ')}
    >
      {NOTICE_CATEGORY_LABELS[category]}
    </span>
  )
}

const CATEGORY_TABS: { key: NoticeCategory | ''; label: string }[] = [
  { key: '', label: '전체' },
  { key: 'GENERAL', label: NOTICE_CATEGORY_LABELS.GENERAL },
  { key: 'UPDATE', label: NOTICE_CATEGORY_LABELS.UPDATE },
  { key: 'EVENT', label: NOTICE_CATEGORY_LABELS.EVENT },
  { key: 'MAINTENANCE', label: NOTICE_CATEGORY_LABELS.MAINTENANCE },
]

// localStorage 미확인 공지 갱신
const SEEN_KEY = 'notice:lastSeenId'
export function markNoticesAsSeen(latestId: number) {
  localStorage.setItem(SEEN_KEY, String(latestId))
}

export default function NoticePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryParam = (searchParams.get('category') ?? '') as NoticeCategory | ''
  const [page, setPage] = useState(0)

  // 카테고리 변경 시 페이지 초기화
  const setCategory = (cat: NoticeCategory | '') => {
    const next = new URLSearchParams(searchParams)
    if (cat) next.set('category', cat)
    else next.delete('category')
    setSearchParams(next, { replace: true })
    setPage(0)
  }

  const { data, isLoading } = useNotices({
    category: categoryParam || undefined,
    page,
    size: PAGE_SIZE,
  })

  const notices = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  // 페이지 진입 시 최신 공지 id를 localStorage에 기록
  useEffect(() => {
    if (notices.length > 0) {
      const maxId = Math.max(...notices.map((n) => n.id))
      markNoticesAsSeen(maxId)
    }
  }, [notices])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SeoMeta
        title="공지사항"
        description="CaskByCask의 새로운 소식, 업데이트, 이벤트, 점검 안내 등 공지사항을 확인하세요."
        canonical={buildCanonical('/notices')}
        keywords="CaskByCask 공지사항, 위스키 커뮤니티 소식, 업데이트, 이벤트"
      />

      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">공지사항</h1>
        <p className="text-sm text-neutral-500 mt-1">CaskByCask의 새로운 소식을 확인하세요.</p>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1 border-b border-neutral-200 mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {CATEGORY_TABS.map((tab) => {
          const isActive = categoryParam === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategory(tab.key)}
              className={[
                'flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                'border-b-2 -mb-px',
                isActive
                  ? 'border-primary-800 text-primary-800'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="py-20 text-center text-neutral-400 text-sm">불러오는 중...</div>
      ) : notices.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-neutral-400 text-sm">공지사항이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* PC 테이블 */}
          <div className="hidden sm:block bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="text-center px-5 py-3 font-medium text-neutral-500 w-20">추천</th>
                  <th className="text-center px-5 py-3 font-medium text-neutral-500 w-36">카테고리</th>
                  <th className="text-center px-5 py-3 font-medium text-neutral-500">제목</th>
                  <th className="text-center px-5 py-3 font-medium text-neutral-500 w-28">작성일</th>
                  <th className="text-center px-5 py-3 font-medium text-neutral-500 w-20">조회수</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((notice) => (
                  <tr
                    key={notice.id}
                    className={[
                      'border-b border-neutral-50 transition-colors',
                      notice.isPinned
                        ? 'bg-amber-50 hover:bg-amber-100/70'
                        : 'hover:bg-neutral-50',
                    ].join(' ')}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center">
                        <RecommendBadge count={notice.recommendCount} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center">
                        <CategoryChip category={notice.category} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/notices/${notice.id}`}
                        className="flex items-center gap-2 group"
                      >
                        <span className="font-medium text-neutral-800 group-hover:text-primary-800 transition-colors truncate">
                          {notice.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-center text-neutral-400 text-xs">
                      {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-5 py-3.5 text-center text-neutral-400 text-xs">
                      {notice.viewCount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="sm:hidden space-y-2">
            {notices.map((notice) => (
              <Link
                key={notice.id}
                to={`/notices/${notice.id}`}
                className={[
                  'block rounded-xl border px-4 py-3.5 transition-colors',
                  notice.isPinned
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-white border-neutral-200 hover:border-neutral-300',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <CategoryChip category={notice.category} />
                  <RecommendBadge count={notice.recommendCount} />
                </div>
                <p className="text-sm font-medium text-neutral-800 line-clamp-2">{notice.title}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-400">
                  <span>{new Date(notice.createdAt).toLocaleDateString('ko-KR')}</span>
                  <span>조회 {notice.viewCount.toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
