import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import Modal from '@/shared/components/Modal'
import { useAdminSpirits, useUpdateSpirit, useDeleteSpirit } from '@/domain/admin/hooks/useAdminSpirits'
import type { AdminSpiritItem, UpdateSpiritPayload } from '@/domain/admin/types/admin.types'
import type { SpiritCategory, SpiritStatus } from '@/domain/spirit/types/spirit.types'

// ── 상수 ────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<SpiritCategory, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', TEQUILA: '데낄라',
  RUM: '럼', GIN: '진', VODKA: '보드카', OTHER: '기타',
}

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'TEQUILA', 'RUM', 'GIN', 'VODKA', 'OTHER']

const STATUS_OPTIONS: Array<{ value: SpiritStatus; label: string }> = [
  { value: 'ACTIVE',  label: '공개' },
  { value: 'HIDDEN',  label: '숨김' },
  { value: 'PENDING', label: '대기' },
]

// ── 수정 모달 ──────────────────────────────────────────────────

const editSchema = z.object({
  nameKo:       z.string().min(1, '한글 이름은 필수입니다.'),
  nameEn:       z.string().min(1, '영문 이름은 필수입니다.'),
  category:     z.enum(['WHISKY', 'COGNAC', 'WINE', 'TEQUILA', 'RUM', 'GIN', 'VODKA', 'OTHER']),
  country:      z.string().optional(),
  region:       z.string().optional(),
  abv:          z.number().min(0).max(100).optional().or(z.literal('')),
  volumeMl:     z.number().int().positive().optional().or(z.literal('')),
  bottler:      z.string().optional(),
  bottledYear:  z.number().int().min(1700).max(2100).optional().or(z.literal('')),
  vintageYear:  z.number().int().min(1700).max(2100).optional().or(z.literal('')),
  distilleryId: z.number().int().positive().optional().or(z.literal('')),
})

type EditForm = z.infer<typeof editSchema>

interface EditModalProps {
  spirit: AdminSpiritItem
  onClose: () => void
}

function SpiritEditModal({ spirit, onClose }: EditModalProps) {
  const updateSpirit = useUpdateSpirit()
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nameKo:       spirit.nameKo,
      nameEn:       spirit.nameEn,
      category:     spirit.category,
      country:      spirit.country ?? '',
      abv:          spirit.abv ?? '',
    },
  })

  const onSubmit = async (values: EditForm) => {
    setServerError('')
    const payload: UpdateSpiritPayload = {
      nameKo:       values.nameKo,
      nameEn:       values.nameEn,
      category:     values.category,
      country:      values.country || null,
      region:       values.region || null,
      abv:          values.abv === '' ? null : values.abv as number,
      volumeMl:     values.volumeMl === '' ? null : values.volumeMl as number,
      bottler:      values.bottler || null,
      bottledYear:  values.bottledYear === '' ? null : values.bottledYear as number,
      vintageYear:  values.vintageYear === '' ? null : values.vintageYear as number,
      distilleryId: values.distilleryId === '' ? null : values.distilleryId as number,
    }
    try {
      await updateSpirit.mutateAsync({ id: spirit.id, data: payload })
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setServerError(msg ?? '수정 중 오류가 발생했습니다.')
    }
  }

  return (
    <Modal open onClose={onClose} title={`술 수정 — ${spirit.nameKo}`} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="한글 이름" error={errors.nameKo?.message} {...register('nameKo')} />
          <Input label="영문 이름" error={errors.nameEn?.message} {...register('nameEn')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">카테고리</label>
          <select
            {...register('category')}
            className="w-full h-9 px-3 text-sm border border-neutral-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="국가" placeholder="예: Scotland" {...register('country')} />
          <Input label="지역" placeholder="예: Speyside" {...register('region')} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="도수 (%)"
            type="number"
            placeholder="0~100"
            {...register('abv', { valueAsNumber: true })}
          />
          <Input
            label="용량 (ml)"
            type="number"
            placeholder="700"
            {...register('volumeMl', { valueAsNumber: true })}
          />
          <Input
            label="증류소 ID"
            type="number"
            {...register('distilleryId', { valueAsNumber: true })}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input label="보틀러" placeholder="Independent" {...register('bottler')} />
          <Input
            label="병입년도"
            type="number"
            placeholder="2023"
            {...register('bottledYear', { valueAsNumber: true })}
          />
          <Input
            label="빈티지년도"
            type="number"
            placeholder="2010"
            {...register('vintageYear', { valueAsNumber: true })}
          />
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <div className="flex gap-2 justify-end pt-2 border-t border-neutral-100">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>취소</Button>
          <Button size="sm" type="submit" isLoading={isSubmitting || updateSpirit.isPending}>
            저장
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminSpiritPage() {
  const [keyword, setKeyword]         = useState('')
  const [category, setCategory]       = useState<SpiritCategory | ''>('')
  const [status, setStatus]           = useState<SpiritStatus>('ACTIVE')
  const [page, setPage]               = useState(0)
  const [editSpirit, setEditSpirit]   = useState<AdminSpiritItem | null>(null)

  const { data, isLoading } = useAdminSpirits({
    keyword: keyword.trim() || undefined,
    category: category || undefined,
    status,
    page,
  })
  const deleteSpirit = useDeleteSpirit()

  const handleDelete = async (spirit: AdminSpiritItem) => {
    if (!confirm(`"${spirit.nameKo}"을(를) 숨김 처리하시겠습니까?`)) return
    await deleteSpirit.mutateAsync(spirit.id)
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">술 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl shadow-sm">
        <div className="flex-1 min-w-[180px]">
          <Input
            label="이름 검색"
            placeholder="한글/영문 이름"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setPage(0) }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">카테고리</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value as SpiritCategory | ''); setPage(0) }}
            className="h-9 px-3 text-sm border border-neutral-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">전체</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">상태</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as SpiritStatus); setPage(0) }}
            className="h-9 px-3 text-sm border border-neutral-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            {STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 테이블 */}
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
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">이름</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">카테고리</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">평점</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">리뷰</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((spirit) => (
                    <tr key={spirit.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{spirit.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{spirit.nameKo}</p>
                        <p className="text-xs text-neutral-400">{spirit.nameEn}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={spirit.category} size="sm">
                          {CATEGORY_LABEL[spirit.category]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={spirit.status} size="sm">
                          {STATUS_OPTIONS.find((s) => s.value === spirit.status)?.label ?? spirit.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-primary-600 tabular-nums">
                        {spirit.avgScore != null ? spirit.avgScore.toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-600 tabular-nums">
                        {spirit.reviewCount}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setEditSpirit(spirit)}
                            className="text-xs text-primary-600 hover:text-primary-800 font-medium
                              transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(spirit)}
                            disabled={deleteSpirit.isPending}
                            className="text-xs text-red-500 hover:text-red-700 font-medium
                              transition-colors disabled:opacity-40"
                          >
                            숨김
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

      {editSpirit && (
        <SpiritEditModal spirit={editSpirit} onClose={() => setEditSpirit(null)} />
      )}
    </div>
  )
}
