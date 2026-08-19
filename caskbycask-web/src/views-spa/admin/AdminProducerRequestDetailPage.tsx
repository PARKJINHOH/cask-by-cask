import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import { formatDate } from '@/shared/utils/format'
import {
  useAdminProducerRequest,
  useUpdateProducerRequest,
  useApproveProducerRequest,
  useRejectProducerRequest,
} from '@/domain/producer/hooks/useProducerRequest'
import type { UpdateProducerRequestPayload } from '@/domain/producer/types/producerRequest.types'
import { PRODUCER_TYPE_LABEL, type ProducerType } from '@/domain/producer/types/producer.types'
import FormFieldLabel, { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'
import NumberInput from '@/shared/components/NumberInput'

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기 중', APPROVED: '승인됨', REJECTED: '반려됨',
}

const PRODUCER_TYPES: ProducerType[] = ['DISTILLERY', 'WINERY', 'COGNAC_HOUSE', 'OTHER']

const FIELD_CLS =
  'w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-neutral-50 last:border-0">
      <span className="w-28 text-sm text-neutral-400 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-sm text-neutral-800 break-words">{children}</div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-700">
        {label}{required && <RequiredMark />}
      </label>
      {children}
    </div>
  )
}

const EMPTY = <span className="text-neutral-300">—</span>

// 폼 상태 (입력 편의를 위해 숫자도 문자열로 보관)
interface FormState {
  type: ProducerType
  nameKo: string
  nameEn: string
  country: string
  region: string
  foundedYear: string
  website: string
  descriptionKo: string
  descriptionEn: string
}

export default function AdminProducerRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const requestId = Number(id)
  const listReturnTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnTo' in location.state &&
    typeof location.state.returnTo === 'string'
      ? location.state.returnTo
      : '/admin/producers/requests'

  const { data: req, isLoading } = useAdminProducerRequest(requestId)
  const update = useUpdateProducerRequest()
  const approve = useApproveProducerRequest()
  const reject = useRejectProducerRequest()

  const [form, setForm] = useState<FormState | null>(null)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  // 서버 데이터가 들어오면 폼 초기화
  useEffect(() => {
    if (!req) return
    setForm({
      type: req.type ?? 'OTHER',
      nameKo: req.nameKo ?? '',
      nameEn: req.nameEn ?? '',
      country: req.country ?? '',
      region: req.region ?? '',
      foundedYear: req.foundedYear != null ? String(req.foundedYear) : '',
      website: req.website ?? '',
      descriptionKo: req.descriptionKo ?? '',
      descriptionEn: req.descriptionEn ?? '',
    })
  }, [req])

  if (isLoading || (req && !form)) {
    return <div className="flex justify-center items-center py-40"><Spinner size="lg" className="text-primary-800" /></div>
  }
  if (!req || !form) {
    return <div className="p-6"><p className="text-neutral-500">요청 데이터를 찾을 수 없습니다.</p></div>
  }

  const isPending = req.status === 'PENDING'
  const set = (patch: Partial<FormState>) => { setForm(f => f ? { ...f, ...patch } : f); setSavedMsg('') }

  const buildPayload = (): UpdateProducerRequestPayload | null => {
    if (!form.nameKo.trim() || !form.nameEn.trim() || !form.country.trim()) {
      setError('한글명·영문명·국가는 필수입니다.')
      return null
    }
    const year = form.foundedYear.trim() ? Number(form.foundedYear) : null
    if (year != null && (Number.isNaN(year) || year < 1500 || year > new Date().getFullYear())) {
      setError('설립연도가 올바르지 않습니다.')
      return null
    }
    setError('')
    return {
      type: form.type,
      nameKo: form.nameKo.trim(),
      nameEn: form.nameEn.trim(),
      country: form.country.trim(),
      region: form.region.trim() || null,
      website: form.website.trim() || null,
      foundedYear: year,
      descriptionKo: form.descriptionKo.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
    }
  }

  const handleSave = (): Promise<boolean> => {
    const payload = buildPayload()
    if (!payload) return Promise.resolve(false)
    return update.mutateAsync({ id: req.id, body: payload })
      .then(() => { setSavedMsg('저장되었습니다.'); return true })
      .catch(() => { setError('저장에 실패했습니다.'); return false })
  }

  // 승인 전 변경사항이 있으면 먼저 저장
  const handleApprove = async () => {
    if (!confirm(`'${form.nameKo}'를 승인하시겠습니까? 생산자 DB에 자동 등록됩니다.`)) return
    if (!(await handleSave())) return
    approve.mutate(req.id)
  }
  const handleReject = () => {
    if (!reason.trim()) return
    reject.mutate({ id: req.id, rejectReason: reason.trim() }, {
      onSuccess: () => { setReason(''); setRejectOpen(false) },
    })
  }

  return (
    <div className="p-6 mx-auto space-y-6 pb-28 max-w-3xl">
      <AdminPageHeader
        breadcrumbs={[
          { label: '생산자 등록 요청', to: listReturnTo },
          { label: '요청 상세' },
        ]}
        backTo={listReturnTo}
        backLabel="요청 목록"
        title="생산자 등록 요청 상세"
        badge={<Badge variant={req.status} size="md">{STATUS_LABEL[req.status] ?? req.status}</Badge>}
      />

      {/* 신청 정보 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-bold text-neutral-500 mb-2">신청 정보</h2>
        <Row label="신청자">{req.requesterNickname ?? EMPTY}</Row>
        <Row label="신청일">{formatDate(req.createdAt)}</Row>
        {req.reviewedAt && <Row label="처리일">{formatDate(req.reviewedAt)}</Row>}
        {req.rejectReason && (
          <Row label="반려 사유"><span className="text-red-600 whitespace-pre-wrap">{req.rejectReason}</span></Row>
        )}
      </div>

      {/* 생산자 정보 — PENDING 이면 편집, 아니면 읽기 전용 */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-bold text-neutral-500 mb-3">
          생산자 정보{isPending && <span className="ml-2 text-xs font-normal text-neutral-400">(수정 후 저장하거나, 승인 시 자동 반영됩니다)</span>}
        </h2>

        {isPending ? (
          <div className="space-y-4">
            <RequiredFieldsNotice admin />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="한글명" required>
                <input className={FIELD_CLS} value={form.nameKo} maxLength={200} required aria-required="true"
                  onChange={e => set({ nameKo: e.target.value })} />
              </Field>
              <Field label="영문명" required>
                <input className={FIELD_CLS} value={form.nameEn} maxLength={200} required aria-required="true"
                  onChange={e => set({ nameEn: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="종류">
                <select className={FIELD_CLS} value={form.type}
                  onChange={e => set({ type: e.target.value as ProducerType })}>
                  {PRODUCER_TYPES.map(t => (
                    <option key={t} value={t}>{PRODUCER_TYPE_LABEL[t].ko}</option>
                  ))}
                </select>
              </Field>
              <Field label="국가" required>
                <input className={FIELD_CLS} value={form.country} maxLength={100} required aria-required="true"
                  onChange={e => set({ country: e.target.value })} />
              </Field>
              <Field label="지역">
                <input className={FIELD_CLS} value={form.region} maxLength={100}
                  onChange={e => set({ region: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="설립연도">
                <NumberInput className={FIELD_CLS}value={form.foundedYear}
                  min={1500} max={new Date().getFullYear()}
                  onChange={e => set({ foundedYear: e.target.value })} />
              </Field>
              <Field label="웹사이트">
                <input className={FIELD_CLS} type="url" value={form.website} maxLength={500}
                  placeholder="https://example.com"
                  onChange={e => set({ website: e.target.value })} />
              </Field>
            </div>

            <Field label="소개 (한글)">
              <AutoGrowTextarea className={`${FIELD_CLS}`} rows={3} maxLength={2000}
                value={form.descriptionKo} onChange={e => set({ descriptionKo: e.target.value })} />
            </Field>
            <Field label="소개 (영문)">
              <AutoGrowTextarea className={`${FIELD_CLS}`} rows={3} maxLength={2000}
                value={form.descriptionEn} onChange={e => set({ descriptionEn: e.target.value })} />
            </Field>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {savedMsg && <p className="text-sm text-green-700">{savedMsg}</p>}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={handleSave} isLoading={update.isPending}>저장</Button>
            </div>
          </div>
        ) : (
          <>
            <Row label="한글명">{req.nameKo}</Row>
            <Row label="영문명">{req.nameEn || EMPTY}</Row>
            <Row label="종류">{req.type ? PRODUCER_TYPE_LABEL[req.type]?.ko ?? req.type : EMPTY}</Row>
            <Row label="국가">{req.country || EMPTY}</Row>
            <Row label="지역">{req.region || EMPTY}</Row>
            <Row label="설립연도">{req.foundedYear ?? EMPTY}</Row>
            <Row label="웹사이트">
              {req.website
                ? <a href={req.website} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline break-all">{req.website}</a>
                : EMPTY}
            </Row>
            <Row label="소개 (한글)">
              {req.descriptionKo ? <span className="whitespace-pre-wrap">{req.descriptionKo}</span> : EMPTY}
            </Row>
            <Row label="소개 (영문)">
              {req.descriptionEn ? <span className="whitespace-pre-wrap">{req.descriptionEn}</span> : EMPTY}
            </Row>
          </>
        )}
      </div>

      {/* 처리 액션 */}
      {isPending && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-500">요청 처리</h2>
          {rejectOpen ? (
            <div className="space-y-3">
              <FormFieldLabel admin required>반려 사유</FormFieldLabel>
              <AutoGrowTextarea
                required
                aria-required="true"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="반려 사유를 입력하세요 (요청자에게 알림으로 전달됩니다)"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setRejectOpen(false); setReason('') }}>취소</Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleReject}
                  disabled={!reason.trim()}
                  isLoading={reject.isPending}
                >
                  반려 확정
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleApprove} isLoading={approve.isPending || update.isPending}>승인</Button>
              <Button variant="danger" onClick={() => setRejectOpen(true)}>반려</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
