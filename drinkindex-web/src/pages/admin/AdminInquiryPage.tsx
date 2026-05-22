import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Badge from '@/shared/components/Badge'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDateTime } from '@/shared/utils/format'
import {
  getAdminInquiries,
  getAdminInquiryDetail,
  updateInquiryNote,
  replyInquiry,
} from '@/domain/inquiry/api/inquiryApi'
import type { InquiryCategory, InquiryStatus } from '@/domain/inquiry/types/inquiry.types'

const CATEGORY_OPTIONS: Array<{ value: InquiryCategory | ''; label: string }> = [
  { value: '', label: '전체' },
  { value: 'BUG_REPORT', label: '버그 신고' },
  { value: 'FEATURE_REQUEST', label: '기능 제안' },
  { value: 'ACCOUNT_INQUIRY', label: '계정 문의' },
  { value: 'OTHER', label: '기타' },
]

const STATUS_OPTIONS: Array<{ value: InquiryStatus | ''; label: string }> = [
  { value: '', label: '전체' },
  { value: 'PENDING', label: '대기 중' },
  { value: 'IN_PROGRESS', label: '처리 중' },
  { value: 'RESOLVED', label: '처리 완료' },
]

const CATEGORY_LABEL: Record<InquiryCategory, string> = {
  BUG_REPORT: '버그 신고',
  FEATURE_REQUEST: '기능 제안',
  ACCOUNT_INQUIRY: '계정 문의',
  OTHER: '기타',
}

const STATUS_BADGE: Record<InquiryStatus, 'neutral' | 'PENDING' | 'RESOLVED'> = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'neutral',
  RESOLVED: 'RESOLVED',
}

export default function AdminInquiryPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<InquiryStatus | ''>('')
  const [category, setCategory] = useState<InquiryCategory | ''>('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [replySent, setReplySent] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'inquiries', { status, category, page }],
    queryFn: () =>
      getAdminInquiries({
        status: status || undefined,
        category: category || undefined,
        page,
      }),
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'inquiries', selectedId],
    queryFn: () => getAdminInquiryDetail(selectedId!),
    enabled: selectedId != null,
    staleTime: 0,
  })

  const noteMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => updateInquiryNote(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'inquiries', selectedId] })
    },
  })

  const replyMutation = useMutation({
    mutationFn: ({ id, replyBody }: { id: number; replyBody: string }) => replyInquiry(id, replyBody),
    onSuccess: () => {
      setReplySent(true)
      setReplyInput('')
      qc.invalidateQueries({ queryKey: ['admin', 'inquiries'] })
    },
  })

  const openDetail = (id: number) => {
    setSelectedId(id)
    setNoteInput('')
    setReplyInput('')
    setReplySent(false)
  }

  const closeDetail = () => setSelectedId(null)

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">문의 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl shadow-sm">
        <FilterTabs
          label="상태"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(v) => { setStatus(v as InquiryStatus | ''); setPage(0) }}
        />
        <FilterTabs
          label="유형"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(v) => { setCategory(v as InquiryCategory | ''); setPage(0) }}
        />
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-800" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-14">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">유형</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">제목</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">이메일</th>
                  <th className="text-center px-4 py-3 text-neutral-500 font-medium w-16 whitespace-nowrap">첨부</th>
                  <th className="text-left px-3 py-3 text-neutral-500 font-medium w-24">상태</th>
                  <th className="text-left px-3 py-3 text-neutral-500 font-medium w-28">접수일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-neutral-50 transition-colors cursor-pointer ${
                        selectedId === item.id ? 'bg-primary-50' : ''
                      }`}
                      onClick={() => openDetail(item.id)}
                    >
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{item.id}</td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral" size="sm">{CATEGORY_LABEL[item.category]}</Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate font-medium text-neutral-800">{item.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-neutral-600">{item.senderEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.hasImages && (
                          <span className="text-neutral-400">📎</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={STATUS_BADGE[item.status]} size="sm">
                          {STATUS_OPTIONS.find((s) => s.value === item.status)?.label ?? item.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-neutral-500 text-xs tabular-nums whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
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

      {/* 상세 패널 */}
      {selectedId != null && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/20"
          onClick={closeDetail}>
          <div
            className="w-full max-w-lg h-full bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex justify-center py-20">
                <Spinner size="lg" className="text-primary-800" />
              </div>
            ) : detail ? (
              <div className="p-6 space-y-5">
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">{CATEGORY_LABEL[detail.category]}</Badge>
                    <Badge variant={STATUS_BADGE[detail.status]} size="sm">
                      {STATUS_OPTIONS.find((s) => s.value === detail.status)?.label ?? detail.status}
                    </Badge>
                  </div>
                  <button
                    onClick={closeDetail}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <h2 className="text-lg font-bold text-neutral-900 leading-snug">{detail.title}</h2>

                {/* 발신자 정보 */}
                <div className="bg-neutral-50 rounded-xl p-4 space-y-1.5 text-sm">
                  <p><span className="text-neutral-500 w-20 inline-block">이메일</span>
                    <a href={`mailto:${detail.senderEmail}`}
                      className="text-primary-800 hover:underline">{detail.senderEmail}</a></p>
                  <p><span className="text-neutral-500 w-20 inline-block">접수일</span>
                    <span>{formatDateTime(detail.createdAt)}</span></p>
                </div>

                {/* 문의 내용 */}
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                    문의 내용
                  </p>
                  <div className="bg-white border border-neutral-200 rounded-xl p-4 text-sm text-neutral-700
                    whitespace-pre-wrap leading-relaxed min-h-[100px]">
                    {detail.body}
                  </div>
                </div>

                {/* 첨부 이미지 */}
                {detail.imageUrls.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                      첨부 이미지 ({detail.imageUrls.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detail.imageUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={`첨부 이미지 ${i + 1}`}
                            className="w-28 h-28 object-cover rounded-lg border border-neutral-200
                              hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 문의 답변 */}
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                    문의 답변
                  </p>

                  {/* 기존 발송된 답변 내용 표시 */}
                  {detail.replyBody && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-medium text-amber-700">발송된 답변</p>
                        {(detail.repliedBy || detail.repliedAt) && (
                          <p className="text-xs text-neutral-400">
                            {detail.repliedBy && <span>{detail.repliedBy}</span>}
                            {detail.repliedBy && detail.repliedAt && <span className="mx-1">·</span>}
                            {detail.repliedAt && <span>{formatDateTime(detail.repliedAt)}</span>}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                        {detail.replyBody}
                      </p>
                    </div>
                  )}

                  {replySent ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-green-600">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      답변이 발송되었습니다.
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        rows={6}
                        maxLength={5000}
                        placeholder={detail.replyBody
                          ? '재답변 내용을 입력하세요...'
                          : `${detail.senderEmail} 으로 발송될 답변 내용을 입력하세요...`}
                        className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl
                          focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-neutral-400">{replyInput.length} / 5,000</p>
                        <button
                          onClick={() => {
                            if (!replyInput.trim()) return
                            if (!confirm(`${detail.senderEmail} 으로 답변을 발송하시겠습니까?`)) return
                            replyMutation.mutate({ id: detail.id, replyBody: replyInput })
                          }}
                          disabled={replyMutation.isPending || !replyInput.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                            bg-primary-800 text-white rounded-lg hover:bg-primary-900 transition-colors
                            disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                          {replyMutation.isPending ? '발송 중...' : detail.replyBody ? '재답변 발송' : '답변 발송'}
                        </button>
                      </div>
                      {replyMutation.isError && (
                        <p className="mt-1 text-xs text-red-500">발송 중 오류가 발생했습니다. 다시 시도해주세요.</p>
                      )}
                    </>
                  )}
                </div>

                {/* 관리자 메모 */}
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                    관리자 메모 <span className="font-normal text-neutral-400">(발송되지 않음)</span>
                  </p>
                  <textarea
                    value={noteInput || detail.adminNote || ''}
                    onChange={(e) => setNoteInput(e.target.value)}
                    rows={3}
                    placeholder="내부 메모를 입력하세요..."
                    className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-xl
                      focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  />
                  <button
                    onClick={() => noteMutation.mutate({ id: detail.id, note: noteInput })}
                    disabled={noteMutation.isPending}
                    className="mt-2 px-4 py-2 text-sm font-medium bg-neutral-800 text-white
                      rounded-lg hover:bg-neutral-900 transition-colors disabled:opacity-40"
                  >
                    {noteMutation.isPending ? '저장 중...' : '메모 저장'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

function FilterTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-1.5">{label}</p>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              value === opt.value
                ? 'bg-primary-800 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
