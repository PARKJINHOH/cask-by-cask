import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminTasteTreeApi } from '@/domain/taste-tree/api/tasteTreeApi'
import type { TasteTreeType } from '@/domain/taste-tree/types/tasteTree.types'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

const FACT_MAX_COUNT = 70
const FACT_MAX_LENGTH = 160
type AdminTasteTreeTab = TasteTreeType | 'FACTS'

function TasteTreeFactManager() {
  const queryClient = useQueryClient()
  const { toasts, showToast, removeToast } = useToast()
  const [facts, setFacts] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [initialized, setInitialized] = useState(false)
  const query = useQuery({
    queryKey: ['admin-taste-tree-facts'],
    queryFn: () => adminTasteTreeApi.getFacts().then((response) => response.data.data ?? []),
    refetchOnWindowFocus: false,
  })
  const saveMutation = useMutation({
    mutationFn: () => adminTasteTreeApi.updateFacts(facts),
    onSuccess: async (response) => {
      setFacts(response.data.data ?? [])
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-taste-tree-facts'] }),
        queryClient.invalidateQueries({ queryKey: ['taste-tree-facts'] }),
      ])
      showToast('공통 주류 상식을 저장했습니다.', 'success')
    },
    onError: () => showToast('공통 주류 상식을 저장하지 못했습니다.', 'error'),
  })

  useEffect(() => {
    if (!initialized && query.data) {
      setFacts(query.data)
      setInitialized(true)
    }
  }, [initialized, query.data])

  const normalizedDraft = draft.trim()
  const canAdd = Boolean(normalizedDraft)
    && normalizedDraft.length <= FACT_MAX_LENGTH
    && facts.length < FACT_MAX_COUNT
    && !facts.includes(normalizedDraft)

  const addFact = () => {
    if (!canAdd) return
    setFacts((previous) => [...previous, normalizedDraft])
    setDraft('')
  }

  return <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:p-6">
    <Toast toasts={toasts} onRemove={removeToast} />
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">COMMON SPIRIT FACTS</p>
        <h2 className="mt-1 text-lg font-black text-stone-950">공통 주류 한 줄 상식 관리</h2>
        <p className="mt-1 text-xs leading-5 text-stone-500">모든 공식·회원 트리 상세보기에 이 목록 중 한 문장이 무작위로 표시됩니다.</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-black text-stone-600">{facts.length}/{FACT_MAX_COUNT}</span>
        <button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || query.isLoading} className="rounded-lg bg-stone-950 px-4 py-2 text-xs font-black text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40">
          {saveMutation.isPending ? '저장 중...' : '변경사항 저장'}
        </button>
      </div>
    </div>

    <div className="mt-5 flex gap-2">
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addFact() } }}
        maxLength={FACT_MAX_LENGTH}
        placeholder="한국어 주류 상식을 한 문장으로 입력해 주세요."
        className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
      />
      <button type="button" onClick={addFact} disabled={!canAdd} aria-label="주류 상식 추가" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-xl font-black text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-30">+</button>
    </div>

    {query.isLoading ? <p className="py-16 text-center text-sm font-bold text-stone-400">불러오는 중...</p>
      : facts.length > 0 ? <div className="mt-5 grid gap-2 xl:grid-cols-2">
        {facts.map((fact, index) => <div key={`${fact}-${index}`} className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-3">
          <span className="mt-0.5 w-6 shrink-0 text-right text-[10px] font-black text-stone-400">{index + 1}</span>
          <p className="min-w-0 flex-1 break-keep text-sm font-semibold leading-5 text-stone-700">{fact}</p>
          <button type="button" onClick={() => setFacts((previous) => previous.filter((_, factIndex) => factIndex !== index))} aria-label={`주류 상식 ${index + 1} 삭제`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-red-200 bg-white text-base font-black text-red-600 hover:bg-red-50">−</button>
        </div>)}
      </div> : <p className="mt-5 rounded-lg border border-dashed border-stone-300 px-4 py-12 text-center text-xs font-bold text-stone-400">등록된 공통 주류 상식이 없습니다.</p>}
  </section>
}

export default function AdminTasteTreePage() {
  const [tab, setTab] = useState<AdminTasteTreeTab>('OFFICIAL')
  const queryClient = useQueryClient()
  const { toasts, showToast, removeToast } = useToast()
  const query = useQuery({
    queryKey: ['admin-taste-trees'],
    queryFn: () => adminTasteTreeApi.list().then((response) => response.data.data ?? []),
    enabled: tab !== 'FACTS',
  })
  const action = useMutation({
    mutationFn: async ({ kind, id }: { kind: 'hide' | 'restore' | 'delete'; id: number }) => {
      if (kind === 'hide') return adminTasteTreeApi.hide(id)
      if (kind === 'restore') return adminTasteTreeApi.restore(id)
      return adminTasteTreeApi.delete(id)
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-taste-trees'] }); showToast('처리되었습니다.', 'success') },
    onError: () => showToast('처리하지 못했습니다.', 'error'),
  })
  const trees = tab === 'FACTS' ? [] : (query.data ?? []).filter((tree) => tree.type === tab)

  return <div className="p-4 lg:p-6">
    <Toast toasts={toasts} onRemove={removeToast} />
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">SPIRIT TREE</p><h1 className="mt-2 text-2xl font-black text-stone-950">주류 트리 관리</h1><p className="mt-2 text-sm text-stone-500">공식 트리와 회원 공개 트리, 모든 트리에 공통으로 노출되는 상식을 관리합니다.</p></div>
      {tab === 'OFFICIAL' && <Link to="/admin/taste-trees/new" className="rounded-xl bg-stone-950 px-5 py-2.5 text-sm font-black text-white hover:bg-stone-800">공식 트리 만들기</Link>}
    </header>
    <div className="mt-6 inline-flex flex-wrap rounded-xl border border-stone-200 bg-white p-1">
      {([
        ['OFFICIAL', '공식 트리'],
        ['USER', '회원 트리'],
        ['FACTS', '한 줄 상식'],
      ] as const).map(([type, label]) => <button key={type} type="button" onClick={() => setTab(type)} className={`rounded-lg px-4 py-2 text-sm font-black ${tab === type ? 'bg-amber-500 text-stone-950' : 'text-stone-500'}`}>{label}</button>)}
    </div>

    {tab === 'FACTS' ? <TasteTreeFactManager /> : <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[90px_minmax(0,1fr)_100px_100px_220px] gap-3 border-b border-stone-200 bg-stone-50 px-5 py-3 text-xs font-black text-stone-500 md:grid"><span>구분</span><span>제목</span><span>좋아요</span><span>조회수</span><span>관리</span></div>
      {trees.map((tree) => <article key={tree.id} className="grid gap-3 border-b border-stone-100 px-5 py-4 last:border-0 md:grid-cols-[90px_minmax(0,1fr)_100px_100px_220px] md:items-center">
        <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${tree.moderationStatus === 'VISIBLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{tree.moderationStatus === 'VISIBLE' ? '공개' : '숨김'}</span>
        <div className="min-w-0"><h2 className="truncate text-sm font-black text-stone-900">{tree.title}</h2>{tree.ownerNickname && <p className="mt-1 text-xs text-stone-400">{tree.ownerNickname}</p>}<p className="mt-1 text-[10px] text-stone-400">{tree.publishedVersion ? `v${tree.publishedVersion}` : '초안'}</p></div>
        <span className="text-sm font-bold text-rose-600">좋아요 {tree.likeCount}</span><span className="text-sm font-bold text-stone-500">{tree.viewCount}</span>
        <div className="flex flex-wrap gap-2">
          {tree.type === 'OFFICIAL' && <Link to={`/admin/taste-trees/${tree.id}/edit`} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700">편집</Link>}
          {tree.moderationStatus === 'VISIBLE' ? <button type="button" onClick={() => action.mutate({ kind: 'hide', id: tree.id })} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800">숨김</button> : <button type="button" onClick={() => action.mutate({ kind: 'restore', id: tree.id })} className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-700">복구</button>}
          <button type="button" onClick={() => window.confirm('트리와 전용 이미지를 영구 삭제할까요?') && action.mutate({ kind: 'delete', id: tree.id })} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600">삭제</button>
        </div>
      </article>)}
      {!query.isLoading && !trees.length && <p className="py-16 text-center text-sm font-bold text-stone-400">등록된 트리가 없습니다.</p>}
    </div>}
  </div>
}
