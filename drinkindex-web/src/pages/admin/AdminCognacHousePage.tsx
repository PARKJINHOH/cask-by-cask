import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import {
  useAdminCognacHouses,
  useCreateCognacHouse,
  useUpdateCognacHouse,
  useDeleteCognacHouse,
} from '@/domain/admin/hooks/useAdminCognacHouse'
import type { CognacHouse, CreateCognacHousePayload, UpdateCognacHousePayload } from '@/domain/cognachouse/types/cognachouse.types'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'

interface FormValues {
  nameKo: string
  nameEn: string
  country: string
  region?: string
  website?: string
  foundedYear?: number | ''
  descriptionKo?: string
  descriptionEn?: string
}

interface CognacHouseFormProps {
  initial?: CognacHouse
  onSave: (data: FormValues) => void
  onCancel: () => void
  isPending: boolean
}

function CognacHouseForm({ initial, onSave, onCancel, isPending }: CognacHouseFormProps) {
  const initialCountryEntry = initial?.country
    ? ISO3166_COUNTRIES.find((c) => c.nameKo === initial.country) ?? null
    : null

  const [countryCode, setCountryCode] = useState<string | null>(initialCountryEntry?.code ?? null)
  const [countryNameKo, setCountryNameKo] = useState(initialCountryEntry?.nameKo ?? '')
  const [regionNameKo, setRegionNameKo] = useState(initial?.region ?? '')
  const [countryError, setCountryError] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Omit<FormValues, 'country' | 'region'>>({
    defaultValues: initial ? {
      nameKo: initial.nameKo,
      nameEn: initial.nameEn,
      website: initial.website ?? '',
      foundedYear: initial.foundedYear ?? '',
      descriptionKo: initial.descriptionKo ?? '',
      descriptionEn: initial.descriptionEn ?? '',
    } : undefined,
  })

  const onSubmit = (data: Omit<FormValues, 'country' | 'region'>) => {
    if (!countryNameKo) { setCountryError(true); return }
    setCountryError(false)
    onSave({
      ...data,
      country: countryNameKo,
      region: regionNameKo || undefined,
      website: data.website || undefined,
      foundedYear: data.foundedYear ? Number(data.foundedYear) : undefined,
      descriptionKo: data.descriptionKo || undefined,
      descriptionEn: data.descriptionEn || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">한국어명 *</label>
          <input
            {...register('nameKo', { required: true, maxLength: 200 })}
            maxLength={200}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400 ${errors.nameKo ? 'border-red-400' : 'border-neutral-200'}`}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">영어명 *</label>
          <input
            {...register('nameEn', { required: true, maxLength: 200 })}
            maxLength={200}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400 ${errors.nameEn ? 'border-red-400' : 'border-neutral-200'}`}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">설립연도</label>
          <input
            {...register('foundedYear')}
            type="number"
            placeholder="예) 1765"
            min={1500}
            max={new Date().getFullYear()}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">웹사이트</label>
          <input
            {...register('website')}
            type="url"
            placeholder="https://example.com"
            maxLength={500}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-600">국가 * / 지역</label>
          <CountryRegionSelector
            countryCode={countryCode}
            regionNameKo={regionNameKo}
            onCountryChange={(code, nameKo) => {
              setCountryCode(code)
              setCountryNameKo(nameKo)
              if (nameKo) setCountryError(false)
            }}
            onRegionChange={(nameKo) => setRegionNameKo(nameKo)}
          />
          {countryError && <p className="text-xs text-red-500">국가를 선택해주세요.</p>}
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-600">소개 (한국어)</label>
          <textarea
            {...register('descriptionKo')}
            rows={3}
            placeholder="꼬냑 하우스 소개를 입력하세요."
            maxLength={2000}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400 resize-none"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-600">소개 (영어)</label>
          <textarea
            {...register('descriptionEn')}
            rows={3}
            placeholder="Enter cognac house description."
            maxLength={2000}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400 resize-none"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>취소</Button>
        <Button type="submit" size="sm" isLoading={isPending}>
          {initial ? '수정 완료' : '등록'}
        </Button>
      </div>
    </form>
  )
}

export default function AdminCognacHousePage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<CognacHouse | null>(null)

  const { data, isLoading } = useAdminCognacHouses(keyword, page)
  const create = useCreateCognacHouse()
  const update = useUpdateCognacHouse()
  const remove = useDeleteCognacHouse()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setKeyword(searchRef.current?.value.trim() ?? '')
    setPage(0)
  }

  const handleCreate = (form: FormValues) => {
    const payload: CreateCognacHousePayload = {
      nameKo: form.nameKo,
      nameEn: form.nameEn,
      country: form.country,
      region: form.region || undefined,
      website: form.website || undefined,
      foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
      descriptionKo: form.descriptionKo || undefined,
      descriptionEn: form.descriptionEn || undefined,
    }
    create.mutate(payload, { onSuccess: () => setShowCreate(false) })
  }

  const handleUpdate = (form: FormValues) => {
    if (!editTarget) return
    const payload: UpdateCognacHousePayload = {
      nameKo: form.nameKo,
      nameEn: form.nameEn,
      country: form.country,
      region: form.region || null,
      website: form.website || null,
      foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
      descriptionKo: form.descriptionKo || null,
      descriptionEn: form.descriptionEn || null,
    }
    update.mutate({ id: editTarget.id, data: payload }, { onSuccess: () => setEditTarget(null) })
  }

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return
    remove.mutate(id)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">꼬냑 하우스 관리</h1>
        <Button size="sm" onClick={() => { setShowCreate(true); setEditTarget(null) }}>
          + 꼬냑 하우스 추가
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 p-4 bg-white rounded-xl shadow-sm">
        <input
          ref={searchRef}
          placeholder="꼬냑 하우스명 검색... (한글/영어)"
          className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <Button type="submit" size="sm" variant="secondary">검색</Button>
      </form>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm p-5 border border-primary-100">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">새 꼬냑 하우스 등록</h2>
          <CognacHouseForm
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            isPending={create.isPending}
          />
        </div>
      )}

      {editTarget && (
        <div className="bg-white rounded-xl shadow-sm p-5 border border-amber-100">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">
            꼬냑 하우스 수정 — {editTarget.nameKo}
          </h2>
          <CognacHouseForm
            initial={editTarget}
            onSave={handleUpdate}
            onCancel={() => setEditTarget(null)}
            isPending={update.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-16">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">한국어명</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">영어명</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">국가</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">지역</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">설립연도</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">웹사이트</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((h) => (
                    <tr key={h.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{h.id}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{h.nameKo}</td>
                      <td className="px-4 py-3 text-neutral-500">{h.nameEn}</td>
                      <td className="px-4 py-3 text-neutral-500">{h.country}</td>
                      <td className="px-4 py-3 text-neutral-400">{h.region ?? '-'}</td>
                      <td className="px-4 py-3 text-neutral-400">{h.foundedYear ?? '-'}</td>
                      <td className="px-4 py-3 text-neutral-400">
                        {h.website
                          ? <a href={h.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate max-w-[140px] inline-block">{h.website}</a>
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setEditTarget(h); setShowCreate(false) }}
                            className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(h.id, h.nameKo)}
                            disabled={remove.isPending}
                            className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
