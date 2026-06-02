import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import { priceTrackerApi } from '@/domain/pricetracker/api/priceTrackerApi'
import type {
  StoreType,
  PriceCurrency,
  DiscountType,
  DiscountItemInput,
  StoreSearchResult,
  PriceReportImageUpload,
} from '@/domain/pricetracker/types/pricetracker.types'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'

const DISCOUNT_TYPES: DiscountType[] = ['PAYMENT', 'BUNDLE', 'COUPON', 'OTHER']

export default function PriceRegisterPage() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const navigate = useNavigate()

  // Spirit 검색
  const [spiritKeyword, setSpiritKeyword] = useState('')
  const [selectedSpirit, setSelectedSpirit] = useState<SpiritListItem | null>(null)
  const [spiritOpen, setSpiritOpen] = useState(false)

  // Store 검색
  const [storeType, setStoreType] = useState<StoreType>('DOMESTIC')
  const [storeKeyword, setStoreKeyword] = useState('')
  const [selectedStore, setSelectedStore] = useState<StoreSearchResult | null>(null)
  const [suggestedStoreName, setSuggestedStoreName] = useState('')
  const [storeOpen, setStoreOpen] = useState(false)
  const [useSuggest, setUseSuggest] = useState(false)

  // 가격
  const [currency, setCurrency] = useState<PriceCurrency>('KRW')
  const [regularPrice, setRegularPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [payback, setPayback] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')
  const [purchasedAt, setPurchasedAt] = useState('')
  const [description, setDescription] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)

  // 면세 할인 항목
  const [discountItems, setDiscountItems] = useState<DiscountItemInput[]>([])

  // 이미지
  const [images, setImages] = useState<PriceReportImageUpload[]>([])
  const [imagePublicFlags, setImagePublicFlags] = useState<boolean[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // Spirit 자동완성
  const { data: spiritResults } = useQuery({
    queryKey: ['spiritSearch-register', spiritKeyword],
    queryFn: () => spiritApi.search({ keyword: spiritKeyword, page: 0, size: 8 }),
    select: (res) => res.data.data?.content ?? [],
    enabled: spiritKeyword.length >= 1 && spiritOpen,
    staleTime: 30_000,
  })

  // Store 자동완성
  const { data: storeResults } = useQuery({
    queryKey: ['storeSearch', storeKeyword, storeType],
    queryFn: () => priceTrackerApi.searchStores(storeKeyword, storeType),
    select: (res) => res.data.data ?? [],
    enabled: storeKeyword.length >= 1 && storeOpen && !useSuggest,
    staleTime: 30_000,
  })

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
    setImages((prev) => prev.filter((_, i) => i !== idx) as typeof prev)
    setImagePublicFlags((prev) => prev.filter((_, i) => i !== idx))
  }

  const addDiscountItem = () =>
    setDiscountItems((prev) => [
      ...prev,
      { discountType: 'PAYMENT', label: '', amount: 0, sortOrder: prev.length },
    ])

  const removeDiscountItem = (idx: number) =>
    setDiscountItems((prev) => prev.filter((_, i) => i !== idx))

  const isDutyFree = storeType === 'DUTYFREE'
  const needsExchangeRate = isDutyFree && currency === 'USD'

  const handleSubmit = async () => {
    if (!selectedSpirit) return
    setSubmitting(true)
    try {
      await priceTrackerApi.createPriceReport({
        spiritId: selectedSpirit.id,
        storeId: selectedStore?.id ?? null,
        suggestedStoreName: useSuggest ? suggestedStoreName : null,
        currency,
        isAnonymous,
        regularPrice: regularPrice ? Number(regularPrice) : null,
        salePrice: salePrice ? Number(salePrice) : null,
        paybackAmount: payback ? Number(payback) : null,
        exchangeRate: exchangeRate ? Number(exchangeRate) : null,
        purchasedAt: purchasedAt || null,
        description: description || null,
        imageIds: images.map((i) => i.id),
        imagePublicFlags,
        discountItems: discountItems.length ? discountItems : undefined,
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
          onClick={() => navigate(-1)}
          className="mt-6 px-6 py-2 bg-[#185FA5] text-white rounded-xl text-sm"
        >
          {t('common.back', '돌아가기')}
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
        {/* 술 선택 */}
        <Section label={t('price.register.spirit')}>
          <div className="relative">
            <input
              value={selectedSpirit ? (isEn ? (selectedSpirit.nameEn || selectedSpirit.nameKo) : selectedSpirit.nameKo) : spiritKeyword}
              onChange={(e) => { setSpiritKeyword(e.target.value); setSelectedSpirit(null); setSpiritOpen(true) }}
              onFocus={() => setSpiritOpen(true)}
              placeholder={t('price.register.spiritPlaceholder')}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {spiritOpen && spiritResults && spiritResults.length > 0 && !selectedSpirit && (
              <ul className="absolute z-10 w-full bg-white border border-neutral-200 rounded-xl mt-1 shadow-lg max-h-52 overflow-y-auto">
                {spiritResults.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => { setSelectedSpirit(s); setSpiritOpen(false); setSpiritKeyword('') }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                    >
                      <span className="font-medium">{isEn ? (s.nameEn || s.nameKo) : s.nameKo}</span>
                      {s.nameEn && <span className="text-neutral-400 ml-2 text-xs">{isEn ? s.nameKo : s.nameEn}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        {/* 국내/면세 + 매장 */}
        <Section label={t('price.register.store')}>
          <div className="flex gap-2 mb-2">
            {(['DOMESTIC', 'DUTYFREE'] as const).map((t_) => (
              <button
                key={t_}
                onClick={() => { setStoreType(t_); setSelectedStore(null); setUseSuggest(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  storeType === t_ ? 'bg-[#185FA5] text-white border-[#185FA5]' : 'text-neutral-500 border-neutral-200'
                }`}
              >
                {t_ === 'DOMESTIC' ? t('price.chart.domestic') : t('price.chart.dutyfree')}
              </button>
            ))}
            <button
              onClick={() => { setUseSuggest((v) => !v); setSelectedStore(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                useSuggest ? 'bg-neutral-700 text-white border-neutral-700' : 'text-neutral-400 border-neutral-200'
              }`}
            >
              {t('price.register.suggestStore')}
            </button>
          </div>
          {useSuggest ? (
            <input
              value={suggestedStoreName}
              onChange={(e) => setSuggestedStoreName(e.target.value)}
              placeholder={t('price.register.storePlaceholder')}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          ) : (
            <div className="relative">
              <input
                value={selectedStore ? selectedStore.displayName : storeKeyword}
                onChange={(e) => { setStoreKeyword(e.target.value); setSelectedStore(null); setStoreOpen(true) }}
                onFocus={() => setStoreOpen(true)}
                placeholder={t('price.register.storePlaceholder')}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
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

        {/* 통화 */}
        <Section label={t('price.register.currency')}>
          <div className="flex gap-2">
            {(['KRW', 'USD'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  currency === c ? 'bg-[#185FA5] text-white border-[#185FA5]' : 'text-neutral-500 border-neutral-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Section>

        {/* 가격 */}
        <Section label={t('price.chart.maxPrice')}>
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label={t('price.register.regularPrice')} value={regularPrice} onChange={setRegularPrice} suffix="원" />
            <LabeledInput label={t('price.register.salePrice')} value={salePrice} onChange={setSalePrice} suffix="원" />
            <LabeledInput label={t('price.register.payback')} value={payback} onChange={setPayback} suffix="원" />
            {needsExchangeRate && (
              <LabeledInput label={t('price.register.exchangeRate')} value={exchangeRate} onChange={setExchangeRate} suffix="원/USD" required />
            )}
          </div>
        </Section>

        {/* 면세 할인 항목 */}
        {isDutyFree && (
          <Section label={t('price.register.discountItems')}>
            <div className="space-y-2">
              {discountItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <select
                    value={item.discountType}
                    onChange={(e) =>
                      setDiscountItems((prev) =>
                        prev.map((d, i) => i === idx ? { ...d, discountType: e.target.value as DiscountType } : d)
                      )
                    }
                    className="border border-neutral-200 rounded-lg px-2 py-1.5 text-xs"
                  >
                    {DISCOUNT_TYPES.map((dt) => (
                      <option key={dt} value={dt}>{t(`price.register.discountType.${dt}`)}</option>
                    ))}
                  </select>
                  <input
                    placeholder={t('price.register.discountItems')}
                    value={item.label}
                    onChange={(e) =>
                      setDiscountItems((prev) =>
                        prev.map((d, i) => i === idx ? { ...d, label: e.target.value } : d)
                      )
                    }
                    className="flex-1 border border-neutral-200 rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="금액"
                    value={item.amount || ''}
                    onChange={(e) =>
                      setDiscountItems((prev) =>
                        prev.map((d, i) => i === idx ? { ...d, amount: Number(e.target.value) } : d)
                      )
                    }
                    className="w-24 border border-neutral-200 rounded-lg px-2 py-1.5 text-xs"
                  />
                  <button onClick={() => removeDiscountItem(idx)} className="text-neutral-300 hover:text-red-400 text-lg leading-none">×</button>
                </div>
              ))}
              <button
                onClick={addDiscountItem}
                className="text-xs text-[#185FA5] hover:text-blue-700 font-medium"
              >
                + {t('price.register.addDiscount')}
              </button>
            </div>
          </Section>
        )}

        {/* 구매일 + 설명 */}
        <Section label={t('price.register.purchasedAt')}>
          <input
            type="date"
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
            className="border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </Section>

        <Section label={t('price.register.description')}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('price.register.descPlaceholder')}
            rows={3}
            className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
          />
        </Section>

        {/* 이미지 */}
        <Section label={t('price.register.images')}>
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
                  onClick={() => setImagePublicFlags((prev) => prev.map((f, i) => i === idx ? !f : f))}
                  className={`mt-1 block w-full text-center text-[10px] rounded ${imagePublicFlags[idx] ? 'text-blue-600' : 'text-neutral-400'}`}
                >
                  {imagePublicFlags[idx] ? '공개' : '비공개'}
                </button>
              </div>
            ))}
            {images.length < 3 && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-200 hover:border-blue-300 flex flex-col items-center justify-center text-neutral-300 hover:text-blue-400 transition-colors"
              >
                {uploading ? '...' : <><span className="text-2xl">+</span><span className="text-[10px] mt-0.5">{t('price.register.uploadImage')}</span></>}
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

        {/* 익명 */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 rounded accent-[#185FA5]"
          />
          <span className="text-sm text-neutral-700">{t('price.register.isAnonymous')}</span>
        </label>

        {/* 제출 */}
        <button
          onClick={handleSubmit}
          disabled={!selectedSpirit || submitting}
          className="w-full py-3 bg-[#185FA5] text-white rounded-xl font-semibold text-sm hover:bg-[#1552a0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suffix?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="text-xs text-neutral-400 block mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-200">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm focus:outline-none"
        />
        {suffix && <span className="pr-3 text-xs text-neutral-400">{suffix}</span>}
      </div>
    </div>
  )
}
