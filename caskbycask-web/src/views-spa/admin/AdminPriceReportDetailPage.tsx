import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Spinner from '@/shared/components/Spinner'
import { formatDateTime } from '@/shared/utils/format'
import {
  useAdminPriceReport,
  useApprovePriceReport,
  useRejectPriceReport,
} from '@/domain/pricetracker/hooks/useAdminPriceTracker'
import type {
  AdminPriceReport,
  PriceReportStatus,
  StoreType,
} from '@/domain/pricetracker/types/pricetracker.types'
import FormFieldLabel from '@/shared/components/FormFieldLabel'

const krw = new Intl.NumberFormat('ko-KR')

const DISCOUNT_LABEL: Record<string, string> = {
  PAYMENT: '결제 수단', BUNDLE: '묶음', COUPON: '쿠폰', OTHER: '기타',
}

const CHANNEL_LABEL: Record<string, string> = {
  AIRPORT: '공항', CITY: '시내', INFLIGHT: '기내', ONLINE: '온라인',
}

const STORE_TYPE_LABEL: Record<StoreType, string> = {
  DOMESTIC: '국내', OVERSEAS: '해외', DUTYFREE: '면세',
}

const STATUS_STYLE: Record<PriceReportStatus, { label: string; className: string }> = {
  PENDING: { label: '대기', className: 'bg-amber-50 text-amber-700' },
  APPROVED: { label: '승인', className: 'bg-green-50 text-green-700' },
  REJECTED: { label: '반려', className: 'bg-red-50 text-red-700' },
}

export default function AdminPriceReportDetailPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number(idParam)
  const navigate = useNavigate()
  const location = useLocation()
  const listReturnTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnTo' in location.state &&
    typeof location.state.returnTo === 'string'
      ? location.state.returnTo
      : '/admin/price-reports'

  const { data: report, isLoading } = useAdminPriceReport(id)
  const approve = useApprovePriceReport()
  const reject = useRejectPriceReport()

  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [volumeInput, setVolumeInput] = useState('')
  const [storeType, setStoreType] = useState<StoreType>('DOMESTIC')

  useEffect(() => {
    if (report) {
      setVolumeInput(report.volumeMl == null ? '' : String(report.volumeMl))
      setStoreType(report.storeType)
    }
  }, [report])

  const goList = () => navigate(listReturnTo)
  const handleApprove = () => {
    if (!report) return
    const volumeMl = parseOptionalVolumeMl(volumeInput)
    if (report.volumeMl != null && !volumeInput) {
      window.alert('기존에 확인된 용량은 비울 수 없습니다. 올바른 용량으로 수정해주세요.')
      return
    }
    if (volumeInput && volumeMl == null) {
      window.alert('용량은 1~100,000ml 사이의 정수로 입력해주세요.')
      return
    }
    approve.mutate(
      { id: report.id, volumeMl, storeType },
      { onSuccess: goList },
    )
  }
  const handleReject = () => {
    if (!report || !rejectReason.trim()) return
    reject.mutate(
      { id: report.id, rejectReason: rejectReason.trim() },
      { onSuccess: goList },
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" className="text-primary-800" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-6">
        <p className="text-neutral-500">가격 등록 항목을 찾을 수 없습니다.</p>
        <button onClick={goList} className="mt-3 text-sm text-primary-700 hover:underline">목록으로</button>
      </div>
    )
  }

  const status = STATUS_STYLE[report.status]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={goList} className="text-sm text-neutral-500 hover:text-neutral-800">목록</button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {report.autoFlagged && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
              ⚠️ 자동 플래그
            </span>
          )}
          {report.reportCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600">
              신고 {report.reportCount}
            </span>
          )}
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.className}`}>
            {status.label}
          </span>
        </div>
      </div>

      <div className="bg-neutral-50 rounded-xl p-4 grid grid-cols-2 lg:grid-cols-6 gap-4 text-sm">
        <Meta label="등록 번호" value={`#${report.id}`} />
        <Meta label="등록 일시" value={formatDateTime(report.createdAt)} />
        <Meta label="구매일" value={report.purchasedAt ?? '-'} />
        <Meta label="작성자" value={report.isAnonymous ? '익명' : report.reporterNickname ?? '-'} />
        <Meta label="통화" value={report.currency} />
        <Meta label="판매처 유형" value={STORE_TYPE_LABEL[report.storeType]} />
        <Meta label="병 용량" value={report.volumeMl == null ? '미확인' : `${report.volumeMl.toLocaleString()}ml`} />
      </div>

      {report.autoFlagged && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">자동 플래그 사유</p>
          <p className="text-sm text-neutral-700">
            같은 주류·용량·판매처 유형의 최근 승인된 원화 실구매가 중앙값보다 30% 이상 높거나 낮아 자동 표시된 항목입니다.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)] gap-5">
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">등록 대상</p>
            <h1 className="text-xl font-bold text-neutral-900">{report.spiritNameKo}</h1>
            <p className="text-sm text-neutral-500 mt-1">
              {formatStoreName(report)}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-neutral-100 pt-4">
            <PriceField label="정가" value={money(report, report.regularPrice)} />
            <PriceField label="행사가/기본가" value={money(report, report.salePrice)} />
            <PriceField label="페이백" value={money(report, report.paybackAmount)} />
            <PriceField label="실구매가/체감가" value={money(report, report.actualPrice)} strong />
            <PriceField
              label="원화 실구매가"
              value={report.actualPriceKrw == null ? '-' : `${krw.format(report.actualPriceKrw)}원`}
              strong
            />
            <PriceField
              label="환율"
              value={report.exchangeRateSnapshot == null
                ? '-'
                : `${report.exchangeRateSnapshot.toLocaleString(undefined, { maximumFractionDigits: 8 })}원/${report.currency}`}
            />
          </div>

          {report.discountItems.length > 0 && (
            <div className="border-t border-neutral-100 pt-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">할인 내역</p>
              <div className="space-y-2">
                {report.discountItems.map((discount) => (
                  <div key={discount.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-neutral-600">
                      {DISCOUNT_LABEL[discount.discountType] ?? discount.discountType}
                      {discount.description ? ` · ${discount.description}` : ''}
                    </span>
                    <span className="font-medium text-neutral-800 whitespace-nowrap">
                      -{money(report, discount.discountAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.description && (
            <div className="border-t border-neutral-100 pt-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">등록 설명</p>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap bg-neutral-50 rounded-lg px-3 py-3">
                {report.description}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">인증 사진</p>
          {report.images.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center bg-neutral-50 rounded-lg">첨부된 사진이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {report.images.map((image) => (
                <a key={image.id} href={image.imageUrl} target="_blank" rel="noreferrer" className="relative group">
                  <img
                    src={image.imageUrl}
                    alt="가격 인증 자료"
                    className="w-full aspect-square rounded-lg object-cover border border-neutral-200 group-hover:opacity-90"
                  />
                  {!image.isPublic && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/65 text-white text-[10px]">
                      비공개
                    </span>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {report.status === 'PENDING' && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">등록 정보 확인</p>
          <p className="text-sm text-neutral-500 mb-3">
            사용자가 입력한 병 용량과 판매처 유형입니다. 사진이나 설명과 다르면 승인 전에 수정할 수 있습니다.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex max-w-xs items-center overflow-hidden rounded-lg border border-neutral-300 focus-within:ring-2 focus-within:ring-primary-200">
              <input
                value={volumeInput}
                onChange={(e) => setVolumeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="미확인"
                className="min-w-0 flex-1 px-3 py-2 text-sm focus:outline-none"
              />
              <span className="pr-3 text-xs text-neutral-400">ml</span>
            </div>
            <select
              value={storeType}
              onChange={(e) => setStoreType(e.target.value as StoreType)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              {(report.currency === 'KRW'
                ? ['DOMESTIC', 'OVERSEAS', 'DUTYFREE']
                : ['OVERSEAS', 'DUTYFREE']
              ).map((type) => (
                <option key={type} value={type}>{STORE_TYPE_LABEL[type as StoreType]}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {report.status === 'REJECTED' && report.rejectReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-700 mb-1">반려 사유</p>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{report.rejectReason}</p>
        </div>
      )}

      {report.status === 'PENDING' && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          {rejecting ? (
            <div className="flex flex-col gap-2">
              <FormFieldLabel admin required>반려 사유</FormFieldLabel>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                required
                aria-required="true"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="반려 사유 입력"
                className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              />
              <button
                type="button"
                onClick={handleReject}
                disabled={reject.isPending || !rejectReason.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {reject.isPending ? '처리 중...' : '반려 확인'}
              </button>
              </div>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="px-4 py-2 text-sm text-neutral-500"
              >
                취소
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              >
                반려
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approve.isPending}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-primary-800 text-white hover:bg-primary-900 disabled:opacity-50"
              >
                {approve.isPending
                  ? '처리 중...'
                  : '승인'}
              </button>
            </div>
          )}

          {approve.isError && <ErrorMessage error={approve.error} fallback="승인 처리 중 오류가 발생했습니다." />}
          {reject.isError && <ErrorMessage error={reject.error} fallback="반려 처리 중 오류가 발생했습니다." />}
        </div>
      )}
    </div>
  )
}

function money(report: AdminPriceReport, value: number | null | undefined) {
  if (value == null) return '-'
  return report.currency === 'KRW' ? `${krw.format(value)}원` : `${value.toLocaleString()} ${report.currency}`
}

function formatStoreName(report: AdminPriceReport) {
  if (report.storeName) return `매장: ${report.storeName}`
  if (!report.suggestedStoreName) return '매장 미지정'
  const channel = report.suggestedDutyfreeChannel
    ? ` · 면세 ${CHANNEL_LABEL[report.suggestedDutyfreeChannel] ?? report.suggestedDutyfreeChannel}`
    : ''
  return `판매처: ${report.suggestedStoreName}${channel}`
}

function PriceField({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className={strong ? 'font-bold text-primary-700' : 'font-medium text-neutral-800'}>{value}</p>
    </div>
  )
}

function Meta({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      {children ?? <p className="text-neutral-800 break-words">{value}</p>}
    </div>
  )
}

function ErrorMessage({ error, fallback }: { error: unknown; fallback: string }) {
  const message = extractErrorMessage(error) ?? fallback
  return (
    <p className="text-xs text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      ⚠️ {message}
    </p>
  )
}

function extractErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('response' in error)) return null
  const response = error.response
  if (!response || typeof response !== 'object' || !('data' in response)) return null
  const data = response.data
  if (!data || typeof data !== 'object' || !('message' in data) || typeof data.message !== 'string') return null
  return data.message
}

function parseOptionalVolumeMl(value: string): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100000 ? parsed : null
}
