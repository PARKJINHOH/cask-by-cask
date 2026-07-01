import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import { useSpiritDetail } from '@/domain/spirit/hooks/useSpiritDetail'
import { priceTrackerApi } from '@/domain/pricetracker/api/priceTrackerApi'
import type {
  StoreType,
  DiscountType,
  DutyFreeChannel,
  DiscountItemInput,
  StoreSearchResult,
  PriceReportImageUpload,
} from '@/domain/pricetracker/types/pricetracker.types'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'
import { getLocalizedSpiritListNames } from '@/domain/spirit/utils/spiritDisplayName'
import { formatOptionalPriceInput, parsePriceInput } from '@/shared/utils/moneyInput'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

const DISCOUNT_TYPES: DiscountType[] = ['PAYMENT', 'BUNDLE', 'COUPON', 'OTHER']
const DUTYFREE_CHANNELS: DutyFreeChannel[] = ['AIRPORT', 'CITY', 'INFLIGHT', 'ONLINE']

const krw = new Intl.NumberFormat('ko-KR')

export default function PriceRegisterPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ── 대상 술 (spiritId 쿼리파라미터 고정 or 검색) ──────────
  const fixedSpiritId = Number(searchParams.get('spiritId')) || 0
  const { data: fixedSpirit } = useSpiritDetail(fixedSpiritId)
  const [spiritKeyword, setSpiritKeyword] = useState('')
  const debouncedSpiritKeyword = useDebouncedValue(spiritKeyword)
  const [pickedSpirit, setPickedSpirit] = useState<SpiritListItem | null>(null)
  const [spiritOpen, setSpiritOpen] = useState(false)
  const selectedSpirit: SpiritListItem | null = fixedSpirit ?? pickedSpirit
  const fixedSpiritNames = fixedSpirit ? getLocalizedSpiritListNames(fixedSpirit, i18n.language) : null
  const pickedSpiritNames = pickedSpirit ? getLocalizedSpiritListNames(pickedSpirit, i18n.language) : null

  // ── 매장 ─────────────────────────────────────────────
  const [storeType, setStoreType] = useState<StoreType>('DOMESTIC')
  const [storeKeyword, setStoreKeyword] = useState('')
  const debouncedStoreKeyword = useDebouncedValue(storeKeyword)
  const [selectedStore, setSelectedStore] = useState<StoreSearchResult | null>(null)
  const [useSuggest, setUseSuggest] = useState(false)
  const [suggestedStoreName, setSuggestedStoreName] = useState('')
  const [channel, setChannel] = useState<DutyFreeChannel>('AIRPORT')
  const [storeOpen, setStoreOpen] = useState(false)

  const isDutyFree = storeType === 'DUTYFREE'
  const currency = isDutyFree ? 'USD' : 'KRW'
  const moneyUnit = isDutyFree ? '$' : '원'

  // ── 가격 (국내) ──────────────────────────────────────
  const [regularPrice, setRegularPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [payback, setPayback] = useState('')
  const [actualOverride, setActualOverride] = useState('') // 비어있으면 자동계산

  // ── 가격 (면세) ──────────────────────────────────────
  const [basePrice, setBasePrice] = useState('')
  const [discountItems, setDiscountItems] = useState<DiscountItemInput[]>([])
  const [exchangeRate, setExchangeRate] = useState('')

  // ── 공통 ─────────────────────────────────────────────
  const [purchasedAt, setPurchasedAt] = useState('')
  const [description, setDescription] = useState('')
  const [authorMode, setAuthorMode] = useState<'NICKNAME' | 'ANONYMOUS'>('NICKNAME')

  // ── 이미지 ───────────────────────────────────────────
  const [images, setImages] = useState<PriceReportImageUpload[]>([])
  const [imagePublicFlags, setImagePublicFlags] = useState<boolean[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const spiritSearchKeyword = debouncedSpiritKeyword.trim()
  const storeSearchKeyword = debouncedStoreKeyword.trim()

  // ── 자동완성 쿼리 ────────────────────────────────────
  const { data: spiritResults } = useQuery({
    queryKey: ['spiritSearch-register', spiritSearchKeyword],
    queryFn: () => spiritApi.search({ keyword: spiritSearchKeyword, page: 0, size: 8 }),
    select: (res) => res.data.data?.content ?? [],
    enabled: spiritSearchKeyword.length >= 1 && spiritKeyword.trim().length >= 1 && spiritOpen && !fixedSpirit,
    staleTime: 30_000,
  })

  const { data: storeResults } = useQuery({
    queryKey: ['storeSearch', storeSearchKeyword, storeType],
    queryFn: () => priceTrackerApi.searchStores(storeSearchKeyword, storeType),
    select: (res) => res.data.data ?? [],
    enabled: storeSearchKeyword.length >= 1 && storeKeyword.trim().length >= 1 && storeOpen && !useSuggest,
    staleTime: 30_000,
  })

  // ── 자동 계산 ────────────────────────────────────────
  const computedActual = useMemo(() => {
    const s = parsePriceInput(salePrice)
    const p = parsePriceInput(payback)
    return s ? Math.max(s - p, 0) : 0
  }, [salePrice, payback])
  const actualPrice = actualOverride !== '' ? parsePriceInput(actualOverride) : computedActual

  const discountSum = useMemo(
    () => discountItems.reduce((acc, d) => acc + (Number(d.amount) || 0), 0),
    [discountItems],
  )
  const feelPrice = Math.max(parsePriceInput(basePrice) - discountSum, 0) // 면세 체감가 (USD)
  const krwPreview = feelPrice && parsePriceInput(exchangeRate) ? Math.round(feelPrice * parsePriceInput(exchangeRate)) : 0

  // ── 핸들러 ───────────────────────────────────────────
  const handleImageUpload = async (file: File) => {
    if (images.length >= 3) return
    setUploading(true)
    try {
      const res = await priceTrackerApi.uploadImage(file)
      const uploaded = res.data.data
      if (!uploaded) return
      setImages((prev) => [...prev, uploaded])
      setImagePublicFlags((prev) => [...prev, true])
    } finally {
      setUploading(false)
    }
  }
  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
    setImagePublicFlags((prev) => prev.filter((_, i) => i !== idx))
  }

  const addDiscountItem = () =>
    setDiscountItems((prev) => [...prev, { discountType: 'PAYMENT', label: '', amount: 0, sortOrder: prev.length }])
  const removeDiscountItem = (idx: number) => setDiscountItems((prev) => prev.filter((_, i) => i !== idx))
  const patchDiscount = (idx: number, patch: Partial<DiscountItemInput>) =>
    setDiscountItems((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)))

  // ── 유효성 ───────────────────────────────────────────
  const canSubmit = useMemo(() => {
    if (!selectedSpirit) return false
    if (isDutyFree) return parsePriceInput(basePrice) > 0 && parsePriceInput(exchangeRate) > 0
    return parsePriceInput(salePrice) > 0
  }, [selectedSpirit, isDutyFree, basePrice, exchangeRate, salePrice])

  const handleSubmit = async () => {
    if (!selectedSpirit || !canSubmit) return
    setSubmitting(true)
    try {
      await priceTrackerApi.createPriceReport({
        spiritId: selectedSpirit.id,
        storeId: selectedStore?.id ?? null,
        suggestedStoreName: useSuggest ? suggestedStoreName || null : null,
        dutyfreeChannel: isDutyFree && useSuggest ? channel : null,
        currency,
        isAnonymous: authorMode === 'ANONYMOUS',
        regularPrice: !isDutyFree && regularPrice ? parsePriceInput(regularPrice) : null,
        salePrice: isDutyFree ? parsePriceInput(basePrice) : parsePriceInput(salePrice),
        paybackAmount: !isDutyFree && payback ? parsePriceInput(payback) : null,
        finalPrice: isDutyFree ? feelPrice : actualPrice,
        exchangeRate: isDutyFree && exchangeRate ? parsePriceInput(exchangeRate) : null,
        purchasedAt: purchasedAt || null,
        description: description || null,
        imageIds: images.map((i) => i.id),
        imagePublicFlags,
        discountItems: isDutyFree && discountItems.length ? discountItems : undefined,
      })
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">🎉</p>
        <p className="text-lg font-semibold text-neutral-800 mb-2">{t('price.register.success')}</p>
        <button
          onClick={() => navigate('/mypage?tab=priceReports')}
          className="mt-6 px-6 py-2 bg-primary-700 text-white rounded-xl text-sm"
        >
          {t('price.register.goMyPage')}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-sm text-neutral-400 hover:text-neutral-600 mb-4 block">
        ← {t('common.back', '뒤로')}
      </button>
      <h1 className="text-xl font-bold text-neutral-900 mb-6">{t('price.register.title')}</h1>

      <div className="space-y-6">
        {/* 1. 대상 술 */}
        <Section label={t('price.register.spirit')}>
          {fixedSpirit ? (
            <div className="flex items-center gap-3 border border-neutral-200 rounded-xl px-3 py-2.5 bg-neutral-50">
              {fixedSpirit.primaryImageUrl ? (
                <img src={fixedSpirit.primaryImageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">🥃</div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 truncate">
                  {fixedSpiritNames?.primaryName}
                </p>
                <p className="text-xs text-neutral-400 truncate">
                  {fixedSpiritNames?.secondaryName}
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                value={pickedSpirit ? (pickedSpiritNames?.primaryName ?? '') : spiritKeyword}
                onChange={(e) => { setSpiritKeyword(e.target.value); setPickedSpirit(null); setSpiritOpen(true) }}
                onFocus={() => setSpiritOpen(true)}
                placeholder={t('price.register.spiritPlaceholder')}
                className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              {spiritOpen && spiritResults && spiritResults.length > 0 && !pickedSpirit && (
                <ul className="absolute z-10 w-full bg-white border border-neutral-200 rounded-xl mt-1 shadow-lg max-h-52 overflow-y-auto">
                  {spiritResults.map((s) => {
                    const displayName = getLocalizedSpiritListNames(s, i18n.language)
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => { setPickedSpirit(s); setSpiritOpen(false); setSpiritKeyword('') }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                        >
                          <span className="font-medium">{displayName.primaryName}</span>
                          {displayName.secondaryName && <span className="text-neutral-400 ml-2 text-xs">{displayName.secondaryName}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </Section>

        {/* 2. 매장 */}
        <Section label={t('price.register.store')}>
          <div className="flex gap-2 mb-2">
            {(['DOMESTIC', 'OVERSEAS', 'DUTYFREE'] as const).map((tp) => (
              <button
                key={tp}
                onClick={() => { setStoreType(tp); setSelectedStore(null); setUseSuggest(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  storeType === tp ? 'bg-primary-700 text-white border-primary-700' : 'text-neutral-500 border-neutral-200'
                }`}
              >
                {tp === 'DOMESTIC'
                  ? t('price.chart.domestic')
                  : tp === 'OVERSEAS'
                  ? t('price.chart.overseas', '해외')
                  : t('price.chart.dutyfree')}
              </button>
            ))}
            <button
              onClick={() => { setUseSuggest((v) => !v); setSelectedStore(null) }}
              className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                useSuggest ? 'bg-neutral-700 text-white border-neutral-700' : 'text-neutral-400 border-neutral-200'
              }`}
            >
              {t('price.register.suggestStore')}
            </button>
          </div>

          {/* 면세 채널 */}
          {isDutyFree && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DUTYFREE_CHANNELS.map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                    channel === c ? 'bg-primary-50 text-primary-700 border-primary-700' : 'text-neutral-400 border-neutral-200'
                  }`}
                >
                  {t(`price.register.channel.${c}`)}
                </button>
              ))}
            </div>
          )}

          {useSuggest ? (
            <input
              value={suggestedStoreName}
              onChange={(e) => setSuggestedStoreName(e.target.value)}
              placeholder={isDutyFree ? t('price.register.brandPlaceholder') : t('price.register.storePlaceholder')}
              className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          ) : (
            <div className="relative">
              <input
                value={selectedStore ? selectedStore.displayName : storeKeyword}
                onChange={(e) => { setStoreKeyword(e.target.value); setSelectedStore(null); setStoreOpen(true) }}
                onFocus={() => setStoreOpen(true)}
                placeholder={t('price.register.storePlaceholder')}
                className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              {storeOpen && storeResults && storeResults.length > 0 && !selectedStore && (
                <ul className="absolute z-10 w-full bg-white border border-neutral-200 rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto">
                  {storeResults.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => { setSelectedStore(s); setStoreOpen(false); setStoreKeyword('') }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                      >
                        {s.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Section>

        {/* 3. 가격 */}
        <Section label={`${t('price.register.priceSection')} (${currency})`}>
          {!isDutyFree ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label={t('price.register.regularPrice')} value={regularPrice} onChange={setRegularPrice} suffix={moneyUnit} />
                <LabeledInput label={t('price.register.salePrice')} value={salePrice} onChange={setSalePrice} suffix={moneyUnit} required />
                <LabeledInput label={t('price.register.payback')} value={payback} onChange={setPayback} suffix={moneyUnit} />
                <LabeledInput
                  label={t('price.register.finalPrice')}
                  value={actualOverride !== '' ? actualOverride : formatOptionalPriceInput(computedActual)}
                  onChange={setActualOverride}
                  suffix={moneyUnit}
                  hint={t('price.register.autoCalc')}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <LabeledInput label={t('price.register.basePrice')} value={basePrice} onChange={setBasePrice} suffix="$" required />

              {/* 할인 조건 */}
              <div>
                <p className="text-xs text-neutral-400 mb-1.5">{t('price.register.discountItems')}</p>
                <div className="space-y-2">
                  {discountItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <select
                        value={item.discountType}
                        onChange={(e) => patchDiscount(idx, { discountType: e.target.value as DiscountType })}
                        className="border border-neutral-300 rounded-lg px-2 py-1.5 text-xs"
                      >
                        {DISCOUNT_TYPES.map((dt) => (
                          <option key={dt} value={dt}>{t(`price.register.discountType.${dt}`)}</option>
                        ))}
                      </select>
                      <input
                        placeholder={t('price.register.discountLabel')}
                        value={item.label}
                        onChange={(e) => patchDiscount(idx, { label: e.target.value })}
                        className="flex-1 border border-neutral-300 rounded-lg px-2 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="$"
                        value={item.amount ? formatOptionalPriceInput(item.amount) : ''}
                        onChange={(e) => patchDiscount(idx, { amount: parsePriceInput(e.target.value) })}
                        className="w-20 border border-neutral-300 rounded-lg px-2 py-1.5 text-xs"
                      />
                      <button onClick={() => removeDiscountItem(idx)} className="text-neutral-300 hover:text-red-400 text-lg leading-none">×</button>
                    </div>
                  ))}
                  <button onClick={addDiscountItem} className="text-xs text-primary-700 hover:text-primary-800 font-medium">
                    + {t('price.register.addDiscount')}
                  </button>
                </div>
              </div>

              {/* 체감가 + 환율 */}
              <div className="rounded-xl bg-primary-50/60 border border-primary-100 px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs text-neutral-500">{t('price.register.feelPrice')}</span>
                <span className="text-sm font-bold text-primary-700">$ {feelPrice.toLocaleString()}</span>
              </div>
              <LabeledInput label={t('price.register.exchangeRate')} value={exchangeRate} onChange={setExchangeRate} suffix="원/USD" required />
              {krwPreview > 0 && (
                <p className="text-xs text-neutral-500 text-right">
                  {t('price.register.krwPreview')}: <span className="font-semibold text-neutral-700">≈ {krw.format(krwPreview)}원</span>
                </p>
              )}
            </div>
          )}
        </Section>

        {/* 4. 구매일 */}
        <Section label={t('price.register.purchasedAt')}>
          <input
            type="date"
            max="9999-12-31"
            lang={i18n.language}
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            className="border border-neutral-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </Section>

        {/* 설명 */}
        <Section label={t('price.register.description')}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('price.register.descPlaceholder')}
            rows={3}
            maxLength={500}
            className="w-full border border-neutral-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
          />
        </Section>

        {/* 인증 사진 */}
        <Section label={t('price.register.images')}>
          <div className="mb-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 font-medium flex gap-1.5">
            <span>⚠️</span>
            <span>{t('price.register.privacyWarning')}</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {images.map((img, idx) => (
              <div key={img.id} className="relative">
                <img src={img.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover border border-neutral-200" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >
                  ×
                </button>
                <button
                  onClick={() => setImagePublicFlags((prev) => prev.map((f, i) => (i === idx ? !f : f)))}
                  className={`mt-1 block w-full text-center text-[10px] rounded ${imagePublicFlags[idx] ? 'text-primary-700' : 'text-neutral-400'}`}
                >
                  {imagePublicFlags[idx] ? t('price.register.public') : t('price.register.private')}
                </button>
              </div>
            ))}
            {images.length < 3 && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-200 hover:border-primary-300 flex flex-col items-center justify-center text-neutral-300 hover:text-primary-400 transition-colors"
              >
                {uploading ? '...' : (<><span className="text-2xl">+</span><span className="text-[10px] mt-0.5">{t('price.register.uploadImage')}</span></>)}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = '' }}
          />
        </Section>

        {/* 5. 작성자 표시 */}
        <Section label={t('price.register.author')}>
          <div className="flex gap-2">
            {(['NICKNAME', 'ANONYMOUS'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setAuthorMode(m)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  authorMode === m ? 'bg-primary-700 text-white border-primary-700' : 'text-neutral-500 border-neutral-200'
                }`}
              >
                {m === 'NICKNAME' ? t('price.register.authorNickname') : t('price.register.authorAnonymous')}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            {authorMode === 'NICKNAME' ? t('price.register.pointsNotice') : t('price.register.anonymousNotice')}
          </p>
        </Section>

        {/* 제출 */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full py-3 bg-primary-700 text-white rounded-xl font-semibold text-sm hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '...' : t('price.register.submit')}
        </button>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-neutral-700 mb-2">{label}</p>
      {children}
    </div>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
  suffix,
  required,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suffix?: string
  required?: boolean
  hint?: string
}) {
  return (
    <div>
      <label className="text-xs text-neutral-400 block mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-neutral-300 ml-1">· {hint}</span>}
      </label>
      <div className="flex items-center bg-white border border-neutral-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-200">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(formatOptionalPriceInput(e.target.value))}
          className="flex-1 px-3 py-2 text-sm focus:outline-none min-w-0"
        />
        {suffix && <span className="pr-3 text-xs text-neutral-400 shrink-0">{suffix}</span>}
      </div>
    </div>
  )
}
