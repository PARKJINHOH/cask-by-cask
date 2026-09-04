import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { useAdminVenueCities } from '@/domain/admin/hooks/useAdminVenue'
import {
  useAdminVenueRequests,
  useApproveVenueRequest,
  useRejectVenueRequest,
} from '@/domain/venue/hooks/useVenueRequests'
import {
  VENUE_TYPE_LABEL_KO,
  type VenueRequest,
  type VenueRequestStatus,
} from '@/domain/venue/types/venue.types'

const STATUS_LABEL: Record<VenueRequestStatus, string> = {
  PENDING: '검토 중',
  APPROVED: '승인됨',
  REJECTED: '반려됨',
}

const STATUS_STYLE: Record<VenueRequestStatus, string> = {
  PENDING: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-600 border-red-200',
}

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-400'

/**
 * 장소 제보 처리.
 *
 * <p>승인 시 <b>도시를 관리자가 고른다.</b> 제보 폼은 도시를 자유 텍스트로 받으므로
 * (카탈로그에 없는 도시도 제보할 수 있어야 한다) 어느 도시 행에 붙일지는 사람이 판단해야 한다.
 *
 * <p>승인된 장소는 <b>비공개로</b> 만들어진다 — 제보에는 좌표가 없는 경우가 대부분이라
 * 그대로 공개하면 목록에는 뜨는데 지도에서는 사라진다. 핀을 찍은 뒤 장소 관리에서 공개로 올린다.
 */
export default function AdminVenueRequestPage() {
  const [status, setStatus] = useState<VenueRequestStatus | ''>('PENDING')
  const [page, setPage] = useState(0)
  const [approveTarget, setApproveTarget] = useState<VenueRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<VenueRequest | null>(null)
  const [cityId, setCityId] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useAdminVenueRequests(status, page)
  const { data: cities } = useAdminVenueCities()
  const approve = useApproveVenueRequest()
  const reject = useRejectVenueRequest()

  const errorText = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? '처리하지 못했습니다. 잠시 후 다시 시도해주세요.'

  const openApprove = (request: VenueRequest) => {
    setError(null)
    // 제보한 국가와 같은 국가의 첫 도시를 미리 골라 둔다 — 대부분 그게 맞다.
    const match = (cities ?? []).find((city) => city.countryCode === request.venue.countryCode)
    setCityId(match ? String(match.id) : '')
    setApproveTarget(request)
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">장소 등록 요청</h1>
          <p className="mt-1 text-xs text-neutral-500">
            승인하면 <b>비공개</b> 장소가 만들어집니다. 좌표를 찍은 뒤 장소 관리에서 공개로 올리세요.
          </p>
        </div>
        <Link to="/admin/venues">
          <Button size="sm" variant="secondary">장소 관리</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', ''] as const).map((value) => (
          <button
            key={value || 'ALL'}
            type="button"
            onClick={() => { setStatus(value); setPage(0) }}
            className={`min-h-[36px] rounded-lg px-3 text-sm ${
              status === value ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {value ? STATUS_LABEL[value] : '전체'}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : !data || data.content.length === 0 ? (
          <p className="p-10 text-center text-sm text-neutral-500">요청이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {data.content.map((request) => (
              <li key={request.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md border px-2 py-0.5 text-xs ${STATUS_STYLE[request.status]}`}>
                        {STATUS_LABEL[request.status]}
                      </span>
                      <span className="text-sm font-semibold text-neutral-900">
                        {request.venue.nameKo}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {VENUE_TYPE_LABEL_KO[request.venue.venueType]} · {request.venue.countryCode.toUpperCase()}
                        {request.venue.cityName ? ` · ${request.venue.cityName}` : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">
                      {request.venue.address}
                      {request.venue.addressDetail ? ` ${request.venue.addressDetail}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      제보: {request.nickname}
                      {request.venue.phone ? ` · ${request.venue.phone}` : ''}
                    </p>
                    {(request.venue.naverMapsUrl || request.venue.kakaoMapsUrl || request.venue.googleMapsUrl) && (
                      <p className="mt-1 flex flex-wrap gap-2 text-xs">
                        {[
                          ['네이버', request.venue.naverMapsUrl],
                          ['카카오', request.venue.kakaoMapsUrl],
                          ['구글', request.venue.googleMapsUrl],
                        ].filter(([, url]) => url).map(([label, url]) => (
                          <a
                            key={label}
                            href={url as string}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-primary-700 underline"
                          >
                            {label} 지도 ↗
                          </a>
                        ))}
                      </p>
                    )}
                    {request.venue.descriptionKo && (
                      <p className="mt-1 whitespace-pre-line text-xs text-neutral-500">
                        {request.venue.descriptionKo}
                      </p>
                    )}
                    {request.rejectReason && (
                      <p className="mt-1 text-xs text-red-500">반려 사유: {request.rejectReason}</p>
                    )}
                    {request.createdVenueId && (
                      <Link
                        to="/admin/venues"
                        className="mt-1 inline-block text-xs text-primary-700 underline"
                      >
                        만들어진 장소 #{request.createdVenueId} 보기
                      </Link>
                    )}
                  </div>

                  {request.status === 'PENDING' && (
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" onClick={() => openApprove(request)}>승인</Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setError(null); setReason(''); setRejectTarget(request) }}
                      >
                        반려
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
          scrollTarget="page"
        />
      )}

      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title="제보 승인" size="md">
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            <b>{approveTarget?.venue.nameKo}</b>을(를) 어느 도시에 등록할까요?
          </p>
          <select className={INPUT_CLASS} value={cityId} onChange={(e) => setCityId(e.target.value)}>
            <option value="">도시를 선택하세요</option>
            {(cities ?? []).map((city) => (
              <option key={city.id} value={city.id}>
                {city.countryCode.toUpperCase()} · {city.nameKo}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-400">
            승인하면 비공개 상태로 만들어집니다. 장소 관리에서 좌표를 찍고 공개로 올리세요.
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setApproveTarget(null)}>취소</Button>
            <Button
              isLoading={approve.isPending}
              disabled={!cityId}
              onClick={() => {
                if (!approveTarget || !cityId) return
                approve.mutate(
                  { id: approveTarget.id, venueCityId: Number(cityId) },
                  {
                    onSuccess: () => setApproveTarget(null),
                    onError: (e) => setError(errorText(e)),
                  },
                )
              }}
            >
              승인
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="제보 반려" size="md">
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">반려 사유는 제보자에게 알림으로 전달됩니다.</p>
          <textarea
            className={INPUT_CLASS}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 이미 등록된 장소입니다."
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>취소</Button>
            <Button
              variant="danger"
              isLoading={reject.isPending}
              onClick={() => {
                if (!rejectTarget) return
                reject.mutate(
                  { id: rejectTarget.id, rejectReason: reason.trim() },
                  {
                    onSuccess: () => setRejectTarget(null),
                    onError: (e) => setError(errorText(e)),
                  },
                )
              }}
            >
              반려
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
