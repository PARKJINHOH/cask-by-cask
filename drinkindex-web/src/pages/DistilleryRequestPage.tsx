import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useMyDistilleryRequests, useSubmitDistilleryRequest } from '@/domain/distillery/hooks/useDistilleryRequest'
import type { DistilleryRegisterRequestForm, MyDistilleryRequest } from '@/domain/distillery/types/distilleryRequest.types'
import type { RequestStatus } from '@/domain/spirit/types/spiritRequest.types'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import SeoMeta from '@/shared/components/SeoMeta'

const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING:  'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
}

function RequestCard({ item }: { item: MyDistilleryRequest }) {
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
          {t(`distilleryRequest.myRequests.status.${item.status}`)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <span>{t('distilleryRequest.myRequests.requestedAt')}: {new Date(item.createdAt).toLocaleDateString()}</span>
        {item.reviewedAt && (
          <>
            <span>·</span>
            <span>{t('distilleryRequest.myRequests.reviewedAt')}: {new Date(item.reviewedAt).toLocaleDateString()}</span>
          </>
        )}
      </div>

      {item.status === 'REJECTED' && item.rejectReason && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <span className="font-medium">{t('distilleryRequest.myRequests.rejectReason')}: </span>
          {item.rejectReason}
        </div>
      )}
    </div>
  )
}

export default function DistilleryRequestPage() {
  const { t } = useTranslation()
  const [successMsg, setSuccessMsg] = useState('')
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countryNameKo, setCountryNameKo] = useState('')
  const [regionNameKo, setRegionNameKo] = useState('')
  const { data: myRequests = [], isLoading } = useMyDistilleryRequests()
  const { mutate: submitRequest, isPending } = useSubmitDistilleryRequest()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DistilleryRegisterRequestForm>()

  const onSubmit = (data: DistilleryRegisterRequestForm) => {
    if (!countryNameKo) return
    const payload: DistilleryRegisterRequestForm = {
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
        setSuccessMsg(t('distilleryRequest.form.success'))
        setTimeout(() => setSuccessMsg(''), 4000)
      },
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <SeoMeta title={t('distilleryRequest.title')} description={t('distilleryRequest.subtitle')} noindex />

      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('distilleryRequest.title')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('distilleryRequest.subtitle')}</p>
      </div>

      <section className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                {t('distilleryRequest.form.nameKo')}
                <span className="ml-1 text-xs text-red-500">{t('common.required')}</span>
              </label>
              <input
                {...register('nameKo', { required: true, maxLength: 200 })}
                maxLength={200}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                  focus:ring-primary-400 transition-colors
                  ${errors.nameKo ? 'border-red-400' : 'border-neutral-200'}`}
                placeholder="예) 글렌피딕 증류소"
              />
              {errors.nameKo && (
                <p className="text-xs text-red-500">한국어 이름을 입력해주세요.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                {t('distilleryRequest.form.nameEn')}
                <span className="ml-1 text-xs text-red-500">{t('common.required')}</span>
              </label>
              <input
                {...register('nameEn', { required: true, maxLength: 200 })}
                maxLength={200}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2
                  focus:ring-primary-400 transition-colors
                  ${errors.nameEn ? 'border-red-400' : 'border-neutral-200'}`}
                placeholder="Glenfiddich Distillery"
              />
              {errors.nameEn && (
                <p className="text-xs text-red-500">영어 이름을 입력해주세요.</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700">
              {t('distilleryRequest.form.country')} / {t('distilleryRequest.form.region')}
              <span className="ml-1 text-xs text-red-500">{t('common.required')}</span>
            </label>
            <CountryRegionSelector
              countryCode={countryCode}
              regionNameKo={regionNameKo}
              onCountryChange={(code, nameKo) => { setCountryCode(code); setCountryNameKo(nameKo) }}
              onRegionChange={(nameKo) => setRegionNameKo(nameKo)}
            />
            {!countryNameKo && errors.nameKo !== undefined && (
              <p className="text-xs text-red-500">국가를 선택해주세요.</p>
            )}
          </div>

          {successMsg && (
            <div className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !countryNameKo}
            className="w-full py-2.5 bg-primary-800 text-white text-sm font-semibold rounded-xl
              hover:bg-primary-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? t('common.loading') : t('distilleryRequest.form.submit')}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-800">{t('distilleryRequest.myRequests.title')}</h2>

        {isLoading ? (
          <p className="text-sm text-neutral-400">{t('common.loading')}</p>
        ) : myRequests.length === 0 ? (
          <p className="text-sm text-neutral-400">{t('distilleryRequest.myRequests.empty')}</p>
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
