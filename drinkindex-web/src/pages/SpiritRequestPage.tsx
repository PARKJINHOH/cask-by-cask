import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useMyRequests, useSubmitRequest } from '@/domain/spirit/hooks/useSpiritRequest'
import type { SpiritRegisterRequestForm, MySpiritRequest, RequestStatus } from '@/domain/spirit/types/spiritRequest.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import ProducerSelector from '@/domain/producer/components/ProducerSelector'
import { CATEGORY_TO_PRODUCER_TYPE } from '@/domain/producer/types/producer.types'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import SeoMeta from '@/shared/components/SeoMeta'

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER']

// 카테고리 핵심값 선택지 (신청자 입력 — 관리자 등록 참고용)
const WHISKY_STYLE_OPTS: [string, string][] = [
  ['SINGLE_MALT', '싱글 몰트'], ['BLENDED_MALT', '블렌디드 몰트'], ['BLENDED_WHISKY', '블렌디드 위스키'],
  ['BOURBON', '버번'], ['RYE', '라이'], ['CORN', '콘'], ['GRAIN', '그레인'], ['POT_STILL', '팟 스틸'],
]
const WINE_TYPE_OPTS: [string, string][] = [
  ['RED', '레드'], ['WHITE', '화이트'], ['ROSE', '로제'], ['SPARKLING', '스파클링'], ['DESSERT', '디저트'], ['ORANGE', '오렌지'],
]
const COGNAC_GRADE_OPTS: [string, string][] = [
  ['VS', 'VS'], ['NAPOLEON', '나폴레옹'], ['VSOP', 'VSOP'], ['XO', 'XO'], ['XXO', 'XXO'], ['HORS_DAGE', "Hors d'Âge"],
]
const OTHER_TYPE_OPTS: [string, string][] = [
  ['RUM', '럼'], ['GIN', '진'], ['VODKA', '보드카'], ['TEQUILA', '데킬라'], ['MEZCAL', '메스칼'],
  ['BRANDY', '브랜디'], ['LIQUEUR', '리큐르'], ['SAKE', '사케'], ['SOJU', '소주'], ['BAIJIU', '바이주'],
  ['ABSINTHE', '압생트'], ['BEER', '맥주'], ['OTHER', '기타'],
]

const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING:  'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
}

const FIELD_CLS =
  'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors'

// ── 필수 표시 라벨 ────────────────────────────────────────────────
function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-neutral-700">
      {children}
      <span className="ml-1 text-red-500">*</span>
    </label>
  )
}

function RequestCard({ item }: { item: MySpiritRequest }) {
  const { t } = useTranslation()
  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-neutral-800 truncate">{item.nameKo}</p>
          <p className="text-sm text-neutral-500 truncate">{item.nameEn}</p>
        </div>
        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[item.status]}`}>
          {t(`spiritRequest.myRequests.status.${item.status}`)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
        <span>{t(`spirit.category.${item.category}`)}</span>
        <span>·</span>
        <span>{t('spiritRequest.myRequests.requestedAt')}: {new Date(item.createdAt).toLocaleDateString()}</span>
        {item.reviewedAt && (
          <>
            <span>·</span>
            <span>{t('spiritRequest.myRequests.reviewedAt')}: {new Date(item.reviewedAt).toLocaleDateString()}</span>
          </>
        )}
      </div>

      {item.status === 'REJECTED' && item.rejectReason && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <span className="font-medium">{t('spiritRequest.myRequests.rejectReason')}: </span>
          {item.rejectReason}
        </div>
      )}
    </div>
  )
}

export default function SpiritRequestPage() {
  const { t } = useTranslation()
  const [successMsg, setSuccessMsg] = useState('')
  const [producerId, setProducerId] = useState<number | null>(null)
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countryNameKo, setCountryNameKo] = useState('')
  const [regionNameKo, setRegionNameKo] = useState('')
  const { data: myRequests = [], isLoading } = useMyRequests()
  const { mutate: submitRequest, isPending } = useSubmitRequest()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SpiritRegisterRequestForm>()

  const selectedCategory = watch('category')

  const onSubmit = (data: SpiritRegisterRequestForm) => {
    const payload: SpiritRegisterRequestForm = {
      ...data,
      producerId,
      country: countryNameKo || undefined,
      region: regionNameKo || undefined,
      abv:         data.abv         != null && !isNaN(Number(data.abv))         ? Number(data.abv)         : null,
      bottledYear: data.bottledYear  != null && !isNaN(Number(data.bottledYear)) ? Number(data.bottledYear) : null,
      vintageYear: data.vintageYear  != null && !isNaN(Number(data.vintageYear)) ? Number(data.vintageYear) : null,
      volumeMl:   data.volumeMl     != null && !isNaN(Number(data.volumeMl))    ? Number(data.volumeMl)    : null,
      // 빈 문자열은 enum 파싱 오류 방지를 위해 undefined로
      whiskyStyle: data.whiskyStyle || undefined,
      wineType:    data.wineType    || undefined,
      cognacGrade: data.cognacGrade || undefined,
      otherType:   data.otherType   || undefined,
    }
    submitRequest(payload, {
      onSuccess: () => {
        reset()
        setProducerId(null)
        setCountryCode(null)
        setCountryNameKo('')
        setRegionNameKo('')
        setSuccessMsg(t('spiritRequest.form.success'))
        setTimeout(() => setSuccessMsg(''), 4000)
      },
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SeoMeta title={t('spiritRequest.title')} description={t('spiritRequest.subtitle')} noindex />

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">{t('spiritRequest.title')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('spiritRequest.subtitle')}</p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
        {/* ── 폼 ──────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm p-5 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

            {/* 필수 정보 */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-amber-500" />
                <h2 className="text-sm font-bold text-amber-800">{t('spiritRequest.form.requiredSection')}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <ReqLabel>{t('spiritRequest.form.nameKo')}</ReqLabel>
                  <input
                    {...register('nameKo', { required: true, maxLength: 200 })}
                    maxLength={200}
                    className={`${FIELD_CLS} bg-white ${errors.nameKo ? 'border-red-400' : 'border-neutral-200'}`}
                    placeholder="예) 발베니 12년 더블우드"
                  />
                  {errors.nameKo && <p className="text-xs text-red-500">{t('spiritRequest.form.errNameKo')}</p>}
                </div>

                <div className="space-y-1.5">
                  <ReqLabel>{t('spiritRequest.form.nameEn')}</ReqLabel>
                  <input
                    {...register('nameEn', { required: true, maxLength: 200 })}
                    maxLength={200}
                    className={`${FIELD_CLS} bg-white ${errors.nameEn ? 'border-red-400' : 'border-neutral-200'}`}
                    placeholder="Balvenie 12Y DoubleWood"
                  />
                  {errors.nameEn && <p className="text-xs text-red-500">{t('spiritRequest.form.errNameEn')}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-3">
                  <ReqLabel>{t('spiritRequest.form.category')}</ReqLabel>
                  <select
                    {...register('category', { required: true })}
                    className={`${FIELD_CLS} bg-white ${errors.category ? 'border-red-400' : 'border-neutral-200'}`}
                  >
                    <option value="">{t('spiritRequest.form.categoryPlaceholder')}</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{t(`spirit.category.${cat}`)}</option>
                    ))}
                  </select>
                  {errors.category && <p className="text-xs text-red-500">{t('spiritRequest.form.errCategory')}</p>}
                </div>

                <div className="space-y-1.5">
                  <ReqLabel>{t('spiritRequest.form.abv')}</ReqLabel>
                  <input
                    type="number" step="0.1" min="0" max="100"
                    {...register('abv', { required: true })}
                    className={`${FIELD_CLS} bg-white ${errors.abv ? 'border-red-400' : 'border-neutral-200'}`}
                    placeholder="43.0"
                  />
                  {errors.abv && <p className="text-xs text-red-500">{t('spiritRequest.form.errAbv')}</p>}
                </div>

                <div className="space-y-1.5">
                  <ReqLabel>{t('spiritRequest.form.volumeMl')}</ReqLabel>
                  <input
                    type="number" min="1"
                    {...register('volumeMl', { required: true })}
                    className={`${FIELD_CLS} bg-white ${errors.volumeMl ? 'border-red-400' : 'border-neutral-200'}`}
                    placeholder="700"
                  />
                  {errors.volumeMl && <p className="text-xs text-red-500">{t('spiritRequest.form.errVolume')}</p>}
                </div>
              </div>

              <p className="text-xs text-amber-700/80">{t('spiritRequest.form.requiredNote')}</p>
            </div>

            {/* 추가 정보 (선택) */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-neutral-700">{t('spiritRequest.form.optionalSection')}</h2>

              {/* 카테고리 핵심값 — 선택한 카테고리에 따라 표시 */}
              {selectedCategory === 'WHISKY' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-neutral-700">위스키 스타일</label>
                  <select {...register('whiskyStyle')} className={`${FIELD_CLS} bg-white border-neutral-200`}>
                    <option value="">선택 안 함</option>
                    {WHISKY_STYLE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}
              {selectedCategory === 'WINE' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-neutral-700">와인 종류</label>
                  <select {...register('wineType')} className={`${FIELD_CLS} bg-white border-neutral-200`}>
                    <option value="">선택 안 함</option>
                    {WINE_TYPE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}
              {selectedCategory === 'COGNAC' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-neutral-700">꼬냑 등급</label>
                  <select {...register('cognacGrade')} className={`${FIELD_CLS} bg-white border-neutral-200`}>
                    <option value="">선택 안 함</option>
                    {COGNAC_GRADE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}
              {selectedCategory === 'OTHER' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-neutral-700">주종</label>
                  <select {...register('otherType')} className={`${FIELD_CLS} bg-white border-neutral-200`}>
                    <option value="">선택 안 함</option>
                    {OTHER_TYPE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">{t('spiritRequest.form.producer')}</label>
                <ProducerSelector
                  value={producerId}
                  onChange={setProducerId}
                  type={selectedCategory ? CATEGORY_TO_PRODUCER_TYPE[selectedCategory] : undefined}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">
                  {t('spiritRequest.form.country')} / {t('spiritRequest.form.region')}
                </label>
                <CountryRegionSelector
                  countryCode={countryCode}
                  regionNameKo={regionNameKo}
                  onCountryChange={(code, nameKo) => { setCountryCode(code); setCountryNameKo(nameKo) }}
                  onRegionChange={(nameKo) => setRegionNameKo(nameKo)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-neutral-700">{t('spiritRequest.form.bottler')}</label>
                  <input
                    {...register('bottler', { maxLength: 200 })}
                    maxLength={200}
                    className={`${FIELD_CLS} border-neutral-200`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-neutral-700">{t('spiritRequest.form.bottledYear')}</label>
                  <input
                    type="number" min="1800" max="2100"
                    {...register('bottledYear')}
                    className={`${FIELD_CLS} border-neutral-200`}
                    placeholder="2022"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-neutral-700">{t('spiritRequest.form.vintageYear')}</label>
                  <input
                    type="number" min="1800" max="2100"
                    {...register('vintageYear')}
                    className={`${FIELD_CLS} border-neutral-200`}
                    placeholder="2010"
                  />
                </div>
              </div>
            </div>

            {successMsg && (
              <div className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-primary-800 text-white text-sm font-semibold rounded-xl
                hover:bg-primary-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? t('common.loading') : t('spiritRequest.form.submit')}
            </button>
          </form>
        </section>

        {/* ── 내 요청 목록 (PC 사이드바 / 모바일 하단) ──────── */}
        <aside className="mt-8 lg:mt-0 space-y-4">
          <h2 className="text-lg font-bold text-neutral-800">{t('spiritRequest.myRequests.title')}</h2>

          {isLoading ? (
            <p className="text-sm text-neutral-400">{t('common.loading')}</p>
          ) : myRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-neutral-200 p-6 text-center">
              <p className="text-sm text-neutral-400">{t('spiritRequest.myRequests.empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map(item => (
                <RequestCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
