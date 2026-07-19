import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminTasteTreeApi } from '@/domain/taste-tree/api/tasteTreeApi'
import type { TasteTreeType } from '@/domain/taste-tree/types/tasteTree.types'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'

export default function AdminTasteTreePage() {
  const [tab, setTab] = useState<TasteTreeType>('OFFICIAL')
  const queryClient = useQueryClient()
  const { toasts, showToast, removeToast } = useToast()
  const query = useQuery({ queryKey: ['admin-taste-trees'], queryFn: () => adminTasteTreeApi.list().then((response) => response.data.data ?? []) })
  const action = useMutation({
    mutationFn: async ({ kind, id }: { kind: 'hide' | 'restore' | 'delete'; id: number }) => {
      if (kind === 'hide') return adminTasteTreeApi.hide(id)
      if (kind === 'restore') return adminTasteTreeApi.restore(id)
      return adminTasteTreeApi.delete(id)
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-taste-trees'] }); showToast('처리되었습니다.', 'success') },
    onError: () => showToast('처리하지 못했습니다.', 'error'),
  })
  const trees = (query.data ?? []).filter((tree) => tree.type === tab)

  return <div className="p-4 lg:p-6">
    <Toast toasts={toasts} onRemove={removeToast} />
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">SPIRIT TREE</p><h1 className="mt-2 text-2xl font-black text-stone-950">주류 트리 관리</h1><p className="mt-2 text-sm text-stone-500">공식 트리를 만들고 회원 공개 트리를 관리합니다.</p></div>
      <Link to="/admin/taste-trees/new" className="rounded-xl bg-stone-950 px-5 py-2.5 text-sm font-black text-white hover:bg-stone-800">공식 트리 만들기</Link>
    </header>
    <div className="mt-6 inline-flex rounded-xl border border-stone-200 bg-white p-1">
      {(['OFFICIAL', 'USER'] as const).map((type) => <button key={type} type="button" onClick={() => setTab(type)} className={`rounded-lg px-4 py-2 text-sm font-black ${tab === type ? 'bg-amber-500 text-stone-950' : 'text-stone-500'}`}>{type === 'OFFICIAL' ? '공식 트리' : '회원 트리'}</button>)}
    </div>
    <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
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
    </div>
  </div>
}
