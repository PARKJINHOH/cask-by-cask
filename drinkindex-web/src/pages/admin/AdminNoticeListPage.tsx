import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAdminNoticeList, useDeleteNotice } from '@/domain/notice/hooks/useAdminNotices'
import { NOTICE_CATEGORY_LABELS } from '@/domain/notice/types/notice.types'
import type { NoticeCategory } from '@/domain/notice/types/notice.types'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import Pagination from '@/shared/components/Pagination'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'

const PAGE_SIZE = 20

const PUBLISHED_OPTIONS = [
  { label: '전체', value: undefined },
  { label: '발행', value: true },
  { label: '미발행', value: false },
] as const

export default function AdminNoticeListPage() {
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const [page, setPage] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState<NoticeCategory | undefined>()
  const [publishedFilter, setPublishedFilter] = useState<boolean | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null)

  const { data, isLoading } = useAdminNoticeList({
    category: categoryFilter,
    isPublished: publishedFilter,
    page,
    size: PAGE_SIZE,
  })

  const deleteMutation = useDeleteNotice()

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      showToast('공지사항이 삭제되었습니다.', 'success')
    } catch {
      showToast('삭제 중 오류가 발생했습니다.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const notices = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="p-8">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">공지 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            총 {data?.totalElements ?? 0}건
          </p>
        </div>
        <Button onClick={() => navigate('/admin/notices/new')}>
          + 공지 작성
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={categoryFilter ?? ''}
          onChange={(e) => {
            setCategoryFilter((e.target.value as NoticeCategory) || undefined)
            setPage(0)
          }}
          className="h-9 px-3 text-sm border border-neutral-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        >
          <option value="">카테고리 전체</option>
          {Object.entries(NOTICE_CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <div className="flex rounded-lg border border-neutral-300 overflow-hidden">
          {PUBLISHED_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                setPublishedFilter(opt.value)
                setPage(0)
              }}
              className={`h-9 px-4 text-sm font-medium transition-colors
                ${publishedFilter === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="text-left px-4 py-3 font-medium text-neutral-500 w-16">ID</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500">제목</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 w-24">카테고리</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 w-20">고정</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 w-20">발행</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 w-24">조회수</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 w-36">등록일</th>
              <th className="px-4 py-3 w-36" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-neutral-400">
                  불러오는 중...
                </td>
              </tr>
            ) : notices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-neutral-400">
                  공지사항이 없습니다.
                </td>
              </tr>
            ) : (
              notices.map((notice) => (
                <tr
                  key={notice.id}
                  className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-4 py-3 text-neutral-400">{notice.id}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/notices/${notice.id}`}
                      className="group/title inline-flex items-center gap-1.5 max-w-full font-medium
                        text-primary-700 hover:text-primary-900 hover:underline underline-offset-2
                        transition-colors"
                    >
                      {notice.isPinned && (
                        <span className="inline-block flex-shrink-0 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-semibold">
                          고정
                        </span>
                      )}
                      <span className="line-clamp-1">{notice.title}</span>
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover/title:opacity-100 transition-opacity text-primary-400"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {NOTICE_CATEGORY_LABELS[notice.category]}
                  </td>
                  <td className="px-4 py-3">
                    {notice.isPinned
                      ? <span className="text-amber-600 font-medium">Y</span>
                      : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {notice.isPublished
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">발행</span>
                      : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500">미발행</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{notice.viewCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-neutral-400 text-xs">
                    {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end flex-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/notices/${notice.id}/edit`)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
                          rounded-md border border-neutral-300 bg-white text-neutral-600
                          hover:bg-neutral-50 hover:border-neutral-400 transition-colors whitespace-nowrap"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: notice.id, title: notice.title })}
                        className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
                          rounded-md border border-red-200 bg-white text-red-600
                          hover:bg-red-50 hover:border-red-300 transition-colors whitespace-nowrap"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="공지사항 삭제"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={handleDelete}
            >
              삭제
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-700">
          <span className="font-medium">"{deleteTarget?.title}"</span> 공지사항을 삭제하시겠습니까?
          <br />
          <span className="text-neutral-500">삭제된 공지는 복구할 수 없습니다.</span>
        </p>
      </Modal>
    </div>
  )
}
