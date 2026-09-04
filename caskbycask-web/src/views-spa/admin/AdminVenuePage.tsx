import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'
import VenueMapPicker from '@/domain/venue/components/VenueMapPicker'
import VenueLinkResolveField from '@/domain/admin/components/VenueLinkResolveField'
import {
  useAdminVenues,
  useAdminVenueCities,
  useCreateVenue,
  useUpdateVenue,
  useDeleteVenue,
  type VenueFilters,
} from '@/domain/admin/hooks/useAdminVenue'
import {
  VENUE_STATUSES,
  VENUE_STATUS_LABEL_KO,
  VENUE_TYPES,
  VENUE_TYPE_LABEL_KO,
  type AdminVenue,
  type AdminVenueCity,
  type VenueLinkResolveResult,
  type VenueStatus,
  type VenueType,
  type VenueUpsertPayload,
} from '@/domain/venue/types/venue.types'

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-400'

const STATUS_BADGE: Record<VenueStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  HIDDEN: 'bg-neutral-100 text-neutral-500 border-neutral-200',
  CLOSED: 'bg-amber-50 text-amber-700 border-amber-200',
}

interface FormValues {
  venueCityId: string
  venueType: VenueType
  status: VenueStatus
  nameKo: string
  nameEn: string
  nameLocal: string
  address: string
  addressDetail: string
  phone: string
  website: string
  instagramUrl: string
  openingHours: string
  googleMapsUrl: string
  naverMapsUrl: string
  kakaoMapsUrl: string
  googlePlaceId: string
  naverPlaceId: string
  descriptionKo: string
  descriptionEn: string
}

/**
 * 붙여넣은 링크를 어느 지도 앱 칸에 넣을지 호스트로 고른다.
 *
 * <p>문자열 포함 검사가 아니라 <b>호스트</b>로 판단한다 — 'kakao' 가 경로나 쿼리에 섞인
 * 남의 도메인 링크를 카카오 칸에 넣어 버리면 사용자 화면의 길찾기가 엉뚱한 곳으로 간다.
 */
function mapUrlFieldFor(link: string): keyof FormValues | null {
  let host: string
  try {
    host = new URL(link.trim()).hostname.toLowerCase()
  } catch {
    return null
  }
  const matches = (domain: string) => host === domain || host.endsWith('.' + domain)

  if (matches('naver.com') || host === 'naver.me') return 'naverMapsUrl'
  if (matches('kakao.com')) return 'kakaoMapsUrl'
  if (matches('google.com') || matches('goo.gl')) return 'googleMapsUrl'
  return null
}

function blank(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

// ── 등록·수정 폼 ─────────────────────────────────────────

interface VenueFormProps {
  cities: AdminVenueCity[]
  initial?: AdminVenue
  onSave: (payload: VenueUpsertPayload) => void
  onCancel: () => void
  isPending: boolean
  errorMessage?: string | null
}

function VenueForm({ cities, initial, onSave, onCancel, isPending, errorMessage }: VenueFormProps) {
  const detail = initial?.venue
  const summary = detail?.summary

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      venueCityId: summary ? String(summary.cityId) : String(cities[0]?.id ?? ''),
      venueType: summary?.venueType ?? 'BAR',
      status: summary?.status ?? 'HIDDEN',
      nameKo: summary?.nameKo ?? '',
      nameEn: summary?.nameEn ?? '',
      nameLocal: summary?.nameLocal ?? '',
      address: summary?.address ?? '',
      addressDetail: summary?.addressDetail ?? '',
      phone: detail?.phone ?? '',
      website: detail?.website ?? '',
      instagramUrl: detail?.instagramUrl ?? '',
      openingHours: detail?.openingHours ?? '',
      googleMapsUrl: detail?.googleMapsUrl ?? '',
      naverMapsUrl: detail?.naverMapsUrl ?? '',
      kakaoMapsUrl: detail?.kakaoMapsUrl ?? '',
      googlePlaceId: detail?.googlePlaceId ?? '',
      naverPlaceId: detail?.naverPlaceId ?? '',
      descriptionKo: detail?.descriptionKo ?? '',
      descriptionEn: detail?.descriptionEn ?? '',
    },
  })

  // 좌표는 지도·드래그·직접입력 세 경로에서 바뀌므로 폼 라이브러리 밖의 상태로 둔다.
  const [lat, setLat] = useState<number | null>(summary?.lat ?? null)
  const [lng, setLng] = useState<number | null>(summary?.lng ?? null)

  /**
   * 해석 결과를 폼에 붙인다.
   *
   * <p>덮어쓰지 않고 <b>비어 있는 칸만</b> 채운다 — 관리자가 손으로 넣은 값을 링크 한 번에
   * 날려 버리면 무엇이 바뀌었는지 알 수 없다. 좌표만은 예외다: 방금 "좌표 가져오기"를 누른
   * 의도가 명확하고, 틀렸으면 바로 아래 지도에서 핀을 옮기면 된다.
   */
  const applyResolved = (result: VenueLinkResolveResult, pastedLink: string) => {
    if (result.lat != null && result.lng != null) {
      setLat(result.lat)
      setLng(result.lng)
    }
    fillIfEmpty('googlePlaceId', result.googlePlaceId)
    fillIfEmpty('naverPlaceId', result.naverPlaceId)

    // 붙여넣은 링크는 지도 앱 링크로도 쓸 만하다. 어느 칸인지는 호스트가 정한다.
    const field = mapUrlFieldFor(pastedLink)
    if (field) fillIfEmpty(field, result.resolvedUrl ?? pastedLink)
  }

  const fillIfEmpty = (field: keyof FormValues, value: string | null) => {
    if (!value) return
    // 핸들러 안에서는 getValues 다 — watch 는 렌더 구독용이라 여기서 부르면 불필요한 재렌더가 붙는다.
    if (getValues(field).trim() !== '') return
    setValue(field, value, { shouldDirty: true })
  }

  const selectedCityId = watch('venueCityId')
  const status = watch('status')
  const selectedCity = cities.find((c) => String(c.id) === selectedCityId)

  const cityCenter = selectedCity
    ? { lat: selectedCity.centerLat, lng: selectedCity.centerLng, zoom: selectedCity.defaultZoom }
    : null

  // 서버도 같은 규칙으로 막지만, 저장 버튼을 눌러 보고 알게 되는 것보다 미리 보이는 편이 낫다.
  const missingCoordinatesForActive = status === 'ACTIVE' && (lat == null || lng == null)

  const submit = (form: FormValues) => {
    onSave({
      venueCityId: Number(form.venueCityId),
      venueType: form.venueType,
      status: form.status,
      nameKo: form.nameKo.trim(),
      nameEn: blank(form.nameEn),
      nameLocal: blank(form.nameLocal),
      address: form.address.trim(),
      addressDetail: blank(form.addressDetail),
      lat,
      lng,
      phone: blank(form.phone),
      website: blank(form.website),
      instagramUrl: blank(form.instagramUrl),
      openingHours: blank(form.openingHours),
      googleMapsUrl: blank(form.googleMapsUrl),
      naverMapsUrl: blank(form.naverMapsUrl),
      kakaoMapsUrl: blank(form.kakaoMapsUrl),
      googlePlaceId: blank(form.googlePlaceId),
      naverPlaceId: blank(form.naverPlaceId),
      descriptionKo: blank(form.descriptionKo),
      descriptionEn: blank(form.descriptionEn),
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <RequiredFieldsNotice admin />

      {/* 분류 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            도시<RequiredMark />
          </label>
          <select className={INPUT_CLASS} {...register('venueCityId', { required: true })}>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.countryCode.toUpperCase()} · {city.nameKo}
                {city.active ? '' : ' (노출 꺼짐)'}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            유형<RequiredMark />
          </label>
          <select className={INPUT_CLASS} {...register('venueType', { required: true })}>
            {VENUE_TYPES.map((type) => (
              <option key={type} value={type}>{VENUE_TYPE_LABEL_KO[type]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            노출 상태<RequiredMark />
          </label>
          <select className={INPUT_CLASS} {...register('status', { required: true })}>
            {VENUE_STATUSES.map((value) => (
              <option key={value} value={value}>{VENUE_STATUS_LABEL_KO[value]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 이름 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            장소명(한글)<RequiredMark />
          </label>
          <input className={INPUT_CLASS} {...register('nameKo', { required: '장소명을 입력해주세요.' })} />
          {errors.nameKo && <p className="text-xs text-red-500">{errors.nameKo.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">장소명(영문)</label>
          <input className={INPUT_CLASS} placeholder="Bar Nayuta" {...register('nameEn')} />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">현지 표기</label>
          <input className={INPUT_CLASS} placeholder="バー ナユタ" {...register('nameLocal')} />
          <p className="text-xs text-neutral-400">현장에서 간판을 찾는 데 쓰인다</p>
        </div>
      </div>

      {/* 주소 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            주소<RequiredMark />
          </label>
          <input className={INPUT_CLASS} {...register('address', { required: '주소를 입력해주세요.' })} />
          {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">상세 주소(층·호)</label>
          <input className={INPUT_CLASS} placeholder="지하 1층" {...register('addressDetail')} />
        </div>
      </div>

      {/* 좌표 — 공유 링크로 채우거나, 지도에서 직접 찍는다.
          링크 해석은 거들 뿐이고 핀 드롭이 항상 살아 있는 정상 경로다. */}
      <VenueLinkResolveField
        addressHint={watch('address')}
        onResolved={applyResolved}
        inputClassName={INPUT_CLASS}
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-700">
          지도 위치{status === 'ACTIVE' && <RequiredMark />}
        </label>
        <VenueMapPicker
          lat={lat}
          lng={lng}
          cityCenter={cityCenter}
          onChange={(point) => { setLat(point.lat); setLng(point.lng) }}
        />
        {missingCoordinatesForActive && (
          <p className="text-xs font-medium text-red-500">
            공개(ACTIVE) 상태로 저장하려면 지도 위치를 먼저 지정해야 합니다.
          </p>
        )}
      </div>

      {/* 연락처 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">전화번호</label>
          <input className={INPUT_CLASS} placeholder="02-1234-5678" {...register('phone')} />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">웹사이트</label>
          <input className={INPUT_CLASS} placeholder="https://" {...register('website')} />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">인스타그램</label>
          <input className={INPUT_CLASS} placeholder="https://instagram.com/" {...register('instagramUrl')} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-700">영업시간</label>
        <AutoGrowTextarea
          className={INPUT_CLASS}
          placeholder="화–일 19:00–02:00 / 월 휴무"
          {...register('openingHours')}
        />
        <p className="text-xs text-neutral-400">
          자유 텍스트로 그대로 표시된다. 구조화하지 않으므로 검색 결과(리치 스니펫)에는 쓰이지 않는다.
        </p>
      </div>

      {/* 지도 링크 */}
      <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm font-medium text-neutral-700">지도 앱 링크</p>
        <p className="text-xs text-neutral-400">
          채워 두면 사용자 화면에서 이름·주소 검색 링크 대신 이 주소를 먼저 쓴다.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input className={INPUT_CLASS} placeholder="네이버 지도 URL" {...register('naverMapsUrl')} />
          <input className={INPUT_CLASS} placeholder="카카오 지도 URL" {...register('kakaoMapsUrl')} />
          <input className={INPUT_CLASS} placeholder="구글 지도 URL" {...register('googleMapsUrl')} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={INPUT_CLASS} placeholder="구글 place id" {...register('googlePlaceId')} />
          <input className={INPUT_CLASS} placeholder="네이버 place id" {...register('naverPlaceId')} />
        </div>
      </div>

      {/* 소개 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">소개(한글)</label>
          <AutoGrowTextarea className={INPUT_CLASS} {...register('descriptionKo')} />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">소개(영문)</label>
          <AutoGrowTextarea className={INPUT_CLASS} {...register('descriptionEn')} />
        </div>
      </div>

      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>취소</Button>
        <Button type="submit" isLoading={isPending}>저장</Button>
      </div>
    </form>
  )
}

// ── 페이지 ───────────────────────────────────────────────

const EMPTY_FILTERS: VenueFilters = {
  keyword: '', countryCode: '', cityId: '', venueType: '', status: '',
}

export default function AdminVenuePage() {
  const [filterInput, setFilterInput] = useState<VenueFilters>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<VenueFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminVenue | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: cities } = useAdminVenueCities()
  const { data, isLoading } = useAdminVenues(filters, page)
  const create = useCreateVenue()
  const update = useUpdateVenue()
  const remove = useDeleteVenue()

  const cityList = useMemo(() => cities ?? [], [cities])
  const countryCodes = useMemo(
    () => Array.from(new Set(cityList.map((c) => c.countryCode))).sort(),
    [cityList],
  )
  // 국가 필터를 고르면 도시 셀렉트도 그 국가로 좁힌다 — 다른 국가 도시가 남아 있으면 결과가 0건이 된다.
  const selectableCities = filterInput.countryCode
    ? cityList.filter((c) => c.countryCode === filterInput.countryCode)
    : cityList

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(0)
    setFilters(filterInput)
  }

  const resetFilters = () => {
    setFilterInput(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
    setPage(0)
  }

  const errorText = (error: unknown) => {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    return message ?? '저장하지 못했습니다. 잠시 후 다시 시도해주세요.'
  }

  const handleCreate = (payload: VenueUpsertPayload) => {
    setSaveError(null)
    create.mutate(payload, {
      onSuccess: () => setShowCreate(false),
      onError: (error) => setSaveError(errorText(error)),
    })
  }

  const handleUpdate = (payload: VenueUpsertPayload) => {
    if (!editTarget) return
    setSaveError(null)
    update.mutate({ id: editTarget.venue.summary.id, data: payload }, {
      onSuccess: () => setEditTarget(null),
      onError: (error) => setSaveError(errorText(error)),
    })
  }

  const handleDelete = (venue: AdminVenue) => {
    const name = venue.venue.summary.nameKo
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return
    remove.mutate(venue.venue.summary.id)
  }

  const hasCities = cityList.length > 0

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">장소 관리</h1>
        <div className="flex gap-2">
          <Link to="/admin/venues/cities">
            <Button size="sm" variant="secondary">도시 관리</Button>
          </Link>
          <Button
            size="sm"
            disabled={!hasCities}
            onClick={() => { setSaveError(null); setShowCreate(true); setEditTarget(null) }}
          >
            + 장소 추가
          </Button>
        </div>
      </div>

      {!hasCities && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          등록된 도시가 없습니다. 장소는 도시에 속하므로{' '}
          <Link to="/admin/venues/cities" className="font-semibold underline">도시 관리</Link>
          에서 도시를 먼저 추가해주세요.
        </p>
      )}

      <form onSubmit={handleSearch} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">검색어</label>
            <input
              className={INPUT_CLASS}
              placeholder="이름·주소 검색"
              value={filterInput.keyword}
              onChange={(e) => setFilterInput((f) => ({ ...f, keyword: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">국가</label>
            <select
              className={INPUT_CLASS}
              value={filterInput.countryCode}
              onChange={(e) =>
                setFilterInput((f) => ({ ...f, countryCode: e.target.value, cityId: '' }))}
            >
              <option value="">전체</option>
              {countryCodes.map((code) => (
                <option key={code} value={code}>{code.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">도시</label>
            <select
              className={INPUT_CLASS}
              value={filterInput.cityId}
              onChange={(e) => setFilterInput((f) => ({ ...f, cityId: e.target.value }))}
            >
              <option value="">전체</option>
              {selectableCities.map((city) => (
                <option key={city.id} value={city.id}>{city.nameKo}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">유형</label>
            <select
              className={INPUT_CLASS}
              value={filterInput.venueType}
              onChange={(e) =>
                setFilterInput((f) => ({ ...f, venueType: e.target.value as VenueType | '' }))}
            >
              <option value="">전체</option>
              {VENUE_TYPES.map((type) => (
                <option key={type} value={type}>{VENUE_TYPE_LABEL_KO[type]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">노출 상태</label>
            <select
              className={INPUT_CLASS}
              value={filterInput.status}
              onChange={(e) =>
                setFilterInput((f) => ({ ...f, status: e.target.value as VenueStatus | '' }))}
            >
              <option value="">전체</option>
              {VENUE_STATUSES.map((value) => (
                <option key={value} value={value}>{VENUE_STATUS_LABEL_KO[value]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={resetFilters}>초기화</Button>
          <Button type="submit" size="sm">검색</Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : !data || data.content.length === 0 ? (
          <p className="p-10 text-center text-sm text-neutral-500">조건에 맞는 장소가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">장소명</th>
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">도시</th>
                  <th className="px-4 py-3 font-medium">주소</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">지도</th>
                  <th className="px-4 py-3 font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.content.map((row) => {
                  const venue = row.venue.summary
                  return (
                    <tr key={venue.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900">{venue.nameKo}</span>
                        {venue.nameLocal && (
                          <span className="ml-2 text-xs text-neutral-400">{venue.nameLocal}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {VENUE_TYPE_LABEL_KO[venue.venueType]}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {venue.countryCode.toUpperCase()} · {venue.cityNameKo}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-neutral-500">
                        {venue.address}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-md border px-2 py-0.5 text-xs ${STATUS_BADGE[venue.status]}`}>
                          {VENUE_STATUS_LABEL_KO[venue.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {venue.mappable ? (
                          <span className="text-xs text-emerald-600">표시됨</span>
                        ) : (
                          <span className="text-xs text-neutral-400">
                            {venue.lat == null ? '좌표 없음' : '마커 제외'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-xs text-neutral-600 underline hover:text-neutral-900"
                            onClick={() => { setSaveError(null); setEditTarget(row); setShowCreate(false) }}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="text-xs text-red-500 underline hover:text-red-700"
                            onClick={() => handleDelete(row)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
          scrollTarget="page"
        />
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="장소 추가"
        size="2xl"
        closeOnOverlay={false}
      >
        <VenueForm
          cities={cityList}
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
          isPending={create.isPending}
          errorMessage={saveError}
        />
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="장소 수정"
        size="2xl"
        closeOnOverlay={false}
      >
        {editTarget && (
          <VenueForm
            // 수정 대상이 바뀌면 폼 기본값을 다시 잡아야 한다 — key 없이는 이전 장소 값이 남는다.
            key={editTarget.venue.summary.id}
            cities={cityList}
            initial={editTarget}
            onSave={handleUpdate}
            onCancel={() => setEditTarget(null)}
            isPending={update.isPending}
            errorMessage={saveError}
          />
        )}
      </Modal>
    </div>
  )
}
