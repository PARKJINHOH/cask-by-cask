import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminNoticeDetail, useDeleteNotice } from '@/domain/notice/hooks/useAdminNotices'
import { NOTICE_CATEGORY_LABELS } from '@/domain/notice/types/notice.types'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import Modal from '@/shared/components/Modal'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

const CATEGORY_BADGE_VARIANT: Record<string, 'primary' | 'warning' | 'success' | 'neutral'> = {
  GENERAL: 'neutral',
  UPDATE: 'primary',
  EVENT: 'success',
  MAINTENANCE: 'warning',
}

export default function AdminNoticePreviewPage() {
  const { id } = useParams<{ id: string }>()
  const noticeId = id ? Number(id) : null
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: notice, isLoading, isError } = useAdminNoticeDetail(noticeId)
  const deleteMutation = useDeleteNotice()

  const handleDelete = async () => {
    if (!noticeId) return
    try {
      await deleteMutation.mutateAsync(noticeId)
      showToast('공지사항이 삭제되었습니다.', 'success')
      setTimeout(() => navigate('/admin/notices'), 800)
    } catch {
      showToast('삭제 중 오류가 발생했습니다.', 'error')
    } finally {
      setDeleteOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-neutral-400 text-sm">불러오는 중...</div>
      </div>
    )
  }

  if (isError || !notice) {
    return (
      <div className="p-8 text-center">
        <p className="text-neutral-500 text-sm mb-4">공지사항을 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate('/admin/notices')}
          className="text-sm text-primary-800 hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 헤더 */}
      <AdminPageHeader
        breadcrumbs={[
          { label: '공지사항', to: '/admin/notices' },
          { label: '미리보기' },
        ]}
        backTo="/admin/notices"
        backLabel="공지 목록"
        title="공지 미리보기"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/admin/notices/${noticeId}/edit`)}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              수정
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setDeleteOpen(true)}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              삭제
            </Button>
          </>
        }
      />

      {/* 관리자 상태 표시 */}
      <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-500">
        <span className="font-medium text-neutral-600">관리자 미리보기</span>
        <span className="text-neutral-300">|</span>
        {notice.isPublished
          ? <span className="inline-flex items-center gap-1 text-green-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              노출 중
            </span>
          : <span className="inline-flex items-center gap-1 text-neutral-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 inline-block" />
              미노출
            </span>
        }
        {notice.isPinned && (
          <>
            <span className="text-neutral-300">|</span>
            <span className="text-amber-600 font-medium">📌 상단 고정</span>
          </>
        )}
        <span className="text-neutral-300">|</span>
        <span>조회수 {notice.viewCount.toLocaleString()}</span>
      </div>

      {/* 공지 본문 카드 */}
      <div className="bg-white border border-neutral-200 rounded-xl p-8">
        {/* 공지 헤더 */}
        <div className="mb-8 pb-6 border-b border-neutral-200">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant={CATEGORY_BADGE_VARIANT[notice.category]}>
              {NOTICE_CATEGORY_LABELS[notice.category]}
            </Badge>
            {notice.isPinned && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
                </svg>
                고정
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 leading-snug mb-3">
            {notice.title}
          </h2>
          <div className="flex items-center gap-4 text-xs text-neutral-400">
            <span>
              {new Date(notice.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
            {notice.updatedAt !== notice.createdAt && (
              <span>
                수정됨 {new Date(notice.updatedAt).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div
          className="notice-content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(notice.contentSanitized) }}
        />
      </div>

      {/* 삭제 확인 모달 */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="공지사항 삭제"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>취소</Button>
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
          <span className="font-medium">"{notice.title}"</span> 공지사항을 삭제하시겠습니까?
          <br />
          <span className="text-neutral-500">삭제된 공지는 복구할 수 없습니다.</span>
        </p>
      </Modal>
    </div>
  )
}
