import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import {
  useAdminCognacAppellations,
  useCreateCognacAppellation,
  useUpdateCognacAppellation,
  useDeleteCognacAppellation,
} from '@/domain/admin/hooks/useAdminCognacAppellation'
import type { CognacAppellation, CreateCognacAppellationPayload, UpdateCognacAppellationPayload } from '@/domain/cognacappellation/types/cognacappellation.types'

interface FormValues {
  nameKo: string
  nameEn: string
  descriptionKo?: string
  descriptionEn?: string
}

interface AppellationFormProps {
  initial?: CognacAppellation
  onSave: (data: FormValues) => void
  onCancel: () => void
  isPending: boolean
}

function AppellationForm({ initial, onSave, onCancel, isPending }: AppellationFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: initial ? {
      nameKo: initial.nameKo,
      nameEn: initial.nameEn,
      descriptionKo: initial.descriptionKo ?? '',
      descriptionEn: initial.descriptionEn ?? '',
    } : undefined,
  })

  const onSubmit = (data: FormValues) => {
    onSave({
      ...data,
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
            {...register('nameKo', { required: true, maxLength: 100 })}
            placeholder="예) 그랑드 샹파뉴"
            maxLength={100}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400 ${errors.nameKo ? 'border-red-400' : 'border-neutral-200'}`}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-600">영어명 *</label>
          <input
            {...register('nameEn', { required: true, maxLength: 100 })}
            placeholder="예) Grande Champagne"
            maxLength={100}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
              focus:ring-2 focus:ring-primary-400 ${errors.nameEn ? 'border-red-400' : 'border-neutral-200'}`}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-600">소개 (한국어)</label>
          <textarea
            {...register('descriptionKo')}
            rows={3}
            placeholder="산지 특징을 입력하세요."
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
            placeholder="Enter appellation description."
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

export default function AdminCognacAppellationPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<CognacAppellation | null>(null)

  const { data, isLoading } = useAdminCognacAppellations(keyword, page)
  const create = useCreateCognacAppellation()
  const update = useUpdateCognacAppellation()
  const remove = useDeleteCognacAppellation()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setKeyword(searchRef.current?.value.trim() ?? '')
    setPage(0)
  }

  const handleCreate = (form: FormValues) => {
    const payload: CreateCognacAppellationPayload = {
      nameKo: form.nameKo,
      nameEn: form.nameEn,
      descriptionKo: form.descriptionKo || undefined,
      descriptionEn: form.descriptionEn || undefined,
    }
    create.mutate(payload, { onSuccess: () => setShowCreate(false) })
  }

  const handleUpdate = (form: FormValues) => {
    if (!editTarget) return
    const payload: UpdateCognacAppellationPayload = {
      nameKo: form.nameKo,
      nameEn: form.nameEn,
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
        <h1 className="text-xl font-bold text-neutral-900">꼬냑 세부 산지 관리</h1>
        <Button size="sm" onClick={() => { setShowCreate(true); setEditTarget(null) }}>
          + 산지 추가
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 p-4 bg-white rounded-xl shadow-sm">
        <input
          ref={searchRef}
          placeholder="산지명 검색... (한글/영어)"
          className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <Button type="submit" size="sm" variant="secondary">검색</Button>
      </form>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm p-5 border border-primary-100">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">새 세부 산지 등록</h2>
          <AppellationForm
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
            isPending={create.isPending}
          />
        </div>
      )}

      {editTarget && (
        <div className="bg-white rounded-xl shadow-sm p-5 border border-amber-100">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">
            세부 산지 수정 — {editTarget.nameKo}
          </h2>
          <AppellationForm
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
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">소개 (한국어)</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((a) => (
                    <tr key={a.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{a.id}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{a.nameKo}</td>
                      <td className="px-4 py-3 text-neutral-500">{a.nameEn}</td>
                      <td className="px-4 py-3 text-neutral-400 max-w-xs truncate">
                        {a.descriptionKo ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setEditTarget(a); setShowCreate(false) }}
                            className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(a.id, a.nameKo)}
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
