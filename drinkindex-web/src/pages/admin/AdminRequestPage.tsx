import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'
import { useAdminRequests, useCreateSpirit } from '@/domain/admin/hooks/useAdminSpirits'
import type { RequestStatus, CreateSpiritPayload } from '@/domain/admin/types/admin.types'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import DistillerySelector from '@/domain/distillery/components/DistillerySelector'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'TEQUILA', 'RUM', 'GIN', 'VODKA', 'OTHER']

const CATEGORY_LABEL: Record<string, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', TEQUILA: '데낄라',
  RUM: '럼', GIN: '진', VODKA: '보드카', OTHER: '기타',
}

const STATUS_OPTIONS: Array<{ value: RequestStatus; label: string }> = [
  { value: 'PENDING',  label: '대기 중' },
  { value: 'APPROVED', label: '승인됨' },
  { value: 'REJECTED', label: '반려됨' },
]

// ── 직접 등록 모달 ────────────────────────────────────────────────

interface CreateSpiritModalProps {
  open: boolean
  onClose: () => void
}

function CreateSpiritModal({ open, onClose }: CreateSpiritModalProps) {
  const navigate = useNavigate()
  const createSpirit = useCreateSpirit()
  const [distilleryId, setDistilleryId] = useState<number | null>(null)
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countryNameKo, setCountryNameKo] = useState('')
  const [regionNameKo, setRegionNameKo] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateSpiritPayload>()

  const handleClose = () => {
    reset()
    setDistilleryId(null)
    setCountryCode(null)
    setCountryNameKo('')
    setRegionNameKo('')
    setErrorMsg('')
    onClose()
  }

  const onSubmit = (data: CreateSpiritPayload) => {
    setErrorMsg('')
    const payload: CreateSpiritPayload = {
      ...data,
      distilleryId,
      country: countryNameKo || null,
      region:  regionNameKo  || null,
      abv:         data.abv         != null && !isNaN(Number(data.abv))         ? Number(data.abv)         : null,
      bottledYear: data.bottledYear  != null && !isNaN(Number(data.bottledYear)) ? Number(data.bottledYear) : null,
      vintageYear: data.vintageYear  != null && !isNaN(Number(data.vintageYear)) ? Number(data.vintageYear) : null,
      volumeMl:    data.volumeMl     != null && !isNaN(Number(data.volumeMl))    ? Number(data.volumeMl)    : null,
    }
    createSpirit.mutate(payload, {
      onSuccess: (res) => {
        const created = res.data.data
        handleClose()
        if (created?.id) navigate(`/admin/spirits/${created.id}`)
      },
      onError: () => setErrorMsg('술 등록 중 오류가 발생했습니다.'),
    })
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                <DialogTitle className="text-lg font-bold text-neutral-900">술 직접 등록</DialogTitle>
                <button
                  onClick={handleClose}
                  className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md transition-colors"
                  aria-label="닫기"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-5">
                {/* 한글명 / 영문명 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-600">한국어 이름 *</label>
                    <input
                      {...register('nameKo', { required: true })}
                      placeholder="예) 발베니 12년 더블우드"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
                        focus:ring-2 focus:ring-primary-400 ${errors.nameKo ? 'border-red-400' : 'border-neutral-200'}`}
                    />
                    {errors.nameKo && <p className="text-xs text-red-500">한국어 이름을 입력해주세요.</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-600">영어 이름 *</label>
                    <input
                      {...register('nameEn', { required: true })}
                      placeholder="Balvenie 12Y DoubleWood"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
                        focus:ring-2 focus:ring-primary-400 ${errors.nameEn ? 'border-red-400' : 'border-neutral-200'}`}
                    />
                    {errors.nameEn && <p className="text-xs text-red-500">영어 이름을 입력해주세요.</p>}
                  </div>
                </div>

                {/* 카테고리 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-600">카테고리 *</label>
                  <select
                    {...register('category', { required: true })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none
                      focus:ring-2 focus:ring-primary-400 bg-white ${errors.category ? 'border-red-400' : 'border-neutral-200'}`}
                  >
                    <option value="">카테고리 선택</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_LABEL[cat]}</option>
                    ))}
                  </select>
                  {errors.category && <p className="text-xs text-red-500">카테고리를 선택해주세요.</p>}
                </div>

                {/* 증류소 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-600">증류소</label>
                  <DistillerySelector value={distilleryId} onChange={setDistilleryId} />
                </div>

                {/* 국가 / 지역 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-600">국가 / 지역</label>
                  <CountryRegionSelector
                    countryCode={countryCode}
                    regionNameKo={regionNameKo}
                    onCountryChange={(code, nameKo) => { setCountryCode(code); setCountryNameKo(nameKo) }}
                    onRegionChange={(nameKo) => setRegionNameKo(nameKo)}
                  />
                </div>

                {/* 선택 필드들 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-600">병입업체명</label>
                    <input
                      {...register('bottler')}
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                  {([
                    { name: 'abv',         label: '도수 (%)',   step: '0.1', min: '0',    max: '100'  },
                    { name: 'bottledYear', label: '병입년도',    step: '1',   min: '1800', max: '2100' },
                    { name: 'vintageYear', label: '빈티지',      step: '1',   min: '1800', max: '2100' },
                    { name: 'volumeMl',    label: '용량 (ml)',   step: '1',   min: '1',    max: undefined },
                  ] as const).map(({ name, label, step, min, max }) => (
                    <div key={name} className="space-y-1.5">
                      <label className="block text-xs font-medium text-neutral-600">{label}</label>
                      <input
                        type="number"
                        step={step}
                        min={min}
                        max={max}
                        {...register(name, { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg
                          focus:outline-none focus:ring-2 focus:ring-primary-400"
                      />
                    </div>
                  ))}
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" type="button" onClick={handleClose}>
                    취소
                  </Button>
                  <Button size="sm" type="submit" isLoading={createSpirit.isPending}>
                    등록
                  </Button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────

export default function AdminRequestPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<RequestStatus>('PENDING')
  const [page, setPage]     = useState(0)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useAdminRequests(status, page)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">등록 요청</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + 술 직접 등록
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex items-end gap-3 p-4 bg-white rounded-xl shadow-sm">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">상태</label>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setStatus(value); setPage(0) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  status === value
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">한글명</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">영문명</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">카테고리</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">신청일</th>
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
                  data.content.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/spirits/requests/${req.id}`)}
                    >
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{req.id}</td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{req.nameKo}</td>
                      <td className="px-4 py-3 text-neutral-500">{req.nameEn}</td>
                      <td className="px-4 py-3">
                        <Badge variant={req.category} size="sm">
                          {CATEGORY_LABEL[req.category] ?? req.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={req.status} size="sm">
                          {STATUS_OPTIONS.find((s) => s.value === req.status)?.label ?? req.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs tabular-nums">
                        {formatDate(req.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-primary-600 font-medium">상세 보기 →</span>
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

      <CreateSpiritModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
