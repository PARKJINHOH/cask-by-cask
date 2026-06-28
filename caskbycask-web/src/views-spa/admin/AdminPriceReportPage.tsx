import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'
import { priceTrackerApi } from '@/domain/pricetracker/api/priceTrackerApi'
import {
  useAdminPriceReports,
  useApprovePriceReport,
  useRejectPriceReport,
} from '@/domain/pricetracker/hooks/useAdminPriceTracker'
import type { AdminPriceReport, PriceReportStatus, StoreSearchResult } from '@/domain/pricetracker/types/pricetracker.types'

const krw = new Intl.NumberFormat('ko-KR')

const STATUS_TABS: { value: PriceReportStatus | ''; label: string }[] = [
  { value: 'PENDING', label: '대기' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: '', label: '전체' },
]

const DISCOUNT_LABEL: Record<string, string> = {
  PAYMENT: '결제 수단', BUNDLE: '묶음', COUPON: '쿠폰', OTHER: '기타',
}

const CHANNEL_LABEL: Record<string, string> = {
  AIRPORT: '공항', CITY: '시내', INFLIGHT: '기내', ONLINE: '온라인',
}

export default function AdminPriceReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = (searchParams.get('status') ?? 'PENDING') as PriceReportStatus | ''
  const flaggedOnly = searchParams.get('flagged') === 'true'
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const setListParam = (params: { status?: PriceReportStatus | ''; flaggedOnly?: boolean; page?: number }) =>
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        const nextStatus = params.status ?? status
        const nextFlaggedOnly = params.flaggedOnly ?? flaggedOnly
        const nextPage = params.page ?? page
        if (nextStatus) n.set('status', nextStatus)
        else n.delete('status')
        if (nextFlaggedOnly) n.set('flagged', 'true')
        else n.delete('flagged')
        n.set('page', String(nextPage))
        return n
      },
      { replace: true },
    )

  const { data, isLoading } = useAdminPriceReports({
    status: status || undefined,
    isFlagged: flaggedOnly || undefined,
    page,
  })

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">가격 등록 승인</h1>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl shadow-sm">
        <div className="flex gap-1.5">
          {STATUS_TABS.map((s) => (
            <button
              key={s.value}
              onClick={() => setListParam({ status: s.value, page: 0 })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === s.value ? 'bg-primary-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer ml-auto">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setListParam({ flaggedOnly: e.target.checked, page: 0 })} className="accent-primary-800" />
          ⚠️ 플래그된 항목만
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-800" /></div>
      ) : !data || data.empty ? (
        <div className="text-center py-16 text-neutral-400 text-sm bg-white rounded-xl">처리할 가격 등록이 없습니다.</div>
      ) : (
        <>
          <div className="space-y-3">
            {data.content.map((r) => <ReportCard key={r.id} report={r} />)}
          </div>
          {data.totalPages > 1 && <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={(p) => setListParam({ page: p })} />}
        </>
      )}
    </div>
  )
}

function ReportCard({ report: r }: { report: AdminPriceReport }) {
  const approve = useApprovePriceReport()
  const reject = useRejectPriceReport()

  const [mapKeyword, setMapKeyword] = useState('')
  const [mappedStore, setMappedStore] = useState<StoreSearchResult | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isSuggested = !!r.suggestedStoreName && !r.storeId
  const flagged = r.autoFlagged || r.reportCount > 0

  const { data: storeResults } = useQuery({
    queryKey: ['admin-store-map', mapKeyword],
    queryFn: () => priceTrackerApi.searchStores(mapKeyword),
    select: (res) => res.data.data ?? [],
    enabled: mapKeyword.length >= 1 && mapOpen,
    staleTime: 30_000,
  })

  const money = (v: number | null | undefined) =>
    v == null ? '-' : r.currency === 'USD' ? `$ ${v.toLocaleString()}` : `${krw.format(v)}원`

  const handleApprove = () => {
    approve.mutate({ id: r.id, storeId: mappedStore?.id ?? null })
  }
  const handleReject = () => {
    if (!rejectReason.trim()) return
    reject.mutate({ id: r.id, rejectReason: rejectReason.trim() }, { onSuccess: () => setRejecting(false) })
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-4 ${flagged ? 'border-red-200' : 'border-transparent'}`}>
      <div className="flex items-start gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {flagged && <span className="text-red-500 text-sm font-bold">⚠️</span>}
            <span className="font-semibold text-neutral-900">{r.spiritNameKo}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500">#{r.id}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">{r.currency}</span>
            {r.reportCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">신고 {r.reportCount}</span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {r.storeName
              ? `매장: ${r.storeName}`
              : r.suggestedStoreName
                ? `제안 매장: ${r.suggestedStoreName}${r.suggestedDutyfreeChannel ? ` [면세·${CHANNEL_LABEL[r.suggestedDutyfreeChannel] ?? r.suggestedDutyfreeChannel}]` : ''}`
                : '매장 미지정'}
            {' · '}
            {r.isAnonymous ? '익명' : `작성자: ${r.reporterNickname ?? '-'}`}
            {r.purchasedAt && ` · 구매일 ${r.purchasedAt}`}
            {` · ${formatDate(r.createdAt)}`}
          </p>
        </div>
        <span className="shrink-0 text-xs text-neutral-400">{r.status}</span>
      </div>

      {/* 가격 분해 */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm mb-3">
        <PriceField label="정가" value={money(r.regularPrice)} />
        <PriceField label="행사가/기본가" value={money(r.salePrice)} />
        <PriceField label="페이백" value={money(r.paybackAmount)} />
        <PriceField label="실구매가/체감가" value={money(r.actualPrice)} strong />
        {r.exchangeRateSnapshot != null && <PriceField label="환율" value={`${krw.format(r.exchangeRateSnapshot)}원/USD`} />}
      </div>

      {/* 할인 내역 */}
      {r.discountItems.length > 0 && (
        <div className="mb-3 text-xs text-neutral-500 space-y-0.5">
          {r.discountItems.map((d) => (
            <div key={d.id}>· {DISCOUNT_LABEL[d.discountType] ?? d.discountType} {d.description ? `(${d.description})` : ''}: -{money(d.discountAmount)}</div>
          ))}
        </div>
      )}

      {/* 설명 */}
      {r.description && <p className="text-sm text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2 mb-3 whitespace-pre-wrap">{r.description}</p>}

      {/* 인증 사진 (관리자 전체 열람) */}
      {r.images.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {r.images.map((img) => (
            <a key={img.id} href={img.imageUrl} target="_blank" rel="noreferrer" className="relative">
              <img src={img.imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover border border-neutral-200" />
              {!img.isPublic && (
                <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/60 text-white text-[10px]">비공개</span>
              )}
            </a>
          ))}
        </div>
      )}

      {/* 제안 매장 → 표준 매장 매핑 */}
      {isSuggested && r.status === 'PENDING' && (
        <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
          <p className="text-xs text-amber-800 font-medium mb-1.5">제안 매장 "{r.suggestedStoreName}" → 표준 매장 매핑 (선택)</p>
          <div className="relative">
            <input
              value={mappedStore ? mappedStore.displayName : mapKeyword}
              onChange={(e) => { setMapKeyword(e.target.value); setMappedStore(null); setMapOpen(true) }}
              onFocus={() => setMapOpen(true)}
              placeholder="표준 매장 검색 (미선택 시 제안 매장명 그대로 유지)"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white"
            />
            {mapOpen && storeResults && storeResults.length > 0 && !mappedStore && (
              <ul className="absolute z-10 w-full bg-white border border-neutral-200 rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                {storeResults.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => { setMappedStore(s); setMapOpen(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50">
                      {s.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 액션 */}
      {r.status === 'PENDING' && (
        rejecting ? (
          <div className="flex items-center gap-2">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유 입력"
              className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            <button onClick={handleReject} disabled={reject.isPending} className="px-3 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">확인</button>
            <button onClick={() => setRejecting(false)} className="px-3 py-2 text-sm text-neutral-500">취소</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setRejecting(true)} className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50">반려</button>
            <button onClick={handleApprove} disabled={approve.isPending} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-800 text-white hover:bg-primary-900 disabled:opacity-50">
              {mappedStore ? `승인 (→ ${mappedStore.displayName})` : '승인'}
            </button>
          </div>
        )
      )}
      {r.status === 'REJECTED' && r.rejectReason && (
        <p className="text-xs text-red-500 mt-1">반려 사유: {r.rejectReason}</p>
      )}
      {/* 에러 메시지 표시 */}
      {approve.isError && (
        <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {(approve.error as any)?.response?.data?.message || '승인 처리 중 오류가 발생했습니다.'}
        </p>
      )}
      {reject.isError && (
        <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {(reject.error as any)?.response?.data?.message || '반려 처리 중 오류가 발생했습니다.'}
        </p>
      )}
    </div>
  )
}

function PriceField({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className="text-neutral-500">
      {label} <span className={strong ? 'font-bold text-primary-700' : 'font-medium text-neutral-800'}>{value}</span>
    </span>
  )
}
