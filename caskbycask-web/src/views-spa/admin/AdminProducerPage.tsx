import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import {
  useAdminProducers,
  useCreateProducer,
  useUpdateProducer,
  useDeleteProducer,
  type ProducerFilters,
} from '@/domain/admin/hooks/useAdminProducer'
import type { Producer, ProducerType, CreateProducerPayload, UpdateProducerPayload } from '@/domain/producer/types/producer.types'
import { PRODUCER_TYPE_LABEL } from '@/domain/producer/types/producer.types'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'

const PRODUCER_TYPES: ProducerType[] = ['DISTILLERY', 'WINERY', 'COGNAC_HOUSE', 'OTHER']

interface FormValues {
  type: ProducerType
  nameKo: string
  nameEn: string
  country: string
  region?: string
  website?: string
  foundedYear?: number | ''
  descriptionKo?: string
  descriptionEn?: string
  searchKeywords?: string
}

interface ProducerFormProps {
  initial?: Producer
  onSave: (data: FormValues) => void
  onCancel: () => void
  isPending: boolean
}

function ProducerForm({ initial, onSave, onCancel, isPending }: ProducerFormProps) {
  const initialCountryEntry = initial?.country
    ? ISO3166_COUNTRIES.find((c) => c.nameKo === initial.country) ?? null
    : null

  const [countryCode, setCountryCode] = useState<string | null>(initialCountryEntry?.code ?? null)
  const [countryNameKo, setCountryNameKo] = useState(initialCountryEntry?.nameKo ?? '')
  const [regionNameKo, setRegionNameKo] = useState(initial?.region ?? '')
  const [countryError, setCountryError] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<Omit<FormValues, 'country' | 'region'>>({
    defaultValues: initial ? {
      type: initial.type,
      nameKo: initial.nameKo,
      nameEn: initial.nameEn,
      website: initial.website ?? '',
      foundedYear: initial.foundedYear ?? '',
      descriptionKo: initial.descriptionKo ?? '',
      descriptionEn: initial.descriptionEn ?? '',
      searchKeywords: initial.searchKeywords ?? '',
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
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-600">생산자 종류 *</label>
          <select
            {...register('type', { required: true })}
            defaultValue={initial?.type ?? 'DISTILLERY'}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            {PRODUCER_TYPES.map((tp) => (
              <option key={tp} value={tp}>{PRODUCER_TYPE_LABEL[tp].ko}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">한국어명 *</label>
          <input
            {...register('nameKo', { required: true, maxLength: 200 })}
            maxLength={200}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400 ${errors.nameKo ? 'border-red-400' : 'border-neutral-300'}`}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">영어명 *</label>
          <input
            {...register('nameEn', { required: true, maxLength: 200 })}
            maxLength={200}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400 ${errors.nameEn ? 'border-red-400' : 'border-neutral-300'}`}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">설립연도</label>
          <input
            {...register('foundedYear')}
            type="number"
            placeholder="예) 1824"
            min={1500}
            max={new Date().getFullYear()}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none
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
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-600">검색 별칭</label>
          <input
            {...register('searchKeywords')}
            maxLength={300}
            placeholder="한글 음차 변형 등 (예: 까뮤 까뮈). 표시엔 미사용, 검색에만 사용"
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none
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
            placeholder="증류소 소개를 입력하세요."
            maxLength={2000}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400 resize-none"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-600">소개 (영어)</label>
          <textarea
            {...register('descriptionEn')}
            rows={3}
            placeholder="Enter producer description."
            maxLength={2000}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none
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

type SortState = { field: string; dir: 'asc' | 'desc' }

function SortArrows({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span className="inline-flex flex-col ml-1 gap-[1px] align-middle">
      <svg width="7" height="4" viewBox="0 0 7 4" fill="currentColor"
        className={active && dir === 'asc' ? 'text-primary-600' : 'text-neutral-300'}>
        <path d="M3.5 0L7 4H0L3.5 0Z"/>
      </svg>
      <svg width="7" height="4" viewBox="0 0 7 4" fill="currentColor"
        className={active && dir === 'desc' ? 'text-primary-600' : 'text-neutral-300'}>
        <path d="M3.5 4L0 0H7L3.5 4Z"/>
      </svg>
    </span>
  )
}

const EMPTY_FILTERS: ProducerFilters = { nameKo: '', nameEn: '', country: '', foundedYear: '', type: '' }

export default function AdminProducerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFilters: ProducerFilters = {
    nameKo: searchParams.get('nameKo') ?? '',
    nameEn: searchParams.get('nameEn') ?? '',
    country: searchParams.get('country') ?? '',
    foundedYear: searchParams.get('foundedYear') ?? '',
    type: (searchParams.get('type') ?? '') as ProducerType | '',
  }
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const [filterInput, setFilterInput] = useState<ProducerFilters>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<ProducerFilters>(initialFilters)
  const [sort, setSort] = useState<SortState>({
    field: searchParams.get('sortField') ?? 'id',
    dir: searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc',
  })
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Producer | null>(null)
  const editFormRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useAdminProducers(appliedFilters, page, `${sort.field},${sort.dir}`)

  const setListQuery = (filters: ProducerFilters, nextPage: number, nextSort = sort) =>
    setSearchParams(
      () => {
        const n = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
          if (value) n.set(key, String(value))
        })
        n.set('page', String(nextPage))
        if (nextSort.field !== 'id') n.set('sortField', nextSort.field)
        if (nextSort.dir !== 'desc') n.set('sortDir', nextSort.dir)
        return n
      },
      { replace: true },
    )

  const handleSort = (field: string) => {
    const nextSort: SortState = sort.field === field
      ? { field, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' }
    setSort(nextSort)
    setListQuery(appliedFilters, 0, nextSort)
  }
  const create = useCreateProducer()
  const update = useUpdateProducer()
  const remove = useDeleteProducer()

  // 수정 영역이 열리면 해당 위치로 스크롤
  useEffect(() => {
    if (editTarget) {
      editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editTarget])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedFilters(filterInput)
    setListQuery(filterInput, 0)
  }

  const handleResetFilters = () => {
    setFilterInput(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setListQuery(EMPTY_FILTERS, 0)
  }

  const handleCreate = (form: FormValues) => {
    const payload: CreateProducerPayload = {
      type: form.type,
      nameKo: form.nameKo,
      nameEn: form.nameEn,
      country: form.country,
      region: form.region || undefined,
      website: form.website || undefined,
      foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
      descriptionKo: form.descriptionKo || undefined,
      descriptionEn: form.descriptionEn || undefined,
      searchKeywords: form.searchKeywords || undefined,
    }
    create.mutate(payload, { onSuccess: () => setShowCreate(false) })
  }

  const handleUpdate = (form: FormValues) => {
    if (!editTarget) return
    const payload: UpdateProducerPayload = {
      type: form.type,
      nameKo: form.nameKo,
      nameEn: form.nameEn,
      country: form.country,
      region: form.region || null,
      website: form.website || null,
      foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
      descriptionKo: form.descriptionKo || null,
      descriptionEn: form.descriptionEn || null,
      searchKeywords: form.searchKeywords || null,
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
        <h1 className="text-xl font-bold text-neutral-900">생산자 관리</h1>
        <Button size="sm" onClick={() => { setShowCreate(true); setEditTarget(null) }}>
          + 생산자 추가
        </Button>
      </div>

      <form onSubmit={handleSearch} className="p-4 bg-white rounded-xl shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">종류</label>
            <select
              value={filterInput.type ?? ''}
              onChange={(e) => setFilterInput((f) => ({ ...f, type: e.target.value as ProducerType | '' }))}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="">전체</option>
              {PRODUCER_TYPES.map((tp) => (
                <option key={tp} value={tp}>{PRODUCER_TYPE_LABEL[tp].ko}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">한국어명</label>
            <input
              value={filterInput.nameKo}
              onChange={(e) => setFilterInput((f) => ({ ...f, nameKo: e.target.value }))}
              placeholder="한국어명 검색"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">영어명</label>
            <input
              value={filterInput.nameEn}
              onChange={(e) => setFilterInput((f) => ({ ...f, nameEn: e.target.value }))}
              placeholder="영어명 검색"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">국가</label>
            <input
              value={filterInput.country}
              onChange={(e) => setFilterInput((f) => ({ ...f, country: e.target.value }))}
              placeholder="국가 검색 (예: 스코틀랜드)"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">설립연도</label>
            <input
              value={filterInput.foundedYear}
              onChange={(e) => setFilterInput((f) => ({ ...f, foundedYear: e.target.value }))}
              type="number"
              placeholder="예) 1824"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={handleResetFilters}>초기화</Button>
          <Button type="submit" size="sm" variant="secondary">검색</Button>
        </div>
      </form>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm p-5 border border-primary-100">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">새 생산자 등록</h2>
          <ProducerForm
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            isPending={create.isPending}
          />
        </div>
      )}

      {editTarget && (
        <div ref={editFormRef} className="bg-white rounded-xl shadow-sm p-5 border border-amber-100 scroll-mt-4">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">
            생산자 수정 — {editTarget.nameKo}
          </h2>
          <ProducerForm
            key={editTarget.id}
            initial={editTarget}
            onSave={handleUpdate}
            onCancel={() => setEditTarget(null)}
            isPending={update.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-800" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-16">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-28">종류</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium cursor-pointer select-none hover:text-neutral-700" onClick={() => handleSort('nameKo')}>
                    <span className="inline-flex items-center">한국어명<SortArrows active={sort.field === 'nameKo'} dir={sort.dir} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium cursor-pointer select-none hover:text-neutral-700" onClick={() => handleSort('nameEn')}>
                    <span className="inline-flex items-center">영어명<SortArrows active={sort.field === 'nameEn'} dir={sort.dir} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium cursor-pointer select-none hover:text-neutral-700" onClick={() => handleSort('country')}>
                    <span className="inline-flex items-center">국가<SortArrows active={sort.field === 'country'} dir={sort.dir} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">지역</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium cursor-pointer select-none hover:text-neutral-700" onClick={() => handleSort('foundedYear')}>
                    <span className="inline-flex items-center">설립연도<SortArrows active={sort.field === 'foundedYear'} dir={sort.dir} /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">웹사이트</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((d) => (
                    <tr key={d.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{d.id}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center text-xs font-medium text-amber-700
                          bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                          {PRODUCER_TYPE_LABEL[d.type].ko}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{d.nameKo}</td>
                      <td className="px-4 py-3 text-neutral-500">{d.nameEn}</td>
                      <td className="px-4 py-3 text-neutral-500">{d.country}</td>
                      <td className="px-4 py-3 text-neutral-400">{d.region ?? '-'}</td>
                      <td className="px-4 py-3 text-neutral-400">{d.foundedYear ?? '-'}</td>
                      <td className="px-4 py-3 text-neutral-400">
                        {d.website
                          ? <a href={d.website} target="_blank" rel="noopener noreferrer" className="text-primary-800 hover:underline truncate max-w-[140px] inline-block">{d.website}</a>
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => { setEditTarget(d); setShowCreate(false) }}
                            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
                              rounded-md border border-neutral-300 bg-white text-neutral-600
                              hover:bg-neutral-50 transition-colors whitespace-nowrap"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(d.id, d.nameKo)}
                            disabled={remove.isPending}
                            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
                              rounded-md border border-red-200 bg-white text-red-600
                              hover:bg-red-50 transition-colors whitespace-nowrap disabled:opacity-40"
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
              onPageChange={(p) => setListQuery(appliedFilters, p)}
            />
          )}
        </>
      )}
    </div>
  )
}
