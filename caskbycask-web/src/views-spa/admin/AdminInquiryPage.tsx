import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  downloadAdminInquiryAttachment,
} from '@/domain/inquiry/api/inquiryApi'
import type { InquiryCategory, InquiryStatus } from '@/domain/inquiry/types/inquiry.types'
import RichContent from '@/shared/components/RichContent'
import FormFieldLabel from '@/shared/components/FormFieldLabel'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

const CATEGORY_OPTIONS: Array<{ value: InquiryCategory | ''; label: string }> = [
  { value: '', label: '전체' },
  { value: 'BUG_REPORT', label: '버그 신고' },
  { value: 'FEATURE_REQUEST', label: '기능 제안' },
  { value: 'ACCOUNT_INQUIRY', label: '계정 문의' },
  { value: 'PARTNERSHIP_INQUIRY', label: '파트너 및 제휴 관련' },
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
  CORRECTION_REQUEST: '정보 수정 요청',
  PARTNERSHIP_INQUIRY: '파트너 및 제휴 관련',
  OTHER: '기타',
}

const STATUS_BADGE: Record<InquiryStatus, 'neutral' | 'PENDING' | 'RESOLVED'> = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'neutral',
  RESOLVED: 'RESOLVED',
}

export default function AdminInquiryPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = (searchParams.get('status') ?? '') as InquiryStatus | ''
  const category = (searchParams.get('category') ?? '') as InquiryCategory | ''
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [replySent, setReplySent] = useState(false)
  const [downloadingFileKey, setDownloadingFileKey] = useState<string | null>(null)
  const setListParam = (params: { status?: InquiryStatus | ''; category?: InquiryCategory | ''; page?: number }) =>
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        const nextStatus = params.status ?? status
        const nextCategory = params.category ?? category
        const nextPage = params.page ?? page
        if (nextStatus) n.set('status', nextStatus)
        else n.delete('status')
        if (nextCategory) n.set('category', nextCategory)
        else n.delete('category')
        n.set('page', String(nextPage))
        return n
      },
      { replace: true },
    )

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

  const downloadAttachment = async (fileKey: string, originalFilename: string) => {
    if (selectedId == null) return
    setDownloadingFileKey(fileKey)
    try {
      const blob = await downloadAdminInquiryAttachment(selectedId, fileKey)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = originalFilename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('첨부파일을 다운로드하지 못했습니다.')
    } finally {
      setDownloadingFileKey(null)
    }
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">문의 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl shadow-sm">
        <FilterTabs
          label="상태"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(v) => setListParam({ status: v as InquiryStatus | '', page: 0 })}
        />
        <FilterTabs
          label="유형"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(v) => setListParam({ category: v as InquiryCategory | '', page: 0 })}
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
                        {item.hasAttachments && (
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
            <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={(p) => setListParam({ page: p })} />
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

                {/* 사용자가 쓴 문의 제목은 잘리면 안 되므로 여러 줄을 허용한다 */}
                <h2 className="admin-wrap text-lg font-bold text-neutral-900 leading-snug">{detail.title}</h2>

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
                  <div className="bg-white border border-neutral-200 rounded-xl p-4 text-sm text-neutral-700 leading-relaxed min-h-[100px]">
                    {/<[a-z][\s\S]*>/i.test(detail.body) ? (
                      <RichContent html={detail.body} className="notice-content" />
                    ) : (
                      <div className="whitespace-pre-wrap">{detail.body}</div>
                    )}
                  </div>
                </div>

                {/* 첨부파일 */}
                {detail.attachments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                      첨부파일 ({detail.attachments.length})
                    </p>
                    <div className="space-y-2">
                      {detail.attachments.map((attachment) => (
                        <button
                          key={attachment.fileKey}
                          type="button"
                          onClick={() => downloadAttachment(attachment.fileKey, attachment.originalFilename)}
                          disabled={downloadingFileKey === attachment.fileKey}
                          className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 p-3 text-left hover:border-primary-300 hover:bg-primary-50/40 transition-colors disabled:opacity-50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">📎</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-neutral-700">{attachment.originalFilename}</span>
                            <span className="block text-xs text-neutral-400">
                              {attachment.size > 0 ? formatAttachmentSize(attachment.size) : attachment.contentType}
                            </span>
                          </span>
                          <span className="text-xs font-medium text-primary-800">
                            {downloadingFileKey === attachment.fileKey ? '다운로드 중...' : '다운로드'}
                          </span>
                        </button>
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
                      <FormFieldLabel admin required className="mb-1.5">답변 내용</FormFieldLabel>
                      <AutoGrowTextarea
                        required
                        aria-required="true"
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        rows={6}
                        maxLength={5000}
                        placeholder={detail.replyBody
                          ? '재답변 내용을 입력하세요...'
                          : `${detail.senderEmail} 으로 발송될 답변 내용을 입력하세요...`}
                        className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-xl
                          focus:outline-none focus:ring-2 focus:ring-primary-400"
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
                  <AutoGrowTextarea
                    value={noteInput || detail.adminNote || ''}
                    onChange={(e) => setNoteInput(e.target.value)}
                    rows={3}
                    placeholder="내부 메모를 입력하세요..."
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-xl
                      focus:outline-none focus:ring-2 focus:ring-primary-400"
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

function formatAttachmentSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
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
