import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Spinner from '@/shared/components/Spinner'
import { formatDateTime } from '@/shared/utils/format'
import { adminDealApi } from '@/domain/admin/api/adminDealApi'
import { DEAL_CATEGORIES, type UpdateDealRequest } from '@/domain/admin/types/deal.types'
import {
  ConfidenceBadge, DealStatusBadge, SourceLinkButton, formatPrice, siteLabel,
} from '@/domain/admin/components/dealUi'

const EMPTY_FORM = {
  drinkName: '', drinkCategory: '', originalPrice: '', dealPrice: '',
  discountPercent: '', seller: '', dealCondition: '', expiryInfo: '', summaryKo: '',
}

export default function AdminDealDetailPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number(idParam)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saved, setSaved] = useState(false)

  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin', 'deals', id],
    queryFn: () => adminDealApi.detail(id),
    enabled: Number.isFinite(id),
    staleTime: 0,
  })

  useEffect(() => {
    if (!detail) return
    setForm({
      drinkName: detail.drinkName ?? '',
      drinkCategory: detail.drinkCategory ?? '',
      originalPrice: detail.originalPrice?.toString() ?? '',
      dealPrice: detail.dealPrice?.toString() ?? '',
      discountPercent: detail.discountRate != null ? String(Math.round(detail.discountRate * 100)) : '',
      seller: detail.seller ?? '',
      dealCondition: detail.dealCondition ?? '',
      expiryInfo: detail.expiryInfo ?? '',
      summaryKo: detail.summaryKo ?? '',
    })
  }, [detail])

  const buildPayload = (): UpdateDealRequest => {
    const toInt = (s: string) => (s.trim() === '' ? null : Number(s))
    return {
      drinkName: form.drinkName.trim() || null,
      drinkCategory: form.drinkCategory || null,
      originalPrice: toInt(form.originalPrice),
      dealPrice: toInt(form.dealPrice),
      discountRate: form.discountPercent.trim() === '' ? null : Number(form.discountPercent) / 100,
      seller: form.seller.trim() || null,
      dealCondition: form.dealCondition.trim() || null,
      expiryInfo: form.expiryInfo.trim() || null,
      summaryKo: form.summaryKo.trim() || null,
    }
  }

  const goList = () => navigate('/admin/deals')

  const approveMut = useMutation({
    mutationFn: () => adminDealApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'deals'] }); goList() },
  })
  const rejectMut = useMutation({
    mutationFn: () => adminDealApi.reject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'deals'] }); goList() },
  })
  const saveMut = useMutation({
    mutationFn: () => adminDealApi.update(id, buildPayload()),
    onSuccess: (updated) => {
      qc.setQueryData(['admin', 'deals', id], updated)
      qc.invalidateQueries({ queryKey: ['admin', 'deals'], exact: false })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const busy = approveMut.isPending || rejectMut.isPending || saveMut.isPending

  const onApprove = () => {
    if (!window.confirm('이 핫딜을 승인하고 사용자에게 노출하시겠습니까?')) return
    approveMut.mutate()
  }
  const onReject = () => {
    if (!window.confirm('이 핫딜을 반려하시겠습니까? (노출되지 않습니다)')) return
    rejectMut.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" className="text-primary-800" />
      </div>
    )
  }
  if (!detail) {
    return (
      <div className="p-6">
        <p className="text-neutral-500">핫딜을 찾을 수 없습니다.</p>
        <button onClick={goList} className="mt-3 text-sm text-primary-700 hover:underline">← 목록으로</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={goList} className="text-sm text-neutral-500 hover:text-neutral-800">← 목록</button>
        <div className="flex items-center gap-2">
          <DealStatusBadge status={detail.status} />
          {detail.isVisible && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              노출 중
            </span>
          )}
        </div>
      </div>

      {/* 수집 메타 + 원문 */}
      <div className="bg-neutral-50 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Meta label="출처" value={siteLabel(detail.sourceSite)} />
        <Meta label="수집일시" value={detail.crawledAt ? formatDateTime(detail.crawledAt) : '-'} />
        <Meta label="신뢰도"><ConfidenceBadge score={detail.confidenceScore} /></Meta>
        <div>
          <p className="text-xs text-neutral-500 mb-1">원문</p>
          <div className="flex items-center gap-2">
            <SourceLinkButton url={detail.sourceUrl} />
            <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary-700 hover:underline truncate max-w-[140px]">
              교차검증 열기
            </a>
          </div>
        </div>
      </div>

      {/* AI 분석 요약 */}
      {detail.summaryKo && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">AI 분석 요약</p>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{detail.summaryKo}</p>
        </div>
      )}

      {/* 편집 폼 */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">AI 분석 결과 (수정 가능)</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="주류명">
            <input className={inputCls} value={form.drinkName}
              onChange={(e) => setForm({ ...form, drinkName: e.target.value })} />
          </Field>
          <Field label="카테고리">
            <select className={inputCls} value={form.drinkCategory}
              onChange={(e) => setForm({ ...form, drinkCategory: e.target.value })}>
              <option value="">(미지정)</option>
              {DEAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="정상가">
            <input type="number" className={inputCls} value={form.originalPrice}
              onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
          </Field>
          <Field label="할인가">
            <input type="number" className={inputCls} value={form.dealPrice}
              onChange={(e) => setForm({ ...form, dealPrice: e.target.value })} />
          </Field>
          <Field label="할인율 (%)">
            <input type="number" min={0} max={100} className={inputCls} value={form.discountPercent}
              onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
          </Field>
          <Field label={`통화 (${detail.currency ?? 'KRW'})`}>
            <input className={`${inputCls} bg-neutral-50 text-neutral-400`} value={detail.currency ?? 'KRW'} disabled />
          </Field>
          <Field label="판매처">
            <input className={inputCls} value={form.seller}
              onChange={(e) => setForm({ ...form, seller: e.target.value })} />
          </Field>
          <Field label="기간 정보">
            <input className={inputCls} value={form.expiryInfo}
              onChange={(e) => setForm({ ...form, expiryInfo: e.target.value })} />
          </Field>
        </div>

        <Field label="조건">
          <textarea rows={2} className={inputCls} value={form.dealCondition}
            onChange={(e) => setForm({ ...form, dealCondition: e.target.value })} />
        </Field>
        <Field label="요약 (summaryKo)">
          <textarea rows={3} className={inputCls} value={form.summaryKo}
            onChange={(e) => setForm({ ...form, summaryKo: e.target.value })} />
        </Field>

        <p className="text-xs text-neutral-400">
          현재 할인가 미리보기: {formatPrice(form.dealPrice.trim() === '' ? null : Number(form.dealPrice), detail.currency)}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => saveMut.mutate()}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium bg-neutral-800 text-white rounded-lg
              hover:bg-neutral-900 transition-colors disabled:opacity-40"
          >
            {saveMut.isPending ? '저장 중...' : '수정 저장'}
          </button>
          {saved && <span className="text-sm text-green-600">저장되었습니다.</span>}
          {saveMut.isError && <span className="text-sm text-red-500">저장 실패. 다시 시도해주세요.</span>}
        </div>
      </div>

      {/* 승인/반려 액션 */}
      <div className="flex flex-wrap items-center justify-end gap-2 bg-white rounded-xl shadow-sm p-4">
        <button
          onClick={onReject}
          disabled={busy}
          className="px-4 py-2 text-sm font-medium border border-red-300 text-red-600 rounded-lg
            hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          {rejectMut.isPending ? '처리 중...' : '반려'}
        </button>
        <button
          onClick={onApprove}
          disabled={busy}
          className="px-5 py-2 text-sm font-medium bg-primary-800 text-white rounded-lg
            hover:bg-primary-900 transition-colors disabled:opacity-40"
        >
          {approveMut.isPending ? '처리 중...' : '승인 후 노출'}
        </button>
      </div>
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-neutral-500 mb-1">{label}</span>
      {children}
    </label>
  )
}

function Meta({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      {children ?? <p className="text-neutral-800">{value}</p>}
    </div>
  )
}
