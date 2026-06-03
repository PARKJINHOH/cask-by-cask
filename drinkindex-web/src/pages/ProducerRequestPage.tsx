import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useMyProducerRequests, useSubmitProducerRequest } from '@/domain/producer/hooks/useProducerRequest'
import type { ProducerRegisterRequestForm, MyProducerRequest } from '@/domain/producer/types/producerRequest.types'
import type { RequestStatus } from '@/domain/spirit/types/spiritRequest.types'
import type { ProducerType } from '@/domain/producer/types/producer.types'
import { PRODUCER_TYPE_LABEL } from '@/domain/producer/types/producer.types'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import SeoMeta from '@/shared/components/SeoMeta'

const PRODUCER_TYPES: ProducerType[] = ['DISTILLERY', 'WINERY', 'COGNAC_HOUSE', 'OTHER']

const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING:  'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
}

const FIELD_CLS =
  'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors'

function ReqLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-neutral-700">
      {children}
      <span className="ml-1 text-red-500">*</span>
    </label>
  )
}

function RequestCard({ item }: { item: MyProducerRequest }) {
  const { t } = useTranslation()
  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-neutral-800 truncate">{item.nameKo}</p>
          <p className="text-sm text-neutral-500 truncate">{item.nameEn}</p>
          <p className="text-xs text-neutral-400">{item.country}</p>
        </div>
        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[item.status]}`}>
          {t(`producerRequest.myRequests.status.${item.status}`)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
        <span>{t('producerRequest.myRequests.requestedAt')}: {new Date(item.createdAt).toLocaleDateString()}</span>
        {item.reviewedAt && (
          <>
            <span>·</span>
            <span>{t('producerRequest.myRequests.reviewedAt')}: {new Date(item.reviewedAt).toLocaleDateString()}</span>
          </>
        )}
      </div>

      {item.status === 'REJECTED' && item.rejectReason && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <span className="font-medium">{t('producerRequest.myRequests.rejectReason')}: </span>
          {item.rejectReason}
        </div>
      )}
    </div>
  )
}

export default function ProducerRequestPage() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const [successMsg, setSuccessMsg] = useState('')
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countryNameKo, setCountryNameKo] = useState('')
  const [regionNameKo, setRegionNameKo] = useState('')
  const [countryError, setCountryError] = useState(false)
  const { data: myRequests = [], isLoading } = useMyProducerRequests()
  const { mutate: submitRequest, isPending } = useSubmitProducerRequest()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProducerRegisterRequestForm>()

  const onSubmit = (data: ProducerRegisterRequestForm) => {
    if (!countryNameKo) { setCountryError(true); return }
    const payload: ProducerRegisterRequestForm = {
      ...data,
      country: countryNameKo,
      region: regionNameKo || undefined,
    }
    submitRequest(payload, {
      onSuccess: () => {
        reset()
        setCountryCode(null)
        setCountryNameKo('')
        setRegionNameKo('')
        setCountryError(false)
        setSuccessMsg(t('producerRequest.form.success'))
        setTimeout(() => setSuccessMsg(''), 4000)
      },
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SeoMeta title={t('producerRequest.title')} description={t('producerRequest.subtitle')} noindex />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">{t('producerRequest.title')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('producerRequest.subtitle')}</p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
        {/* ── 폼 ──────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm p-5 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-amber-500" />
                <h2 className="text-sm font-bold text-amber-800">{t('producerRequest.form.requiredSection')}</h2>
              </div>

              <div className="space-y-1.5">
                <ReqLabel>{t('producerRequest.form.type')}</ReqLabel>
                <select
                  {...register('type', { required: true })}
                  defaultValue="DISTILLERY"
                  className={`${FIELD_CLS} bg-white border-neutral-200`}
                >
                  {PRODUCER_TYPES.map((tp) => (
                    <option key={tp} value={tp}>
                      {isEn ? PRODUCER_TYPE_LABEL[tp].en : PRODUCER_TYPE_LABEL[tp].ko}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <ReqLabel>{t('producerRequest.form.nameKo')}</ReqLabel>
                  <input
                    {...register('nameKo', { required: true, maxLength: 200 })}
                    maxLength={200}
                    className={`${FIELD_CLS} bg-white ${errors.nameKo ? 'border-red-400' : 'border-neutral-200'}`}
                    placeholder="예) 글렌피딕 증류소"
                  />
                  {errors.nameKo && <p className="text-xs text-red-500">{t('producerRequest.form.errNameKo')}</p>}
                </div>

                <div className="space-y-1.5">
                  <ReqLabel>{t('producerRequest.form.nameEn')}</ReqLabel>
                  <input
                    {...register('nameEn', { required: true, maxLength: 200 })}
                    maxLength={200}
                    className={`${FIELD_CLS} bg-white ${errors.nameEn ? 'border-red-400' : 'border-neutral-200'}`}
                    placeholder="Glenfiddich Producer"
                  />
                  {errors.nameEn && <p className="text-xs text-red-500">{t('producerRequest.form.errNameEn')}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <ReqLabel>{t('producerRequest.form.country')}</ReqLabel>
                <CountryRegionSelector
                  countryCode={countryCode}
                  regionNameKo={regionNameKo}
                  onCountryChange={(code, nameKo) => { setCountryCode(code); setCountryNameKo(nameKo); if (nameKo) setCountryError(false) }}
                  onRegionChange={(nameKo) => setRegionNameKo(nameKo)}
                />
                {countryError && <p className="text-xs text-red-500">{t('producerRequest.form.errCountry')}</p>}
              </div>

              <p className="text-xs text-amber-700/80">{t('producerRequest.form.requiredNote')}</p>
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
              {isPending ? t('common.loading') : t('producerRequest.form.submit')}
            </button>
          </form>
        </section>

        {/* ── 내 요청 목록 ─────────────────────────────────── */}
        <aside className="mt-8 lg:mt-0 space-y-4">
          <h2 className="text-lg font-bold text-neutral-800">{t('producerRequest.myRequests.title')}</h2>

          {isLoading ? (
            <p className="text-sm text-neutral-400">{t('common.loading')}</p>
          ) : myRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-neutral-200 p-6 text-center">
              <p className="text-sm text-neutral-400">{t('producerRequest.myRequests.empty')}</p>
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
