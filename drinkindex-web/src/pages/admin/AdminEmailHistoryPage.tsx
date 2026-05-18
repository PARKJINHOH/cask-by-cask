import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Badge from '@/shared/components/Badge'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import Modal from '@/shared/components/Modal'
import { adminEmailApi } from '@/domain/admin/api/adminEmailApi'
import type { EmailSendLog, EmailSendLogDetail } from '@/domain/admin/api/adminEmailApi'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── 제목 미리보기 모달 ────────────────────────────────────────────
function SubjectPreviewModal({ logId, onClose }: { logId: number; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin', 'email-log-detail', logId],
    queryFn: () => adminEmailApi.getLogDetail(logId),
    select: (res) => res.data.data as EmailSendLogDetail,
  })

  return (
    <Modal open onClose={onClose} title="이메일 미리보기" size="xl">
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      ) : detail ? (
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
            <p className="text-xs text-neutral-400">제목</p>
            <p className="text-base font-semibold text-neutral-900 mt-0.5">{detail.subject || '(제목 없음)'}</p>
          </div>
          <div
            className="px-5 py-5 text-sm prose prose-sm max-w-none overflow-y-auto"
            style={{ minHeight: '320px', maxHeight: '60vh' }}
            dangerouslySetInnerHTML={{ __html: detail.body || '<p style="color:#aaa">(본문 없음)</p>' }}
          />
        </div>
      ) : (
        <p className="text-sm text-neutral-400 text-center py-8">데이터를 불러올 수 없습니다.</p>
      )}
    </Modal>
  )
}

// ── 상세 모달 ─────────────────────────────────────────────────────
function LogDetailModal({ logId, onClose }: { logId: number; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin', 'email-log-detail', logId],
    queryFn: () => adminEmailApi.getLogDetail(logId),
    select: (res) => res.data.data as EmailSendLogDetail,
  })

  return (
    <Modal open onClose={onClose} title="발송 상세" size="lg">
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      ) : detail ? (
        <div className="space-y-5">
          {/* 메타 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-400 mb-0.5">발송 유형</p>
              <Badge variant={detail.sendType === 'TEST' ? 'warning' : 'primary'} size="sm">
                {detail.sendType === 'TEST' ? '테스트' : '전체 발송'}
              </Badge>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-400 mb-0.5">발송 시각</p>
              <p className="font-medium text-neutral-800">{formatDateTime(detail.sentAt)}</p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-400 mb-0.5">성공 / 실패</p>
              <p className="font-medium text-neutral-800">
                <span className="text-green-600">{detail.successCount}</span>
                {' / '}
                <span className={detail.failCount > 0 ? 'text-red-600' : 'text-neutral-400'}>{detail.failCount}</span>
              </p>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg">
              <p className="text-xs text-neutral-400 mb-0.5">총 발송</p>
              <p className="font-medium text-neutral-800">{detail.totalCount}건</p>
            </div>
          </div>

          {/* 수신자 목록 */}
          {detail.recipients.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-2">
                수신자 목록 ({detail.recipients.length}명)
              </p>
              <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-neutral-500 font-medium">이메일</th>
                      <th className="text-left px-3 py-2 text-neutral-500 font-medium">닉네임</th>
                      <th className="text-left px-3 py-2 text-neutral-500 font-medium">결과</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {detail.recipients.map((r, i) => (
                      <tr key={i} className={r.success ? '' : 'bg-red-50'}>
                        <td className="px-3 py-2 text-neutral-700">{r.email}</td>
                        <td className="px-3 py-2 text-neutral-500">{r.nickname ?? '-'}</td>
                        <td className="px-3 py-2">
                          {r.success
                            ? <span className="text-green-600 font-medium">성공</span>
                            : <span className="text-red-600 font-medium" title={r.errorMessage ?? ''}>실패</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-400 text-center py-8">데이터를 불러올 수 없습니다.</p>
      )}
    </Modal>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────
export default function AdminEmailHistoryPage() {
  const [page, setPage]             = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [previewId, setPreviewId]   = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'email-logs', page],
    queryFn: () => adminEmailApi.getLogs({ page, size: 20 }),
    select: (res) => res.data.data,
  })

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">메일 이력</h1>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-16">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-24">유형</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">제목</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-28 text-right">성공/실패</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-40">발송 시각</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">발송 이력이 없습니다.</td>
                  </tr>
                ) : (
                  data.content.map((log: EmailSendLog) => (
                    <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{log.id}</td>
                      <td className="px-4 py-3">
                        <Badge variant={log.sendType === 'TEST' ? 'warning' : 'primary'} size="sm">
                          {log.sendType === 'TEST' ? '테스트' : '전체'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <button
                          onClick={() => setPreviewId(log.id)}
                          className="text-neutral-800 hover:text-primary-600 hover:underline truncate block w-full text-left"
                        >
                          {log.subject}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs">
                        <span className="text-green-600 font-medium">{log.successCount}</span>
                        {' / '}
                        <span className={log.failCount > 0 ? 'text-red-600 font-medium' : 'text-neutral-300'}>
                          {log.failCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs tabular-nums">
                        {formatDateTime(log.sentAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedId(log.id)}
                          className="text-xs text-primary-600 hover:underline font-medium"
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      {previewId !== null && (
        <SubjectPreviewModal logId={previewId} onClose={() => setPreviewId(null)} />
      )}

      {selectedId !== null && (
        <LogDetailModal logId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
