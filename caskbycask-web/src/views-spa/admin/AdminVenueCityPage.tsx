import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import Spinner from '@/shared/components/Spinner'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import VenueMapPicker from '@/domain/venue/components/VenueMapPicker'
import {
  useAdminVenueCities,
  useCreateVenueCity,
  useUpdateVenueCity,
  useDeleteVenueCity,
} from '@/domain/admin/hooks/useAdminVenue'
import type { AdminVenueCity, VenueCityUpsertPayload } from '@/domain/venue/types/venue.types'

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-400'

interface FormValues {
  countryCode: string
  slug: string
  nameKo: string
  nameEn: string
  defaultZoom: string
  sortOrder: string
  isActive: boolean
}

interface CityFormProps {
  initial?: AdminVenueCity
  onSave: (payload: VenueCityUpsertPayload) => void
  onCancel: () => void
  isPending: boolean
  errorMessage?: string | null
}

function CityForm({ initial, onSave, onCancel, isPending, errorMessage }: CityFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      countryCode: initial?.countryCode ?? '',
      slug: initial?.slug ?? '',
      nameKo: initial?.nameKo ?? '',
      nameEn: initial?.nameEn ?? '',
      defaultZoom: String(initial?.defaultZoom ?? 11),
      sortOrder: String(initial?.sortOrder ?? 0),
      isActive: initial ? initial.active : true,
    },
  })

  const [lat, setLat] = useState<number | null>(initial?.centerLat ?? null)
  const [lng, setLng] = useState<number | null>(initial?.centerLng ?? null)

  const submit = (form: FormValues) => {
    if (lat == null || lng == null) return
    onSave({
      countryCode: form.countryCode.trim().toLowerCase(),
      slug: form.slug.trim().toLowerCase(),
      nameKo: form.nameKo.trim(),
      nameEn: form.nameEn.trim(),
      centerLat: lat,
      centerLng: lng,
      defaultZoom: form.defaultZoom.trim() === '' ? null : Number(form.defaultZoom),
      sortOrder: form.sortOrder.trim() === '' ? null : Number(form.sortOrder),
      isActive: form.isActive,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <RequiredFieldsNotice admin />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            국가 코드<RequiredMark />
          </label>
          <input
            className={INPUT_CLASS}
            placeholder="jp"
            // 국가는 등록 후 바꿀 수 없다 — 장소의 country_code 가 도시에서 비정규화된 값이라
            // 갈아치우면 이미 매달린 장소들이 조용히 어긋난다. 서버도 같은 이유로 거부한다.
            readOnly={!!initial}
            {...register('countryCode', {
              required: '국가 코드를 입력해주세요.',
              pattern: { value: /^[A-Za-z]{2}$/, message: '영문 2자입니다. (예: kr, jp, tw)' },
            })}
          />
          {initial && <p className="text-xs text-neutral-400">국가는 등록 후 변경할 수 없습니다.</p>}
          {errors.countryCode && <p className="text-xs text-red-500">{errors.countryCode.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            주소(slug)<RequiredMark />
          </label>
          <input
            className={INPUT_CLASS}
            placeholder="osaka"
            {...register('slug', {
              required: '도시 주소를 입력해주세요.',
              pattern: {
                value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                message: '영문 소문자·숫자와 하이픈만 쓸 수 있습니다.',
              },
            })}
          />
          <p className="text-xs text-neutral-400">/venues/{'{국가}'}/{'{주소}'} 에 그대로 쓰인다</p>
          {errors.slug && <p className="text-xs text-red-500">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            도시명(한글)<RequiredMark />
          </label>
          <input className={INPUT_CLASS} {...register('nameKo', { required: '도시명을 입력해주세요.' })} />
          {errors.nameKo && <p className="text-xs text-red-500">{errors.nameKo.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            도시명(영문)<RequiredMark />
          </label>
          <input className={INPUT_CLASS} {...register('nameEn', { required: '영문 도시명을 입력해주세요.' })} />
          {errors.nameEn && <p className="text-xs text-red-500">{errors.nameEn.message}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-700">
          지도 초기 중심<RequiredMark />
        </label>
        <p className="text-xs text-neutral-400">
          장소 분포와 무관한 고정값이다. 시청·중심가처럼 도시를 대표하는 지점을 찍는다.
        </p>
        <VenueMapPicker
          lat={lat}
          lng={lng}
          onChange={(point) => { setLat(point.lat); setLng(point.lng) }}
        />
        {(lat == null || lng == null) && (
          <p className="text-xs font-medium text-red-500">지도 중심 좌표를 지정해주세요.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">초기 줌 (0~22)</label>
          <input className={INPUT_CLASS} inputMode="decimal" {...register('defaultZoom')} />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">노출 순서</label>
          <input className={INPUT_CLASS} inputMode="numeric" {...register('sortOrder')} />
          <p className="text-xs text-neutral-400">작을수록 먼저</p>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2 text-sm text-neutral-700">
            <input type="checkbox" className="h-4 w-4" {...register('isActive')} />
            사용자에게 노출
          </label>
        </div>
      </div>

      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>취소</Button>
        <Button type="submit" isLoading={isPending} disabled={lat == null || lng == null}>저장</Button>
      </div>
    </form>
  )
}

export default function AdminVenueCityPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminVenueCity | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: cities, isLoading } = useAdminVenueCities()
  const create = useCreateVenueCity()
  const update = useUpdateVenueCity()
  const remove = useDeleteVenueCity()

  const errorText = (error: unknown) => {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    return message ?? '저장하지 못했습니다. 잠시 후 다시 시도해주세요.'
  }

  const handleCreate = (payload: VenueCityUpsertPayload) => {
    setSaveError(null)
    create.mutate(payload, {
      onSuccess: () => setShowCreate(false),
      onError: (error) => setSaveError(errorText(error)),
    })
  }

  const handleUpdate = (payload: VenueCityUpsertPayload) => {
    if (!editTarget) return
    setSaveError(null)
    update.mutate({ id: editTarget.id, data: payload }, {
      onSuccess: () => setEditTarget(null),
      onError: (error) => setSaveError(errorText(error)),
    })
  }

  const handleDelete = (city: AdminVenueCity) => {
    if (city.venueCount > 0) {
      alert(
        `"${city.nameKo}"에 등록된 장소가 ${city.venueCount}건 있어 삭제할 수 없습니다.\n` +
        '노출을 끄는 것으로 대신해주세요.',
      )
      return
    }
    if (!confirm(`"${city.nameKo}"을(를) 삭제하시겠습니까?`)) return
    remove.mutate(city.id, { onError: (error) => alert(errorText(error)) })
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">장소 도시 관리</h1>
          <p className="mt-1 text-xs text-neutral-500">
            장소는 반드시 도시에 속한다. 도시를 추가하는 데 배포는 필요 없다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/venues">
            <Button size="sm" variant="secondary">장소 관리</Button>
          </Link>
          <Button size="sm" onClick={() => { setSaveError(null); setShowCreate(true) }}>
            + 도시 추가
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : !cities || cities.length === 0 ? (
          <p className="p-10 text-center text-sm text-neutral-500">등록된 도시가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">국가</th>
                  <th className="px-4 py-3 font-medium">도시</th>
                  <th className="px-4 py-3 font-medium">주소(slug)</th>
                  <th className="px-4 py-3 font-medium">중심 좌표</th>
                  <th className="px-4 py-3 font-medium">순서</th>
                  <th className="px-4 py-3 font-medium">장소 수</th>
                  <th className="px-4 py-3 font-medium">노출</th>
                  <th className="px-4 py-3 font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {cities.map((city) => (
                  <tr key={city.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-700">
                      {city.countryCode.toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-neutral-900">{city.nameKo}</span>
                      <span className="ml-2 text-xs text-neutral-400">{city.nameEn}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">{city.slug}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      {city.centerLat}, {city.centerLng} · z{city.defaultZoom}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{city.sortOrder}</td>
                    <td className="px-4 py-3 text-neutral-600">{city.venueCount}</td>
                    <td className="px-4 py-3">
                      {city.active ? (
                        <span className="text-xs text-emerald-600">노출</span>
                      ) : (
                        <span className="text-xs text-neutral-400">숨김</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-neutral-600 underline hover:text-neutral-900"
                          onClick={() => { setSaveError(null); setEditTarget(city) }}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-500 underline hover:text-red-700 disabled:text-neutral-300 disabled:no-underline"
                          disabled={city.venueCount > 0}
                          title={city.venueCount > 0 ? '등록된 장소가 있어 삭제할 수 없습니다' : undefined}
                          onClick={() => handleDelete(city)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="도시 추가"
        size="xl"
        closeOnOverlay={false}
      >
        <CityForm
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
          isPending={create.isPending}
          errorMessage={saveError}
        />
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="도시 수정"
        size="xl"
        closeOnOverlay={false}
      >
        {editTarget && (
          <CityForm
            key={editTarget.id}
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
