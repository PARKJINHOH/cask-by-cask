import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import { useMyVenueRequests, useSubmitVenueRequest } from '@/domain/venue/hooks/useVenueRequests'
import { useVenueCountries } from '@/domain/venue/hooks/useVenues'
import {
  VENUE_TYPES,
  type VenueRequestBody,
  type VenueType,
} from '@/domain/venue/types/venue.types'
import { venueCountryLabelKey, venueTypeLabelKey } from '@/domain/venue/utils/venueLabels'
import { VENUE_FEATURE_ENABLED } from '@/domain/venue/config/venueFeature'
import NotFoundPage from '@/views-spa/NotFoundPage'

const INPUT_CLASS =
  'w-full border border-neutral-300 px-3 py-2.5 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-400'

interface FormValues {
  venueType: VenueType
  nameKo: string
  nameEn: string
  nameLocal: string
  countryCode: string
  cityName: string
  address: string
  addressDetail: string
  phone: string
  website: string
  instagramUrl: string
  openingHours: string
  naverMapsUrl: string
  kakaoMapsUrl: string
  googleMapsUrl: string
  descriptionKo: string
}

function blank(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-neutral-100 text-neutral-600',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-600',
}

/**
 * 장소 제보.
 *
 * <p>관리자 등록 폼보다 훨씬 짧다 — 제보자에게 좌표·place id·영문 소개까지 요구하면
 * 아무도 제보하지 않는다. <b>좌표를 묻지 않는 것</b>이 특히 중요하다.
 * 대신 지도 공유 링크를 받아 두고, 관리자가 승인하며 핀을 찍는다.
 *
 * <p>승인되면 <b>비공개 상태로</b> 만들어진다(좌표 확인 전이므로). 관리자가 위치를 확인한 뒤
 * 직접 공개로 올리는 것이 정상 흐름이다.
 */
export default function VenueRequestPage() {
  const { t } = useTranslation()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: countries } = useVenueCountries()
  const { data: myRequests, isLoading } = useMyVenueRequests(VENUE_FEATURE_ENABLED)
  const submit = useSubmitVenueRequest()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { venueType: 'BAR', countryCode: 'kr' },
  })

  if (!VENUE_FEATURE_ENABLED) return <NotFoundPage />

  const onSubmit = (form: FormValues) => {
    setError(null)
    const body: VenueRequestBody = {
      venueType: form.venueType,
      nameKo: form.nameKo.trim(),
      nameEn: blank(form.nameEn),
      nameLocal: blank(form.nameLocal),
      countryCode: form.countryCode.trim().toLowerCase(),
      cityName: blank(form.cityName),
      address: form.address.trim(),
      addressDetail: blank(form.addressDetail),
      lat: null,
      lng: null,
      phone: blank(form.phone),
      website: blank(form.website),
      instagramUrl: blank(form.instagramUrl),
      openingHours: blank(form.openingHours),
      naverMapsUrl: blank(form.naverMapsUrl),
      kakaoMapsUrl: blank(form.kakaoMapsUrl),
      googleMapsUrl: blank(form.googleMapsUrl),
      descriptionKo: blank(form.descriptionKo),
    }
    submit.mutate(body, {
      onSuccess: () => {
        setSubmitted(true)
        reset({ venueType: 'BAR', countryCode: form.countryCode })
      },
      onError: (mutationError) => {
        const message = (mutationError as { response?: { data?: { message?: string } } })?.response
          ?.data?.message
        setError(message ?? t('venue.comment.saveFailed', '저장하지 못했어요. 잠시 후 다시 시도해주세요.'))
      },
    })
  }

  // 카탈로그에 없는 국가도 제보할 수 있어야 해서, 등록된 국가 + 흔한 후보를 함께 보여 준다.
  const countryOptions = Array.from(
    new Set([...(countries ?? []).map((c) => c.countryCode), 'kr', 'jp', 'tw', 'hk', 'sg']),
  ).sort()

  return (
    <div className="user-content-container mx-auto px-4 py-6">
      <SeoMeta title={t('venue.request.title', '장소 제보')} noindex />

      <h1 className="text-2xl font-bold text-neutral-900">
        {t('venue.request.title', '장소 제보')}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t('venue.request.description', '알고 계신 바·보틀샵을 알려주세요. 확인 후 지도에 올라갑니다.')}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <RequiredFieldsNotice />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700">
                {t('venue.picker.label', '종류')}<RequiredMark />
              </label>
              <select className={INPUT_CLASS} {...register('venueType', { required: true })}>
                {VENUE_TYPES.map((type) => (
                  <option key={type} value={type}>{t(venueTypeLabelKey(type), type)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700">
                {t('venue.detail.address', '국가')}<RequiredMark />
              </label>
              <select className={INPUT_CLASS} {...register('countryCode', { required: true })}>
                {countryOptions.map((code) => (
                  <option key={code} value={code}>
                    {t(venueCountryLabelKey(code), code.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-700">
                {t('venue.picker.label', '장소명')}<RequiredMark />
              </label>
              <input
                className={INPUT_CLASS}
                {...register('nameKo', { required: t('venue.comment.contentRequired', '내용을 입력해주세요.') })}
              />
              {errors.nameKo && <p className="text-xs text-red-500">{errors.nameKo.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700">도시</label>
              <input className={INPUT_CLASS} placeholder="오사카" {...register('cityName')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={INPUT_CLASS} placeholder="Bar Nayuta (영문명)" {...register('nameEn')} />
            <input className={INPUT_CLASS} placeholder="バー ナユタ (현지 표기)" {...register('nameLocal')} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700">
                {t('venue.detail.address', '주소')}<RequiredMark />
              </label>
              <input
                className={INPUT_CLASS}
                {...register('address', { required: t('venue.comment.contentRequired', '내용을 입력해주세요.') })}
              />
              {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700">층·호수</label>
              <input className={INPUT_CLASS} placeholder="지하 1층" {...register('addressDetail')} />
            </div>
          </div>

          <div className="space-y-1 rounded-xl border border-neutral-200 p-3">
            <p className="text-sm font-medium text-neutral-700">지도 공유 링크</p>
            <p className="text-xs text-neutral-400">
              지도 앱에서 &quot;공유&quot;로 나온 링크를 붙여넣어 주시면 위치를 더 정확히 찾을 수 있어요.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input className={INPUT_CLASS} placeholder="네이버 지도" {...register('naverMapsUrl')} />
              <input className={INPUT_CLASS} placeholder="카카오맵" {...register('kakaoMapsUrl')} />
              <input className={INPUT_CLASS} placeholder="구글 지도" {...register('googleMapsUrl')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input className={INPUT_CLASS} placeholder={t('venue.detail.phone', '전화')} {...register('phone')} />
            <input className={INPUT_CLASS} placeholder="https://" {...register('website')} />
            <input className={INPUT_CLASS} placeholder="Instagram" {...register('instagramUrl')} />
          </div>

          <AutoGrowTextarea
            className={INPUT_CLASS}
            placeholder={t('venue.detail.hours', '영업시간') + ' — 화–일 19:00–02:00 / 월 휴무'}
            {...register('openingHours')}
          />

          <AutoGrowTextarea
            className={INPUT_CLASS}
            placeholder="어떤 곳인가요? 추천 이유를 알려주세요."
            {...register('descriptionKo')}
          />

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {submitted && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {t('venue.request.submitted', '제보가 접수되었어요. 확인 후 알림으로 알려드릴게요.')}
            </p>
          )}

          <Button type="submit" isLoading={submit.isPending} fullWidth>
            {t('venue.request.submit', '제보하기')}
          </Button>
        </form>

        {/* 내 제보 */}
        <aside>
          <h2 className="text-sm font-semibold text-neutral-700">
            {t('venue.request.myRequests', '내 제보')}
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !myRequests || myRequests.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-400">
              {t('venue.request.empty', '아직 제보한 장소가 없어요.')}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {myRequests.map((request) => (
                <li key={request.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-neutral-900">
                      {request.venue.nameKo}
                    </span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${STATUS_STYLE[request.status]}`}>
                      {t(`venue.request.status${request.status.charAt(0)}${request.status.slice(1).toLowerCase()}`,
                        request.status)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">{request.venue.address}</p>
                  {request.rejectReason && (
                    <p className="mt-1 text-xs text-red-500">{request.rejectReason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}
