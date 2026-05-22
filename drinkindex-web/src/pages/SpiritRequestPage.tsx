import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useMyRequests, useSubmitRequest } from '@/domain/spirit/hooks/useSpiritRequest'
import type { SpiritRegisterRequestForm, MySpiritRequest, RequestStatus } from '@/domain/spirit/types/spiritRequest.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import DistillerySelector from '@/domain/distillery/components/DistillerySelector'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import SeoMeta from '@/shared/components/SeoMeta'

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER']

const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING:  'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
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

      <div className="flex items-center gap-3 text-xs text-neutral-400">
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
  const [distilleryId, setDistilleryId] = useState<number | null>(null)
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countryNameKo, setCountryNameKo] = useState('')
  const [regionNameKo, setRegionNameKo] = useState('')
  const { data: myRequests = [], isLoading } = useMyRequests()
  const { mutate: submitRequest, isPending } = useSubmitRequest()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SpiritRegisterRequestForm>()

  const onSubmit = (data: SpiritRegisterRequestForm) => {
    const payload: SpiritRegisterRequestForm = {
      ...data,
      distilleryId,
      country: countryNameKo || undefined,
      region: regionNameKo || undefined,
      abv:         data.abv         != null && !isNaN(Number(data.abv))         ? Number(data.abv)         : null,
      bottledYear: data.bottledYear  != null && !isNaN(Number(data.bottledYear)) ? Number(data.bottledYear) : null,
      vintageYear: data.vintageYear  != null && !isNaN(Number(data.vintageYear)) ? Number(data.vintageYear) : null,
      volumeMl:   data.volumeMl     != null && !isNaN(Number(data.volumeMl))    ? Number(data.volumeMl)    : null,
    }
    submitRequest(payload, {
      onSuccess: () => {
        reset()
        setDistilleryId(null)
        setCountryCode(null)
        setCountryNameKo('')
        setRegionNameKo('')
        setSuccessMsg(t('spiritRequest.form.success'))
        setTimeout(() => setSuccessMsg(''), 4000)
      },
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <SeoMeta title={t('spiritRequest.title')} description={t('spiritRequest.subtitle')} noindex />
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('spiritRequest.title')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('spiritRequest.subtitle')}</p>
      </div>

      {/* Form */}
      <section className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          {/* Required: nameKo / nameEn / category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                {t('spiritRequest.form.nameKo')}
                <span className="ml-1 text-xs text-red-500">{t('common.required')}</span>
              </label>
              <input
                {...register('nameKo', { required: true, maxLength: 200 })}
                maxLength={200}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                  focus:ring-primary-400 transition-colors
                  ${errors.nameKo ? 'border-red-400' : 'border-neutral-200'}`}
                placeholder="예) 발베니 12년 더블우드"
              />
              {errors.nameKo && (
                <p className="text-xs text-red-500">한국어 이름을 입력해주세요.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                {t('spiritRequest.form.nameEn')}
                <span className="ml-1 text-xs text-red-500">{t('common.required')}</span>
              </label>
              <input
                {...register('nameEn', { required: true, maxLength: 200 })}
                maxLength={200}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                  focus:ring-primary-400 transition-colors
                  ${errors.nameEn ? 'border-red-400' : 'border-neutral-200'}`}
                placeholder="Balvenie 12Y DoubleWood"
              />
              {errors.nameEn && (
                <p className="text-xs text-red-500">영어 이름을 입력해주세요.</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              {t('spiritRequest.form.category')}
              <span className="ml-1 text-xs text-red-500">{t('common.required')}</span>
            </label>
            <select
              {...register('category', { required: true })}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                focus:ring-primary-400 transition-colors bg-white
                ${errors.category ? 'border-red-400' : 'border-neutral-200'}`}
            >
              <option value="">카테고리 선택</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{t(`spirit.category.${cat}`)}</option>
              ))}
            </select>
            {errors.category && (
              <p className="text-xs text-red-500">카테고리를 선택해주세요.</p>
            )}
          </div>

          {/* Optional fields */}
          <div className="border-t border-neutral-100 pt-4">
            <p className="text-xs text-neutral-400 mb-4">아래 항목은 선택 사항입니다.</p>

            {/* 증류소 */}
            <div className="space-y-1.5 mb-4">
              <label className="block text-sm font-medium text-neutral-700">
                {t('spiritRequest.form.distillery')}
              </label>
              <DistillerySelector
                value={distilleryId}
                onChange={setDistilleryId}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">
                  {t('spiritRequest.form.abv')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...register('abv')}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
                  placeholder="43.0"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
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

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">
                  {t('spiritRequest.form.bottler')}
                </label>
                <input
                  {...register('bottler', { maxLength: 200 })}
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">
                  {t('spiritRequest.form.bottledYear')}
                </label>
                <input
                  type="number"
                  min="1800"
                  max="2100"
                  {...register('bottledYear')}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
                  placeholder="2022"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">
                  {t('spiritRequest.form.vintageYear')}
                </label>
                <input
                  type="number"
                  min="1800"
                  max="2100"
                  {...register('vintageYear')}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
                  placeholder="2010"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">
                  {t('spiritRequest.form.volumeMl')}
                </label>
                <input
                  type="number"
                  min="1"
                  {...register('volumeMl')}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
                  placeholder="700"
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

      {/* My requests */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-800">{t('spiritRequest.myRequests.title')}</h2>

        {isLoading ? (
          <p className="text-sm text-neutral-400">{t('common.loading')}</p>
        ) : myRequests.length === 0 ? (
          <p className="text-sm text-neutral-400">{t('spiritRequest.myRequests.empty')}</p>
        ) : (
          <div className="space-y-3">
            {myRequests.map(item => (
              <RequestCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
