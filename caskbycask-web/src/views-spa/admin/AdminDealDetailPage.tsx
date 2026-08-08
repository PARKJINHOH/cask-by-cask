import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Spinner from '@/shared/components/Spinner'
import { formatDateTime } from '@/shared/utils/format'
import { adminDealApi } from '@/domain/admin/api/adminDealApi'
import { DEAL_CATEGORIES, type CreateDealRequest, type DealPostDetail, type UpdateDealRequest } from '@/domain/admin/types/deal.types'
import type { StoreType } from '@/domain/pricetracker/types/pricetracker.types'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritDetail, SpiritListItem, SpiritVariant } from '@/domain/spirit/types/spirit.types'
import {
  ConfidenceBadge, DealStatusBadge, SourceLinkButton, formatDiscount, formatPrice,
  isOpenableSourceUrl, siteLabel,
} from '@/domain/admin/components/dealUi'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import { formatPriceInput, parsePriceInput } from '@/shared/utils/moneyInput'

const EMPTY_FORM = {
  drinkName: '', drinkCategory: '', volumeMl: '', originalPrice: '0', dealPrice: '0',
  seller: '', dealCondition: '', summaryKo: '', currency: 'KRW',
  // 등록 모드 전용 — 수정 모드에서는 상단 메타(출처/수집 일시)로 표시된다.
  sourceUrl: '', observedAt: todayString(),
}

function todayString(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
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
  // 라우트가 /admin/deals/new 이면 등록 모드 — 상세 조회 없이 빈 폼으로 시작한다.
  const isCreateMode = idParam === undefined || idParam === 'new'
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
  const debouncedSpiritKeyword = useDebouncedValue(spiritKeyword)
  const [spiritSearchResults, setSpiritSearchResults] = useState<SpiritListItem[]>([])
  const [searchingSpirits, setSearchingSpirits] = useState(false)
  const [spiritSearchError, setSpiritSearchError] = useState(false)
  const [variantPicker, setVariantPicker] = useState<SpiritConnectionPicker | null>(null)
  const [loadingVariantSpiritId, setLoadingVariantSpiritId] = useState<number | null>(null)

  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin', 'deals', id],
    queryFn: () => adminDealApi.detail(id),
    enabled: !isCreateMode && Number.isFinite(id),
    staleTime: 0,
  })

  useEffect(() => {
    if (!detail) return
    setForm({
      drinkName: detail.drinkName ?? '',
      drinkCategory: detail.drinkCategory ?? '',
      volumeMl: detail.volumeMl == null ? '' : String(detail.volumeMl),
      originalPrice: formatPriceInput(detail.originalPrice),
      dealPrice: formatPriceInput(detail.dealPrice),
      seller: detail.seller ?? '',
      dealCondition: detail.dealCondition ?? '',
      summaryKo: detail.summaryKo ?? '',
      currency: detail.currency ?? 'KRW',
      sourceUrl: detail.sourceUrl ?? '',
      observedAt: detail.crawledAt ? detail.crawledAt.slice(0, 10) : todayString(),
    })
    setSpiritId(detail.spiritId)
    setSpiritNameKo(detail.spiritNameKo)
    setSpiritNameEn(detail.spiritNameEn)
    setSpiritVariantLabel(buildDealSpiritVariantLabel(detail))
    setStoreType(detail.storeType ?? 'DOMESTIC')
  }, [detail])

  useEffect(() => {
    let ignore = false
    const keyword = debouncedSpiritKeyword.trim()

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
    ;(async () => {
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
    })()

    return () => {
      ignore = true
    }
  }, [debouncedSpiritKeyword, spiritId])

  const originalPriceValue = parsePriceInput(form.originalPrice)
  const dealPriceValue = parsePriceInput(form.dealPrice)
  const volumeMlValue = parseOptionalVolumeMl(form.volumeMl)
  const discountRate = calculateDiscountRate(originalPriceValue, dealPriceValue)

  const buildPayload = (): UpdateDealRequest => {
    return {
      drinkName: form.drinkName.trim() || null,
      drinkCategory: form.drinkCategory || null,
      volumeMl: volumeMlValue,
      originalPrice: originalPriceValue,
      dealPrice: dealPriceValue,
      discountRate,
      currency: form.currency || 'KRW',
      seller: form.seller.trim() || null,
      dealCondition: form.dealCondition.trim() || null,
      expiryInfo: null,
      summaryKo: form.summaryKo.trim() || null,
      spiritId,
      storeType,
    }
  }

  const buildCreatePayload = (): CreateDealRequest => ({
    spiritId: spiritId as number,
    drinkName: form.drinkName.trim() || null,
    drinkCategory: form.drinkCategory || null,
    volumeMl: volumeMlValue,
    originalPrice: originalPriceValue,
    dealPrice: dealPriceValue,
    currency: form.currency || 'KRW',
    seller: form.seller.trim() || null,
    dealCondition: form.dealCondition.trim() || null,
    expiryInfo: null,
    summaryKo: form.summaryKo.trim() || null,
    storeType,
    sourceUrl: form.sourceUrl.trim() || null,
    observedAt: form.observedAt || null,
  })

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
        title: [
          spiritDetail.nameKo,
          spiritDetail.seriesIdentifier || spiritDetail.seriesIdentifierEn,
        ].filter(Boolean).join(' '),
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
  const createMut = useMutation({
    mutationFn: () => adminDealApi.create(buildCreatePayload()),
    onSuccess: () => {
      invalidateDealQueries()
      goList()
    },
  })

  const busy = approveMut.isPending || deleteMut.isPending || updateMut.isPending || createMut.isPending

  const validatePrices = (): boolean => {
    const dp = dealPriceValue
    const op = originalPriceValue
    if (!Number.isFinite(op) || op <= 0) {
      window.alert('정상가는 0보다 큰 금액을 입력해주세요.')
      return false
    }
    if (!Number.isFinite(dp) || dp <= 0) {
      window.alert('할인가는 0보다 큰 금액을 입력해주세요.')
      return false
    }
    if (form.volumeMl !== '' && volumeMlValue == null) {
      window.alert('용량은 1~100,000ml 사이의 정수로 입력해주세요.')
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
    if (!window.confirm('이 가격 정보를 삭제하시겠습니까? 삭제 후에는 목록에서 사라집니다.')) return
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

  const onCreate = () => {
    if (!spiritId) {
      window.alert('가격을 등록하려면 등록된 주류를 먼저 연결해주세요.')
      return
    }
    if (!validatePrices()) return
    if (!form.observedAt) {
      window.alert('가격 확인일을 입력해주세요. 가격 차트의 기준 날짜가 됩니다.')
      return
    }
    if (!window.confirm('이 가격을 등록하시겠습니까? 등록 즉시 주류 상세의 가격 차트에 노출됩니다.')) return
    createMut.mutate()
  }

  if (!isCreateMode && isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" className="text-primary-800" />
      </div>
    )
  }
  if (!isCreateMode && !detail) {
    return (
      <div className="p-6">
        <p className="text-neutral-500">가격 정보를 찾을 수 없습니다.</p>
        <button onClick={goList} className="mt-3 text-sm text-primary-700 hover:underline">목록으로</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={goList} className="text-sm text-neutral-500 hover:text-neutral-800">목록</button>
        <div className="flex items-center gap-2">
          {isCreateMode ? (
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-800">
              관리자 직접 등록
            </span>
          ) : (
            <>
              <DealStatusBadge status={detail!.status} />
              {detail!.isVisible && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  노출 중
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {isCreateMode ? (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div>
            <h1 className="text-lg font-bold text-neutral-900">가격 직접 등록</h1>
            <p className="mt-1 text-sm text-neutral-500">
              사용자 제보나 크롤러 수집을 기다리지 않고 관리자가 확인한 가격을 바로 등록합니다.
              검토 대기를 건너뛰고 <strong className="font-semibold text-neutral-700">등록 즉시 가격 차트에 노출</strong>되므로
              금액·용량·확인일을 반드시 교차검증한 값으로 입력해주세요.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="가격 확인일" required>
              <input
                type="date"
                required
                aria-required="true"
                max={todayString()}
                className={inputCls}
                value={form.observedAt}
                onChange={(e) => setForm({ ...form, observedAt: e.target.value })}
              />
            </Field>
            <Field label="출처 URL (선택)">
              <div>
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://..."
                  className={inputCls}
                  value={form.sourceUrl}
                  onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-neutral-400">
                  전단·매장 확인처럼 원문 링크가 없으면 비워두세요. 내부 식별키가 자동 생성됩니다.
                </p>
              </div>
            </Field>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-50 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Meta label="출처" value={siteLabel(detail!.sourceSite)} />
          <Meta label="확인 일시" value={detail!.crawledAt ? formatDateTime(detail!.crawledAt) : '-'} />
          <Meta label="신뢰도"><ConfidenceBadge score={detail!.confidenceScore} /></Meta>
          <div>
            <p className="text-xs text-neutral-500 mb-1">원문</p>
            {isOpenableSourceUrl(detail!.sourceUrl) ? (
              <div className="flex items-center gap-2">
                <SourceLinkButton url={detail!.sourceUrl} />
                <a
                  href={detail!.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-700 hover:underline truncate max-w-[140px]"
                >
                  새 창에서 열기
                </a>
              </div>
            ) : (
              <p className="text-xs text-neutral-400">원문 없음 (관리자 직접 등록)</p>
            )}
          </div>
        </div>
      )}

      {!isCreateMode && detail!.summaryKo && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-1">AI 분석 요약</p>
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">{detail!.summaryKo}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          {isCreateMode ? '가격 정보' : 'AI 분석 결과 및 노출 정보'}
        </p>
        <RequiredFieldsNotice admin />

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
          <Field label="병 용량 (ml)">
            <div>
              <input
                type="text"
                inputMode="numeric"
                className={inputCls}
                value={form.volumeMl}
                onChange={(e) => setForm({ ...form, volumeMl: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="원문에서 확인되지 않으면 비워두기"
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                병 1개 기준입니다. 70cl은 700ml로 입력하며, 묶음 총액은 병당 가격으로 보정하지 않으면 승인하지 않습니다.
              </p>
            </div>
          </Field>
          <Field label="정상가" required>
            <input
              type="text"
              inputMode="numeric"
              required
              aria-required="true"
              className={inputCls}
              value={form.originalPrice}
              onChange={(e) => setForm({ ...form, originalPrice: formatPriceInput(e.target.value) })}
            />
          </Field>
          <Field label="할인가" required>
            <div>
              <input
                type="text"
                inputMode="numeric"
                required
                aria-required="true"
                className={inputCls}
                value={form.dealPrice}
                onChange={(e) => setForm({ ...form, dealPrice: formatPriceInput(e.target.value) })}
              />
              {isCreateMode && (
                <p className="mt-1 text-[11px] text-neutral-400">
                  차트에 찍히는 실제 가격입니다. 할인이 아닌 평시 시세라면 정상가와 같은 금액을 입력하세요.
                </p>
              )}
            </div>
          </Field>
          <Field label="할인율">
            <div className={`${inputCls} bg-neutral-50 text-neutral-800 tabular-nums`}>
              {formatDiscount(discountRate)}
            </div>
          </Field>
          <Field label="통화" required>
            <div>
              <select
                required
                aria-required="true"
                disabled={isCreateMode}
                className={`${inputCls}${isCreateMode ? ' bg-neutral-50 text-neutral-500' : ''}`}
                value={isCreateMode ? 'KRW' : form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="KRW">원화 (KRW)</option>
                {!isCreateMode && <option value="USD">달러 (USD)</option>}
                {!isCreateMode && <option value="JPY">엔화 (JPY)</option>}
                {!isCreateMode && <option value="TWD">대만 달러 (TWD)</option>}
                {!isCreateMode && <option value="HKD">홍콩 달러 (HKD)</option>}
                {!isCreateMode && <option value="SGD">싱가포르 달러 (SGD)</option>}
              </select>
              {isCreateMode && (
                <p className="mt-1 text-[11px] text-neutral-400">
                  가격 차트는 이 금액을 원화로 그대로 집계합니다(환율 환산 없음).
                  외화 가격은 환산이 필요하므로 '가격 등록 승인' 경로를 이용해주세요.
                </p>
              )}
            </div>
          </Field>
          <Field label="판매처">
            <input
              className={inputCls}
              value={form.seller}
              onChange={(e) => setForm({ ...form, seller: e.target.value })}
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
                        <span className="font-medium text-neutral-800">
                          {formatSpiritSearchName(sp.nameKo, sp.seriesIdentifier)}
                        </span>
                        {sp.nameEn && (
                          <span className="text-xs text-neutral-400 ml-2">
                            {formatSpiritSearchName(
                              sp.nameEn,
                              sp.seriesIdentifierEn || sp.seriesIdentifier,
                            )}
                          </span>
                        )}
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
          현재 가격: {formatPrice(originalPriceValue, form.currency)} / {formatPrice(dealPriceValue, form.currency)}
          {' '}({formatDiscount(discountRate)})
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl shadow-sm p-4">
        {isCreateMode ? (
          <>
            <button
              onClick={goList}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium border border-neutral-300 text-neutral-600 rounded-lg
                hover:bg-neutral-50 transition-colors disabled:opacity-40"
            >
              취소
            </button>
            <button
              onClick={onCreate}
              disabled={busy}
              className="px-5 py-2 text-sm font-medium bg-primary-800 text-white rounded-lg
                hover:bg-primary-900 transition-colors disabled:opacity-40"
            >
              {createMut.isPending ? '등록 중...' : '등록 후 노출'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onDelete}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium border border-neutral-300 text-neutral-600 rounded-lg
                hover:bg-neutral-50 transition-colors disabled:opacity-40"
            >
              {deleteMut.isPending ? '삭제 중...' : '삭제'}
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {detail!.status === 'APPROVED' ? (
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
          </>
        )}
      </div>
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'

// 금액 입력 포맷·파싱은 공용 유틸(shared/utils/moneyInput)을 쓴다 —
// 화면마다 따로 구현하면 콤마 규칙이 어긋난다.

function calculateDiscountRate(originalPrice: number, dealPrice: number): number {
  if (originalPrice <= 0 || dealPrice <= 0 || originalPrice <= dealPrice) return 0
  return Math.round(((originalPrice - dealPrice) / originalPrice) * 10000) / 10000
}

function formatSpiritSearchName(name: string, seriesIdentifier?: string | null): string {
  return seriesIdentifier ? `${name} (${seriesIdentifier})` : name
}

function parseOptionalVolumeMl(value: string): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100000 ? parsed : null
}

function toConnectionOption(spirit: SpiritDetail | SpiritVariant): SpiritConnectionOption {
  const commonDetail = 'commonDetail' in spirit ? spirit.commonDetail : null
  const bottledDate = 'bottledDate' in spirit ? spirit.bottledDate : commonDetail?.bottledDate
  return {
    id: spirit.id,
    nameKo: spirit.nameKo,
    nameEn: spirit.nameEn,
    category: spirit.category,
    variantLabel: composeVariantLabel({
      variantType: spirit.variantType,
      seriesIdentifier: spirit.seriesIdentifier,
      seriesIdentifierEn: spirit.seriesIdentifierEn,
      variantValue: spirit.variantValue,
      variantValueEn: spirit.variantValueEn,
      bottledDate,
      abv: spirit.abv,
      volumeMl: spirit.volumeMl,
    }),
  }
}

function buildDealSpiritVariantLabel(detail: DealPostDetail): string | null {
  return composeVariantLabel({
    variantType: detail.spiritVariantType,
    seriesIdentifier: detail.spiritSeriesIdentifier,
    seriesIdentifierEn: detail.spiritSeriesIdentifierEn,
    variantValue: detail.spiritVariantValue,
    variantValueEn: detail.spiritVariantValueEn,
    bottledDate: detail.spiritBottledDate,
  })
}

function composeVariantLabel({
  variantType,
  seriesIdentifier,
  seriesIdentifierEn,
  variantValue,
  variantValueEn,
  bottledDate,
  abv,
  volumeMl,
}: {
  variantType?: 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'VINTAGE' | 'NONE' | null
  seriesIdentifier?: string | null
  seriesIdentifierEn?: string | null
  variantValue?: string | null
  variantValueEn?: string | null
  bottledDate?: string | null
  abv?: number | null
  volumeMl?: number | null
}) {
  const parts = [
    variantType && variantType !== 'NONE' ? seriesIdentifier || seriesIdentifierEn : null,
    variantValue || variantValueEn,
    bottledDate ? `병입 ${bottledDate}` : null,
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
        {required && <RequiredMark />}
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
