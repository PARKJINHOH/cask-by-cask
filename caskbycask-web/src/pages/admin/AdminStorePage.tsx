import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { priceTrackerApi } from '@/domain/pricetracker/api/priceTrackerApi'
import {
  useAdminStores,
  useApproveStore,
  useDeleteStore,
  useCreateStore,
  useMergeStore,
  useStoreAliases,
  useAddAlias,
  useDeleteAlias,
} from '@/domain/pricetracker/hooks/useAdminPriceTracker'
import type { AdminStore, DutyFreeChannel, StoreSearchResult, StoreType } from '@/domain/pricetracker/types/pricetracker.types'

const TYPE_LABEL: Record<StoreType, string> = { DOMESTIC: '국내', DUTYFREE: '면세' }
const CHANNEL_LABEL: Record<DutyFreeChannel, string> = { AIRPORT: '공항', CITY: '시내', INFLIGHT: '기내', ONLINE: '온라인' }
const APPROVAL_FILTERS: { value: boolean | undefined; label: string }[] = [
  { value: false, label: '제안(미승인)' },
  { value: true, label: '승인됨' },
  { value: undefined, label: '전체' },
]

export default function AdminStorePage() {
  const [keyword, setKeyword] = useState('')
  const [input, setInput] = useState('')
  const [isApproved, setIsApproved] = useState<boolean | undefined>(false)
  const [page, setPage] = useState(0)
  const [aliasStore, setAliasStore] = useState<AdminStore | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useAdminStores({ keyword: keyword || undefined, isApproved, page })
  const approve = useApproveStore()
  const del = useDeleteStore()

  const handleDelete = (id: number) => {
    if (!confirm('이 매장을 삭제하시겠습니까?')) return
    del.mutate(id)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">매장 관리</h1>
        <button onClick={() => setShowCreate((v) => !v)} className="px-3 py-2 text-sm font-medium rounded-lg bg-primary-800 text-white hover:bg-primary-900">
          + 새 매장
        </button>
      </div>

      {showCreate && <CreateStoreForm onDone={() => setShowCreate(false)} />}

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl shadow-sm">
        <div className="flex gap-1.5">
          {APPROVAL_FILTERS.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => { setIsApproved(f.value); setPage(0) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isApproved === f.value ? 'bg-primary-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setKeyword(input.trim()), setPage(0))}
            placeholder="매장명 검색"
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button onClick={() => { setKeyword(input.trim()); setPage(0) }} className="px-3 py-2 text-sm rounded-lg border border-neutral-200 hover:bg-neutral-50">검색</button>
        </div>
      </div>

      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-800" /></div>
          ) : !data || data.empty ? (
            <div className="text-center py-16 text-neutral-400 text-sm bg-white rounded-xl">매장이 없습니다.</div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-neutral-500 font-medium w-12">ID</th>
                      <th className="text-left px-4 py-3 text-neutral-500 font-medium">매장</th>
                      <th className="text-left px-4 py-3 text-neutral-500 font-medium">유형</th>
                      <th className="text-left px-4 py-3 text-neutral-500 font-medium">등록자</th>
                      <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                      <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data.content.map((s) => (
                      <StoreRow
                        key={s.id}
                        store={s}
                        onApprove={() => approve.mutate(s.id)}
                        onDelete={() => handleDelete(s.id)}
                        onAlias={() => setAliasStore(s)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {data.totalPages > 1 && <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />}
            </>
          )}
        </div>

        {/* 별칭 패널 */}
        {aliasStore && <AliasPanel store={aliasStore} onClose={() => setAliasStore(null)} />}
      </div>
    </div>
  )
}

function StoreRow({ store: s, onApprove, onDelete, onAlias }: {
  store: AdminStore; onApprove: () => void; onDelete: () => void; onAlias: () => void
}) {
  const [merging, setMerging] = useState(false)
  return (
    <>
      <tr className="hover:bg-neutral-50 transition-colors align-top">
        <td className="px-4 py-3 text-neutral-400 tabular-nums">{s.id}</td>
        <td className="px-4 py-3">
          <p className="font-medium text-neutral-900">{s.displayName}</p>
          {s.region && <p className="text-xs text-neutral-400">{s.region}</p>}
        </td>
        <td className="px-4 py-3 text-neutral-600">
          {TYPE_LABEL[s.storeType]}
          {s.dutyfreeChannel && <span className="text-neutral-400"> · {CHANNEL_LABEL[s.dutyfreeChannel]}</span>}
        </td>
        <td className="px-4 py-3 text-neutral-500 text-xs">{s.createdByNickname ?? '-'}</td>
        <td className="px-4 py-3">
          {s.isApproved ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">승인</span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">제안</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end flex-wrap">
            {!s.isApproved && (
              <>
                <button onClick={onApprove} className="h-7 px-2.5 text-xs font-medium rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50">승인</button>
                <button onClick={() => setMerging((v) => !v)} className="h-7 px-2.5 text-xs font-medium rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50">병합</button>
              </>
            )}
            <button onClick={onAlias} className="h-7 px-2.5 text-xs font-medium rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50">별칭</button>
            <button onClick={onDelete} className="h-7 px-2.5 text-xs font-medium rounded-md border border-red-200 text-red-600 hover:bg-red-50">삭제</button>
          </div>
        </td>
      </tr>
      {merging && (
        <tr>
          <td colSpan={6} className="px-4 pb-3 bg-neutral-50/50">
            <MergeRow suggestedId={s.id} onDone={() => setMerging(false)} />
          </td>
        </tr>
      )}
    </>
  )
}

function MergeRow({ suggestedId, onDone }: { suggestedId: number; onDone: () => void }) {
  const merge = useMergeStore()
  const [keyword, setKeyword] = useState('')
  const [target, setTarget] = useState<StoreSearchResult | null>(null)
  const [open, setOpen] = useState(false)

  const { data: results } = useQuery({
    queryKey: ['admin-merge-target', keyword],
    queryFn: () => priceTrackerApi.searchStores(keyword),
    select: (res) => res.data.data ?? [],
    enabled: keyword.length >= 1 && open,
    staleTime: 30_000,
  })

  const handleMerge = () => {
    if (!target) return
    if (!confirm(`이 제안 매장을 "${target.displayName}"(으)로 병합하시겠습니까?`)) return
    merge.mutate({ suggestedId, targetStoreId: target.id }, { onSuccess: onDone })
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-neutral-200 bg-white">
      <span className="text-xs text-neutral-500 whitespace-nowrap">→ 기존 매장으로 병합:</span>
      <div className="relative flex-1">
        <input
          value={target ? target.displayName : keyword}
          onChange={(e) => { setKeyword(e.target.value); setTarget(null); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="대상 매장 검색"
          className="w-full border border-neutral-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {open && results && results.length > 0 && !target && (
          <ul className="absolute z-10 w-full bg-white border border-neutral-200 rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
            {results.map((s) => (
              <li key={s.id}>
                <button onClick={() => { setTarget(s); setOpen(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50">{s.displayName}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button onClick={handleMerge} disabled={!target || merge.isPending} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-800 text-white disabled:opacity-50">병합</button>
      <button onClick={onDone} className="px-2 py-1.5 text-xs text-neutral-500">취소</button>
    </div>
  )
}

function AliasPanel({ store, onClose }: { store: AdminStore; onClose: () => void }) {
  const { data: aliases, isLoading } = useStoreAliases(store.id)
  const addAlias = useAddAlias()
  const delAlias = useDeleteAlias(store.id)
  const [value, setValue] = useState('')

  const add = () => {
    const v = value.trim()
    if (!v) return
    addAlias.mutate({ id: store.id, alias: v }, { onSuccess: () => setValue('') })
  }

  return (
    <div className="w-72 shrink-0 bg-white rounded-xl shadow-sm border border-neutral-200 p-4 h-fit">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-neutral-900 text-sm truncate">{store.displayName} · 별칭</p>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-lg leading-none">×</button>
      </div>
      <div className="flex gap-2 mb-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="별칭 추가"
          className="flex-1 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button onClick={add} disabled={addAlias.isPending} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-800 text-white disabled:opacity-50">추가</button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : !aliases || aliases.length === 0 ? (
        <p className="text-xs text-neutral-400 text-center py-4">등록된 별칭이 없습니다.</p>
      ) : (
        <ul className="space-y-1.5">
          {aliases.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-sm bg-neutral-50 rounded-lg px-2.5 py-1.5">
              <span className="text-neutral-700">{a.alias}</span>
              <button onClick={() => delAlias.mutate(a.id)} className="text-neutral-300 hover:text-red-500 text-base leading-none">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CreateStoreForm({ onDone }: { onDone: () => void }) {
  const create = useCreateStore()
  const [displayName, setDisplayName] = useState('')
  const [storeType, setStoreType] = useState<StoreType>('DOMESTIC')
  const [dutyfreeChannel, setDutyfreeChannel] = useState<DutyFreeChannel>('AIRPORT')
  const [region, setRegion] = useState('')

  const submit = () => {
    if (!displayName.trim()) return
    create.mutate(
      {
        displayName: displayName.trim(),
        storeType,
        dutyfreeChannel: storeType === 'DUTYFREE' ? dutyfreeChannel : null,
        region: region.trim() || null,
      },
      { onSuccess: onDone },
    )
  }

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm flex flex-wrap items-end gap-3">
      <Field label="매장명">
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
      </Field>
      <Field label="유형">
        <div className="flex gap-1">
          {(['DOMESTIC', 'DUTYFREE'] as const).map((tp) => (
            <button key={tp} onClick={() => setStoreType(tp)} className={`px-3 py-2 rounded-lg text-sm border ${storeType === tp ? 'bg-primary-800 text-white border-primary-800' : 'border-neutral-200 text-neutral-600'}`}>
              {TYPE_LABEL[tp]}
            </button>
          ))}
        </div>
      </Field>
      {storeType === 'DUTYFREE' && (
        <Field label="채널">
          <select value={dutyfreeChannel} onChange={(e) => setDutyfreeChannel(e.target.value as DutyFreeChannel)} className="border border-neutral-300 rounded-lg px-3 py-2 text-sm">
            {(Object.keys(CHANNEL_LABEL) as DutyFreeChannel[]).map((c) => (
              <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="지역(선택)">
        <input value={region} onChange={(e) => setRegion(e.target.value)} className="border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
      </Field>
      <button onClick={submit} disabled={create.isPending || !displayName.trim()} className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-800 text-white disabled:opacity-50">등록</button>
      <button onClick={onDone} className="px-3 py-2 text-sm text-neutral-500">취소</button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      {children}
    </div>
  )
}
