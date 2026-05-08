import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
              <th className="px-4 py-3 w-24" />
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
                    <span className="font-medium text-neutral-900 line-clamp-1">
                      {notice.isPinned && (
                        <span className="inline-block mr-1.5 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-semibold">
                          고정
                        </span>
                      )}
                      {notice.title}
                    </span>
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
                    <div className="flex items-center gap-1.5 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/notices/${notice.id}/edit`)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-600 hover:bg-danger-50"
                        onClick={() => setDeleteTarget({ id: notice.id, title: notice.title })}
                      >
                        삭제
                      </Button>
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
