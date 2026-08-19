import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useMyProducerRequests, useSubmitProducerRequest } from '@/domain/producer/hooks/useProducerRequest'
import type { ProducerRegisterRequestForm, MyProducerRequest } from '@/domain/producer/types/producerRequest.types'
import type { RequestStatus } from '@/domain/spirit/types/spiritRequest.types'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import SeoMeta from '@/shared/components/SeoMeta'
import FormFieldLabel, { RequiredFieldsNotice } from '@/shared/components/FormFieldLabel'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'
import NumberInput from '@/shared/components/NumberInput'

const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING:  'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
}

const FIELD_CLS =
  'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors'

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="w-20 flex-shrink-0 text-neutral-400">{label}</span>
      <span className="flex-1 text-neutral-700 break-words">{children}</span>
    </div>
  )
}

function RequestCard({ item }: { item: MyProducerRequest }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const none = <span className="text-neutral-300">{t('producerRequest.myRequests.notProvided')}</span>

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

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs text-primary-700 hover:text-primary-900 hover:underline"
      >
        {open ? `↑ ${t('producerRequest.myRequests.hide')}` : `↓ ${t('producerRequest.myRequests.details')}`}
      </button>

      {open && (
        <div className="text-xs border-t border-neutral-100 pt-2">
          <DetailRow label={t('producerRequest.myRequests.region')}>{item.region || none}</DetailRow>
          <DetailRow label={t('producerRequest.form.website')}>
            {item.website
              ? <a href={item.website} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline break-all">{item.website}</a>
              : none}
          </DetailRow>
          <DetailRow label={t('producerRequest.form.foundedYear')}>{item.foundedYear ?? none}</DetailRow>
          <DetailRow label={t('producerRequest.form.descriptionKo')}>
            {item.descriptionKo ? <span className="whitespace-pre-wrap">{item.descriptionKo}</span> : none}
          </DetailRow>
          <DetailRow label={t('producerRequest.form.descriptionEn')}>
            {item.descriptionEn ? <span className="whitespace-pre-wrap">{item.descriptionEn}</span> : none}
          </DetailRow>
        </div>
      )}
    </div>
  )
}

export default function ProducerRequestPage() {
  const { t } = useTranslation()
  const [successMsg, setSuccessMsg] = useState('')
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countryNameKo, setCountryNameKo] = useState('')
  const [regionNameKo, setRegionNameKo] = useState('')
  const [countryError, setCountryError] = useState(false)
  // 목록에 없는 국가 → 직접 입력 모드
  const [customCountry, setCustomCountry] = useState(false)
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
      type: 'OTHER', // 생산자 종류는 '생산자'로 통일 (관리자가 승인 시 분류)
      country: countryNameKo,
      region: regionNameKo || undefined,
      website: data.website || undefined,
      foundedYear: data.foundedYear ? Number(data.foundedYear) : undefined,
      descriptionKo: data.descriptionKo || undefined,
      descriptionEn: data.descriptionEn || undefined,
    }
    submitRequest(payload, {
      onSuccess: () => {
        reset()
        setCountryCode(null)
        setCountryNameKo('')
        setRegionNameKo('')
        setCountryError(false)
        setCustomCountry(false)
        setSuccessMsg(t('producerRequest.form.success'))
        setTimeout(() => setSuccessMsg(''), 4000)
      },
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoMeta title={t('producerRequest.title')} description={t('producerRequest.subtitle')} noindex />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">{t('producerRequest.title')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('producerRequest.subtitle')}</p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
        {/* ── 폼 ──────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm p-5 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <RequiredFieldsNotice />

            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-amber-500" />
                <h2 className="text-sm font-bold text-amber-800">{t('producerRequest.form.requiredSection')}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FormFieldLabel required>{t('producerRequest.form.nameKo')}</FormFieldLabel>
                  <input
                    {...register('nameKo', { required: true, maxLength: 200 })}
                    required
                    aria-required="true"
                    maxLength={200}
                    className={`${FIELD_CLS} bg-white ${errors.nameKo ? 'border-red-400' : 'border-neutral-300'}`}
                    placeholder="예) 글렌피딕 증류소"
                  />
                  {errors.nameKo && <p className="text-xs text-red-500">{t('producerRequest.form.errNameKo')}</p>}
                </div>

                <div className="space-y-1.5">
                  <FormFieldLabel required>{t('producerRequest.form.nameEn')}</FormFieldLabel>
                  <input
                    {...register('nameEn', { required: true, maxLength: 200 })}
                    required
                    aria-required="true"
                    maxLength={200}
                    className={`${FIELD_CLS} bg-white ${errors.nameEn ? 'border-red-400' : 'border-neutral-300'}`}
                    placeholder="Glenfiddich Producer"
                  />
                  {errors.nameEn && <p className="text-xs text-red-500">{t('producerRequest.form.errNameEn')}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <FormFieldLabel required>{t('producerRequest.form.country')}</FormFieldLabel>
                {customCountry ? (
                  <div className="flex gap-2">
                    <input
                      required
                      aria-required="true"
                      value={countryNameKo}
                      onChange={(e) => { setCountryNameKo(e.target.value); if (e.target.value) setCountryError(false) }}
                      placeholder={t('producerRequest.form.customCountryPlaceholder', '국가 직접 입력 (예: 조지아)')}
                      maxLength={100}
                      className={`${FIELD_CLS} bg-white ${countryError ? 'border-red-400' : 'border-neutral-300'}`}
                    />
                    <input
                      value={regionNameKo}
                      onChange={(e) => setRegionNameKo(e.target.value)}
                      placeholder={t('producerRequest.form.customRegionPlaceholder', '지역 (선택)')}
                      maxLength={100}
                      className={`${FIELD_CLS} bg-white border-neutral-300`}
                    />
                  </div>
                ) : (
                  <div aria-required="true">
                    <CountryRegionSelector
                      countryCode={countryCode}
                      regionNameKo={regionNameKo}
                      onCountryChange={(code, nameKo) => { setCountryCode(code); setCountryNameKo(nameKo); if (nameKo) setCountryError(false) }}
                      onRegionChange={(nameKo) => setRegionNameKo(nameKo)}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const next = !customCountry
                    setCustomCountry(next)
                    // 모드 전환 시 국가/지역 값 초기화 (혼선 방지)
                    setCountryCode(null); setCountryNameKo(''); setRegionNameKo(''); setCountryError(false)
                  }}
                  className="text-xs text-primary-700 hover:text-primary-900 hover:underline"
                >
                  {customCountry
                    ? t('producerRequest.form.selectCountryLink', '↩ 목록에서 국가 선택')
                    : t('producerRequest.form.customCountryLink', '찾는 국가가 없나요? 직접 입력')}
                </button>
                {countryError && <p className="text-xs text-red-500">{t('producerRequest.form.errCountry')}</p>}
              </div>

              <p className="text-xs text-amber-700/80">{t('producerRequest.form.requiredNote')}</p>
            </div>

            {/* ── 선택 정보 ─────────────────────────────────── */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-neutral-400" />
                <h2 className="text-sm font-bold text-neutral-600">{t('producerRequest.form.optionalSection')}</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-neutral-700">{t('producerRequest.form.website')}</label>
                  <input
                    {...register('website')}
                    type="url"
                    placeholder="https://example.com"
                    maxLength={500}
                    className={`${FIELD_CLS} bg-white border-neutral-300`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-neutral-700">{t('producerRequest.form.foundedYear')}</label>
                  <NumberInput
                    {...register('foundedYear', { min: 1500, max: new Date().getFullYear() })}
                    placeholder={t('producerRequest.form.foundedYearPlaceholder', '예) 1824')}
                    min={1500}
                    max={new Date().getFullYear()}
                    className={`${FIELD_CLS} bg-white border-neutral-300`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">{t('producerRequest.form.descriptionKo')}</label>
                <AutoGrowTextarea
                  {...register('descriptionKo')}
                  rows={3}
                  maxLength={2000}
                  placeholder={t('producerRequest.form.descriptionKoPlaceholder', '생산자 소개를 입력해주세요.')}
                  className={`${FIELD_CLS} bg-white border-neutral-300`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">{t('producerRequest.form.descriptionEn')}</label>
                <AutoGrowTextarea
                  {...register('descriptionEn')}
                  rows={3}
                  maxLength={2000}
                  placeholder="Enter producer description."
                  className={`${FIELD_CLS} bg-white border-neutral-300`}
                />
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
