import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Spinner from '@/shared/components/Spinner'
import { formatDateTime } from '@/shared/utils/format'
import { adminDealApi } from '@/domain/admin/api/adminDealApi'
import { DEAL_CATEGORIES, type DealPostDetail, type UpdateDealRequest } from '@/domain/admin/types/deal.types'
import type { StoreType } from '@/domain/pricetracker/types/pricetracker.types'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritDetail, SpiritListItem, SpiritVariant } from '@/domain/spirit/types/spirit.types'
import {
  ConfidenceBadge, DealStatusBadge, SourceLinkButton, formatPrice, siteLabel,
} from '@/domain/admin/components/dealUi'

const EMPTY_FORM = {
  drinkName: '', drinkCategory: '', originalPrice: '', dealPrice: '',
  discountPercent: '', seller: '', dealCondition: '', expiryInfo: '', summaryKo: '', currency: '',
}

type SpiritConnectionOption = {
  id: number
  nameKo: string
  nameEn: string | null
  category: string
  variantLabel: string | null
}

type SpiritConnectionPicker = {
  title: string
  options: SpiritConnectionOption[]
}

export default function AdminDealDetailPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number(idParam)
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const listReturnTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnTo' in location.state &&
    typeof location.state.returnTo === 'string'
      ? location.state.returnTo
      : '/admin/deals'

  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [spiritId, setSpiritId] = useState<number | null>(null)
  const [spiritNameKo, setSpiritNameKo] = useState<string | null>(null)
  const [spiritNameEn, setSpiritNameEn] = useState<string | null>(null)
  const [spiritVariantLabel, setSpiritVariantLabel] = useState<string | null>(null)
  const [storeType, setStoreType] = useState<StoreType>('DOMESTIC')

  const [spiritKeyword, setSpiritKeyword] = useState('')
  const [spiritSearchResults, setSpiritSearchResults] = useState<SpiritListItem[]>([])
  const [searchingSpirits, setSearchingSpirits] = useState(false)
  const [spiritSearchError, setSpiritSearchError] = useState(false)
  const [variantPicker, setVariantPicker] = useState<SpiritConnectionPicker | null>(null)
  const [loadingVariantSpiritId, setLoadingVariantSpiritId] = useState<number | null>(null)

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
      currency: detail.currency ?? 'KRW',
    })
    setSpiritId(detail.spiritId)
    setSpiritNameKo(detail.spiritNameKo)
    setSpiritNameEn(detail.spiritNameEn)
    setSpiritVariantLabel(buildDealSpiritVariantLabel(detail))
    setStoreType(detail.storeType ?? 'DOMESTIC')
  }, [detail])

  useEffect(() => {
    let ignore = false
    const keyword = spiritKeyword.trim()

    setSpiritSearchError(false)
    setVariantPicker(null)
    if (spiritId || keyword.length === 0) {
      setSpiritSearchResults([])
      setSearchingSpirits(false)
      return () => {
        ignore = true
      }
    }

    setSearchingSpirits(true)
    const timer = window.setTimeout(async () => {
      try {
        const res = await spiritApi.search({ keyword, page: 0, size: 20 })
        if (!ignore) {
          setSpiritSearchResults(res.data.data?.content ?? [])
        }
      } catch (e) {
        console.error(e)
        if (!ignore) {
          setSpiritSearchResults([])
          setSpiritSearchError(true)
        }
      } finally {
        if (!ignore) {
          setSearchingSpirits(false)
        }
      }
    }, 250)

    return () => {
      ignore = true
      window.clearTimeout(timer)
    }
  }, [spiritKeyword, spiritId])

  const buildPayload = (): UpdateDealRequest => {
    const toInt = (s: string) => {
      if (s.trim() === '') return null
      const value = Number(s)
      return Number.isFinite(value) ? value : null
    }
    const discountRateValue = form.discountPercent.trim() === ''
      ? null
      : Number(form.discountPercent) / 100

    return {
      drinkName: form.drinkName.trim() || null,
      drinkCategory: form.drinkCategory || null,
      originalPrice: toInt(form.originalPrice),
      dealPrice: toInt(form.dealPrice),
      discountRate: discountRateValue != null && Number.isFinite(discountRateValue) ? discountRateValue : null,
      currency: form.currency || 'KRW',
      seller: form.seller.trim() || null,
      dealCondition: form.dealCondition.trim() || null,
      expiryInfo: form.expiryInfo.trim() || null,
      summaryKo: form.summaryKo.trim() || null,
      spiritId,
      storeType,
    }
  }

  const goList = () => navigate(listReturnTo)
  const invalidateDealQueries = () => qc.invalidateQueries({ queryKey: ['admin', 'deals'] })

  const connectSpirit = (option: SpiritConnectionOption) => {
    setSpiritId(option.id)
    setSpiritNameKo(option.nameKo)
    setSpiritNameEn(option.nameEn)
    setSpiritVariantLabel(option.variantLabel)
    setSpiritSearchResults([])
    setSpiritKeyword('')
    setVariantPicker(null)
  }

  const openSpiritConnectionPicker = async (spirit: SpiritListItem) => {
    setLoadingVariantSpiritId(spirit.id)
    setSpiritSearchError(false)
    try {
      const [detailRes, variantsRes] = await Promise.all([
        spiritApi.getDetail(spirit.id),
        spiritApi.getVariants(spirit.id),
      ])
      const spiritDetail = detailRes.data.data!
      const variantOptions = (variantsRes.data.data ?? []).map(toConnectionOption)

      if (variantOptions.length === 0) {
        connectSpirit(toConnectionOption(spiritDetail))
        return
      }

      const options = spiritDetail.parentId
        ? [
            toConnectionOption(spiritDetail),
            ...variantOptions.filter((option) => option.id !== spiritDetail.id),
          ].sort((a, b) => a.id - b.id)
        : variantOptions

      if (options.length === 1) {
        connectSpirit(options[0])
        return
      }

      setVariantPicker({
        title: spiritDetail.nameKo,
        options,
      })
    } catch (e) {
      console.error(e)
      setSpiritSearchError(true)
    } finally {
      setLoadingVariantSpiritId(null)
    }
  }

  const approveMut = useMutation({
    mutationFn: () => adminDealApi.approve(id, buildPayload()),
    onSuccess: () => {
      invalidateDealQueries()
      goList()
    },
  })
  const deleteMut = useMutation({
    mutationFn: () => adminDealApi.delete(id),
    onSuccess: () => {
      invalidateDealQueries()
      goList()
    },
  })
  const updateMut = useMutation({
    mutationFn: () => adminDealApi.update(id, buildPayload()),
    onSuccess: () => {
      invalidateDealQueries()
      goList()
    },
  })

  const busy = approveMut.isPending || deleteMut.isPending || updateMut.isPending

  const validatePrices = (): boolean => {
    const dp = Number(form.dealPrice)
    const op = Number(form.originalPrice)
    if (!Number.isFinite(op) || op <= 0) {
      window.alert('정상가는 0보다 큰 금액을 입력해주세요.')
      return false
    }
    if (!Number.isFinite(dp) || dp <= 0) {
      window.alert('할인가는 0보다 큰 금액을 입력해주세요.')
      return false
    }
    return true
  }
  const onApprove = () => {
    if (!spiritId) {
      window.alert('노출하려면 등록된 주류를 먼저 연결해주세요.')
      return
    }
    if (!validatePrices()) return
    if (!window.confirm('현재 수정 내용을 저장하고 사용자에게 노출하시겠습니까?')) return
    approveMut.mutate()
  }

  const onDelete = () => {
    if (!window.confirm('이 핫딜을 삭제하시겠습니까? 삭제 후에는 목록에서 사라집니다.')) return
    deleteMut.mutate()
  }
  const onUpdate = () => {
    if (!spiritId) {
      window.alert('수정하려면 등록된 주류를 먼저 연결해주세요.')
      return
    }
    if (!validatePrices()) return
    if (!window.confirm('현재 수정 내용을 저장하시겠습니까?')) return
    updateMut.mutate()
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
        <button onClick={goList} className="mt-3 text-sm text-primary-700 hover:underline">목록으로</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={goList} className="text-sm text-neutral-500 hover:text-neutral-800">목록</button>
        <div className="flex items-center gap-2">
          <DealStatusBadge status={detail.status} />
          {detail.isVisible && (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              노출 중
            </span>
          )}
        </div>
      </div>

      <div className="bg-neutral-50 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Meta label="출처" value={siteLabel(detail.sourceSite)} />
        <Meta label="수집 일시" value={detail.crawledAt ? formatDateTime(detail.crawledAt) : '-'} />
        <Meta label="신뢰도"><ConfidenceBadge score={detail.confidenceScore} /></Meta>
        <div>
          <p className="text-xs text-neutral-500 mb-1">원문</p>
          <div className="flex items-center gap-2">
            <SourceLinkButton url={detail.sourceUrl} />
            <a
              href={detail.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-700 hover:underline truncate max-w-[140px]"
            >
              새 창에서 열기
            </a>
          </div>
        </div>
      </div>

      {detail.summaryKo && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">AI 분석 요약</p>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{detail.summaryKo}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          AI 분석 결과 및 노출 정보
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="주류명">
            <input
              className={inputCls}
              value={form.drinkName}
              onChange={(e) => setForm({ ...form, drinkName: e.target.value })}
            />
          </Field>
          <Field label="카테고리">
            <select
              className={inputCls}
              value={form.drinkCategory}
              onChange={(e) => setForm({ ...form, drinkCategory: e.target.value })}
            >
              <option value="">미지정</option>
              {DEAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="정상가" required>
            <input
              type="number"
              className={inputCls}
              value={form.originalPrice}
              onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
            />
          </Field>
          <Field label="할인가" required>
            <input
              type="number"
              className={inputCls}
              value={form.dealPrice}
              onChange={(e) => setForm({ ...form, dealPrice: e.target.value })}
            />
          </Field>
          <Field label="할인율 (%)">
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls}
              value={form.discountPercent}
              onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
            />
          </Field>
          <Field label="통화" required>
            <select
              className={inputCls}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="KRW">원화 (KRW)</option>
              <option value="USD">달러 (USD)</option>
              <option value="JPY">엔화 (JPY)</option>
              <option value="TWD">대만 달러 (TWD)</option>
              <option value="HKD">홍콩 달러 (HKD)</option>
              <option value="SGD">싱가포르 달러 (SGD)</option>
            </select>
          </Field>
          <Field label="판매처">
            <input
              className={inputCls}
              value={form.seller}
              onChange={(e) => setForm({ ...form, seller: e.target.value })}
            />
          </Field>
          <Field label="기간 정보">
            <input
              className={inputCls}
              value={form.expiryInfo}
              onChange={(e) => setForm({ ...form, expiryInfo: e.target.value })}
            />
          </Field>
          <Field label="판매처 유형">
            <div className="flex gap-1.5 mt-0.5">
              {(['DOMESTIC', 'OVERSEAS', 'DUTYFREE'] as const).map((t_) => (
                <button
                  type="button"
                  key={t_}
                  onClick={() => setStoreType(t_)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    storeType === t_
                      ? 'bg-primary-800 text-white border-primary-800'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {t_ === 'DOMESTIC' ? '국내' : t_ === 'OVERSEAS' ? '해외' : '면세'}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">등록된 주류 연결</p>
          {spiritId ? (
            <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-lg p-3">
              <div>
                <p className="font-semibold text-neutral-800">{spiritNameKo}</p>
                {spiritNameEn && <p className="text-xs text-neutral-400">{spiritNameEn}</p>}
                {spiritVariantLabel && <p className="text-xs text-primary-700 mt-1">{spiritVariantLabel}</p>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSpiritId(null)
                  setSpiritNameKo(null)
                  setSpiritNameEn(null)
                  setSpiritVariantLabel(null)
                }}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                연결 해제
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                placeholder="주류명 검색 (한글/영문)"
                value={spiritKeyword}
                onChange={(e) => setSpiritKeyword(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              {searchingSpirits && (
                <p className="text-xs text-neutral-400 font-medium">검색 중...</p>
              )}
              {spiritSearchError && (
                <p className="text-xs text-red-500 font-medium">검색에 실패했습니다. 다시 입력해주세요.</p>
              )}
              {spiritSearchResults.length > 0 && (
                <div className="max-h-44 overflow-y-auto border border-neutral-200 rounded-lg bg-white divide-y divide-neutral-100 text-sm">
                  {spiritSearchResults.map((sp) => (
                    <button
                      type="button"
                      key={sp.id}
                      onClick={() => openSpiritConnectionPicker(sp)}
                      disabled={loadingVariantSpiritId === sp.id}
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-neutral-800">{sp.nameKo}</span>
                        {sp.nameEn && <span className="text-xs text-neutral-400 ml-2">{sp.nameEn}</span>}
                      </div>
                      <span className="text-xs text-neutral-400 shrink-0">
                        {loadingVariantSpiritId === sp.id ? '확인 중...' : sp.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {variantPicker && (
                <div className="border border-primary-100 rounded-lg bg-white p-3 space-y-2">
                  <p className="text-xs font-semibold text-neutral-500">
                    {variantPicker.title} 배치/병입 선택
                  </p>
                  <div className="max-h-44 overflow-y-auto divide-y divide-neutral-100">
                    {variantPicker.options.map((option) => (
                      <button
                        type="button"
                        key={option.id}
                        onClick={() => connectSpirit(option)}
                        className="w-full text-left py-2 hover:bg-neutral-50 rounded-md px-2"
                      >
                        <p className="text-sm font-medium text-neutral-800">{option.nameKo}</p>
                        {option.nameEn && <p className="text-xs text-neutral-400">{option.nameEn}</p>}
                        <p className="text-xs text-primary-700 mt-0.5">
                          {option.variantLabel ?? `ID ${option.id}`}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!searchingSpirits && spiritKeyword.trim() !== '' && spiritSearchResults.length === 0 && !spiritSearchError && (
                <p className="text-xs text-neutral-400 font-medium">검색 결과가 없습니다.</p>
              )}
            </div>
          )}
        </div>

        <Field label="조건">
          <textarea
            rows={2}
            className={inputCls}
            value={form.dealCondition}
            onChange={(e) => setForm({ ...form, dealCondition: e.target.value })}
          />
        </Field>
        <Field label="요약">
          <textarea
            rows={3}
            className={inputCls}
            value={form.summaryKo}
            onChange={(e) => setForm({ ...form, summaryKo: e.target.value })}
          />
        </Field>

        <p className="text-xs text-neutral-400">
          현재 할인가 미리보기: {formatPrice(form.dealPrice.trim() === '' ? null : Number(form.dealPrice), form.currency)}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl shadow-sm p-4">
        <button
          onClick={onDelete}
          disabled={busy}
          className="px-4 py-2 text-sm font-medium border border-neutral-300 text-neutral-600 rounded-lg
            hover:bg-neutral-50 transition-colors disabled:opacity-40"
        >
          {deleteMut.isPending ? '삭제 중...' : '삭제'}
        </button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {detail.status === 'APPROVED' ? (
            <button
              onClick={onUpdate}
              disabled={busy}
              className="px-5 py-2 text-sm font-medium bg-primary-800 text-white rounded-lg
                hover:bg-primary-900 transition-colors disabled:opacity-40"
            >
              {updateMut.isPending ? '수정 중...' : '수정'}
            </button>
          ) : (
            <button
              onClick={onApprove}
              disabled={busy}
              className="px-5 py-2 text-sm font-medium bg-primary-800 text-white rounded-lg
                hover:bg-primary-900 transition-colors disabled:opacity-40"
            >
              {approveMut.isPending ? '처리 중...' : '승인 후 노출'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'

function toConnectionOption(spirit: SpiritDetail | SpiritVariant): SpiritConnectionOption {
  const commonDetail = 'commonDetail' in spirit ? spirit.commonDetail : null
  const batchNo = 'batchNo' in spirit ? spirit.batchNo : commonDetail?.batchNo
  const bottledDate = 'bottledDate' in spirit ? spirit.bottledDate : commonDetail?.bottledDate
  return {
    id: spirit.id,
    nameKo: spirit.nameKo,
    nameEn: spirit.nameEn,
    category: spirit.category,
    variantLabel: composeVariantLabel({
      variantValue: spirit.variantValue,
      variantValueEn: spirit.variantValueEn,
      batchNo,
      bottledDate,
      bottledYear: spirit.bottledYear,
      abv: spirit.abv,
      volumeMl: spirit.volumeMl,
    }),
  }
}

function buildDealSpiritVariantLabel(detail: DealPostDetail): string | null {
  return composeVariantLabel({
    variantValue: detail.spiritVariantValue,
    variantValueEn: detail.spiritVariantValueEn,
    batchNo: detail.spiritBatchNo,
    bottledDate: detail.spiritBottledDate,
  })
}

function composeVariantLabel({
  variantValue,
  variantValueEn,
  batchNo,
  bottledDate,
  bottledYear,
  abv,
  volumeMl,
}: {
  variantValue?: string | null
  variantValueEn?: string | null
  batchNo?: string | null
  bottledDate?: string | null
  bottledYear?: number | null
  abv?: number | null
  volumeMl?: number | null
}) {
  const parts = [
    variantValue || variantValueEn || (batchNo ? `Batch ${batchNo}` : null),
    bottledDate ? `병입 ${bottledDate}` : bottledYear ? `${bottledYear} 병입` : null,
    abv != null ? `${abv}%` : null,
    volumeMl != null ? `${volumeMl}ml` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : null
}

function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-neutral-500 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
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
