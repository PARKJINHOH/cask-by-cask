import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminAiNewsApi } from '@/domain/admin/api/adminAiNewsApi'
import type {
  AiNewsArticleStatus, AiNewsArticleType, AiNewsCategory, AiNewsSettings,
  AiNewsSourceConfig, AiNewsSourceConfigRequest, AiNewsSourceType,
  AiNewsTopicRequest, AiNewsTopicStatus,
} from '@/domain/admin/types/aiNews.types'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { formatDateTime } from '@/shared/utils/format'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import NumberInput from '@/shared/components/NumberInput'

type Tab = 'articles' | 'topics' | 'sources' | 'settings'

const statusLabels: Record<AiNewsArticleStatus, string> = {
  DRAFT: '임시저장', PENDING_REVIEW: '검토 대기', SCHEDULED: '예약 발행', PUBLISHED: '발행됨', REJECTED: '반려',
  SKIPPED_DUPLICATE: '중복 제외', FAILED: '실패', DELETED: '삭제됨',
}
const articleTypeLabels: Record<AiNewsArticleType, string> = {
  RELEASE_NEWS: '출시·이벤트 소식', TIP_INFO: '팁 및 정보',
}
const categoryLabels: Record<AiNewsCategory, string> = {
  WHISKY: '위스키', WINE: '와인', COGNAC: '꼬냑', OTHER: '기타',
}
const sourceTypeLabels: Record<AiNewsSourceType, string> = {
  OFFICIAL: '공식', TRUSTED_MEDIA: '전문매체', COMMUNITY: '커뮤니티', UNAPPROVED: '미승인',
}
/** 출처 목록의 수집 활성 여부 필터. */
type AiNewsSourceState = 'ENABLED' | 'DISABLED'
const sourceStateLabels: Record<AiNewsSourceState, string> = {
  ENABLED: '수집 활성', DISABLED: '수집 비활성',
}
/** 자동 등록 시절의 옛 출처를 골라내기 위한 등록 경로 필터. */
type AiNewsSourceOrigin = 'MANUAL' | 'AUTO'
const sourceOriginLabels: Record<AiNewsSourceOrigin, string> = {
  MANUAL: '관리자 등록', AUTO: '자동 등록(과거)',
}
const topicStatusLabels: Record<AiNewsTopicStatus, string> = {
  PLANNED: '쓸 예정', DONE: '썼음',
}

export default function AdminAiNewsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab | null) ?? 'articles'
  const setTab = (next: Tab) => setParams({ tab: next }, { replace: true })

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">소식(AI)</h1>
          <p className="mt-1 text-sm text-neutral-500">
            AI가 수집·작성한 출시 소식과 팁·정보 글, 근거 출처와 사용량을 관리합니다.
          </p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-2 shadow-sm">
        {([
          ['articles', '게시글 관리'], ['topics', '정보 주제'], ['sources', '출처 관리'], ['settings', '설정·사용량'],
        ] as Array<[Tab, string]>).map(([value, label]) => (
          <button key={value} onClick={() => setTab(value)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === value ? 'bg-primary-800 text-white' : 'text-neutral-600 hover:bg-neutral-100'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'articles' && <ArticlesTab />}
      {tab === 'topics' && <TopicsTab />}
      {tab === 'sources' && <SourcesTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}

function ArticlesTab() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [status, setStatus] = useState<AiNewsArticleStatus | ''>('PENDING_REVIEW')
  const [type, setType] = useState<AiNewsArticleType | ''>('')
  const [category, setCategory] = useState<AiNewsCategory | ''>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ai-news', 'articles', status, type, category, fromDate, toDate, page],
    queryFn: () => adminAiNewsApi.articles({
      status: status || undefined, type: type || undefined, category: category || undefined,
      fromDate: fromDate || undefined, toDate: toDate || undefined, page, size: 20,
    }),
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'ai-news'] })
  const action = useMutation({
    mutationFn: async ({ id, kind }: { id: number; kind: 'publish' | 'reject' | 'delete' | 'restore' }) => {
      if (kind === 'publish') return adminAiNewsApi.publish(id)
      if (kind === 'reject') return adminAiNewsApi.reject(id, window.prompt('반려 사유를 입력하세요.') ?? undefined)
      if (kind === 'restore') return adminAiNewsApi.restore(id)
      return adminAiNewsApi.deleteArticle(id, window.prompt('삭제 사유를 입력하세요.') ?? undefined)
    },
    onSuccess: refresh,
  })

  const runAction = (id: number, kind: 'publish' | 'reject' | 'delete' | 'restore') => {
    if ((kind === 'delete' || kind === 'publish') && !window.confirm(kind === 'delete'
      ? '삭제하시겠습니까?\n\n이미 Instagram 또는 Threads에 게시된 콘텐츠는 자동으로 삭제되지 않습니다. 해당 플랫폼에서 직접 삭제해 주세요.'
      : '지금 발행하시겠습니까?')) return
    action.mutate({ id, kind })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-4 shadow-sm">
        <select value={status} onChange={(e) => { setStatus(e.target.value as AiNewsArticleStatus | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 상태</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={type} onChange={(e) => { setType(e.target.value as AiNewsArticleType | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 유형</option>
          {Object.entries(articleTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value as AiNewsCategory | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 주종</option>
          {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-neutral-500">시작
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0) }} className={inputCls} />
        </label>
        <label className="flex items-center gap-1 text-xs text-neutral-500">종료
          <input type="date" min={fromDate || undefined} value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0) }} className={inputCls} />
        </label>
        <button onClick={() => navigate('/admin/community/ai-news/new')}
          className="sm:ml-auto rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-900">
          직접 작성
        </button>
      </div>

      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        <strong>소재</strong>는 AI가 등록 출처에서 찾아 온 제목·요약·근거 URL입니다. 본문은 없습니다 —
        수정에서 근거를 보고 직접 쓴 뒤 발행하세요. 직접 만든 글은 <strong>임시저장</strong> 상태에 있습니다.
      </p>

      {isLoading ? <Loading /> : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
              <tr><th className="px-4 py-3">수집일</th><th className="px-4 py-3">유형</th><th className="px-4 py-3">주종</th>
                <th className="px-4 py-3">제목 · 요약 · 출처</th><th className="px-4 py-3">상태</th><th className="px-4 py-3">작업</th></tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {!data || data.empty ? <tr><td colSpan={6} className="py-12 text-center text-neutral-400">게시글이 없습니다.</td></tr>
                : data.content.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3">{articleTypeLabels[item.articleType]}</td>
                    <td className="px-4 py-3">{categoryLabels[item.category]}</td>
                    <td className="max-w-[420px] px-4 py-3">
                      <button title={item.title} onClick={() => navigate(`/admin/community/ai-news/${item.id}/edit`)} className="block max-w-[420px] text-left font-semibold text-neutral-800 hover:text-primary-700">
                        {item.updateAvailable && <span className="mr-1 text-amber-600">●</span>}
                        {item.contentEmpty && <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">소재</span>}
                        {item.title}
                      </button>
                      {item.leadSummary && <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">{item.leadSummary}</p>}
                      {item.sourceDomains.length > 0 && (
                        <p className="mt-1 truncate text-[11px] text-neutral-400">{item.sourceDomains.join(' · ')}</p>
                      )}
                      {item.failureReason && <p className="mt-1 truncate text-xs text-red-500">{item.failureReason}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                      {item.status === 'SCHEDULED' && item.scheduledAt && <p className="mt-1 whitespace-nowrap text-[11px] text-blue-600">{formatDateTime(item.scheduledAt)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/admin/community/ai-news/${item.id}/edit`)} className={smallBtn}>수정</button>
                        {/* 본문이 빈 소재는 발행할 수 없다. 서버도 같은 규칙으로 거부한다. */}
                        {!['PUBLISHED', 'DELETED', 'SKIPPED_DUPLICATE', 'REJECTED'].includes(item.status) && !item.contentEmpty
                          && <button onClick={() => runAction(item.id, 'publish')} className={smallPrimaryBtn}>발행</button>}
                        {item.status === 'PENDING_REVIEW' && <button onClick={() => runAction(item.id, 'reject')} className={smallBtn}>반려</button>}
                        {item.status === 'DELETED'
                          ? <button onClick={() => runAction(item.id, 'restore')} className={smallBtn}>복원</button>
                          : <button onClick={() => runAction(item.id, 'delete')} className={smallDangerBtn}>삭제</button>}
                        {item.postId && <a href={`/community/notice/${item.postId}`} target="_blank" rel="noreferrer" className={smallBtn}>보기</a>}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.totalPages > 1 && <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}

function TopicsTab() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<AiNewsTopicStatus | ''>('')
  const [category, setCategory] = useState<AiNewsCategory | ''>('')
  const [keywordInput, setKeywordInput] = useState('')
  const keyword = useDebouncedValue(keywordInput)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const emptyForm: AiNewsTopicRequest = { title: '', category: 'WHISKY', memo: '', status: 'PLANNED' }
  const [form, setForm] = useState<AiNewsTopicRequest>(emptyForm)
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ai-news', 'topics', status, category, keyword, page],
    queryFn: () => adminAiNewsApi.topics({
      status: status || undefined, category: category || undefined,
      keyword: keyword || undefined, page, size: 20,
    }),
  })
  // 검색어 확정 시점(디바운스 후)에도 페이지를 처음으로 되돌려야 빈 목록이 나오지 않는다.
  useEffect(() => { setPage(0) }, [keyword])
  // 필터나 페이지가 바뀌면 화면에 없는 항목이 선택된 채로 남지 않도록 비운다.
  useEffect(() => { setSelected([]) }, [status, category, keyword, page])
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'topics'] })
  const save = useMutation({
    mutationFn: (payload: AiNewsTopicRequest) => adminAiNewsApi.createTopic(payload),
    onSuccess: () => { setForm(emptyForm); invalidate() },
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AiNewsTopicRequest }) => adminAiNewsApi.updateTopic(id, payload),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: number) => adminAiNewsApi.deleteTopic(id),
    onSuccess: invalidate,
    onError: () => window.alert('이미 글이 연결된 항목은 삭제할 수 없습니다.'),
  })
  const removeMany = useMutation({
    mutationFn: (ids: number[]) => adminAiNewsApi.deleteTopics(ids),
    onSuccess: (result) => {
      setSelected([])
      invalidate()
      window.alert(result.skipped > 0
        ? `${result.deleted}건을 삭제했습니다. ${result.skipped}건은 글이 연결되어 있어 건너뛰었습니다.`
        : `${result.deleted}건을 삭제했습니다.`)
    },
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    save.mutate(form)
  }
  const rows = data?.content ?? []
  const allSelected = rows.length > 0 && rows.every((topic) => selected.includes(topic.id))
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">내가 쓸 거리</p>
        <p className="mt-1 leading-6 text-amber-900">
          출시·이벤트 소식과 별개로, 직접 쓰려고 적어 두는 팁·정보 글 메모입니다.
          <strong> AI는 이 목록을 쓰지 않습니다</strong> — 잊지 않으려고 적어 두는 곳입니다.
          글을 쓸 때 <strong>직접 작성</strong>에서 항목을 연결하면 발행 시 자동으로 <strong>썼음</strong>으로 바뀝니다.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-[2fr_1fr_2fr_auto]">
        <RequiredFieldsNotice admin className="sm:col-span-4" />
        <input required aria-required="true" aria-label="쓸 거리 제목" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 셰리 캐스크란?" className={inputCls} />
        <select aria-label="주종" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AiNewsCategory })} className={inputCls}>
          {Object.entries(categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input aria-label="메모" value={form.memo ?? ''} onChange={(e) => setForm({ ...form, memo: e.target.value })}
          placeholder="메모 (참고 링크, 다룰 각도 등)" className={inputCls} />
        <button disabled={save.isPending} className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">추가</button>
      </form>

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-4 shadow-sm">
        <select aria-label="상태 필터" value={status} onChange={(e) => { setStatus(e.target.value as AiNewsTopicStatus | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 상태</option>
          {(Object.keys(topicStatusLabels) as AiNewsTopicStatus[]).map((v) => <option key={v} value={v}>{topicStatusLabels[v]}</option>)}
        </select>
        <select aria-label="주종 필터" value={category} onChange={(e) => { setCategory(e.target.value as AiNewsCategory | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 주종</option>
          {Object.entries(categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input aria-label="검색" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
          placeholder="제목 · 메모 검색" className={`${inputCls} min-w-56 flex-1`} />
        {(status || category || keywordInput) && (
          <button type="button" onClick={() => { setStatus(''); setCategory(''); setKeywordInput(''); setPage(0) }} className={smallBtn}>
            필터 초기화
          </button>
        )}
      </div>

      {isLoading ? <Loading /> : !data || data.empty ? (
        <p className="rounded-xl bg-white py-12 text-center text-sm text-neutral-400 shadow-sm">조건에 맞는 항목이 없습니다.</p>
      ) : <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" checked={allSelected}
              onChange={() => setSelected(allSelected ? [] : rows.map((topic) => topic.id))} />
            이 페이지 전체 선택
          </label>
          {selected.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-red-800">{selected.length}건 선택됨</span>
              <button type="button" disabled={removeMany.isPending}
                onClick={() => { if (window.confirm(`선택한 ${selected.length}건을 삭제하시겠습니까?\n글이 연결된 항목은 건너뜁니다.`)) removeMany.mutate(selected) }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {removeMany.isPending ? '삭제 중...' : '선택 삭제'}
              </button>
            </div>
          )}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((topic) => (
            <div key={topic.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <input type="checkbox" aria-label={`${topic.title} 선택`} className="mt-1"
                    checked={selected.includes(topic.id)}
                    onChange={() => setSelected((prev) => prev.includes(topic.id) ? prev.filter((v) => v !== topic.id) : [...prev, topic.id])} />
                  <div>
                    <p className={`font-semibold ${topic.status === 'DONE' ? 'text-neutral-400 line-through' : 'text-neutral-800'}`}>{topic.title}</p>
                    <p className="mt-1 text-xs text-neutral-400">{categoryLabels[topic.category]}</p>
                  </div>
                </div>
                <select aria-label="상태" value={topic.status}
                  onChange={(e) => update.mutate({ id: topic.id, payload: { title: topic.title, category: topic.category, memo: topic.memo, status: e.target.value as AiNewsTopicStatus } })}
                  className={inputCls}>
                  {(Object.keys(topicStatusLabels) as AiNewsTopicStatus[]).map((v) => <option key={v} value={v}>{topicStatusLabels[v]}</option>)}
                </select>
              </div>
              {topic.memo && <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-neutral-500">{topic.memo}</p>}
              <div className="mt-3 flex items-center justify-end">
                <button type="button" disabled={remove.isPending} onClick={() => {
                  if (window.confirm(`'${topic.title}'을(를) 삭제하시겠습니까?`)) remove.mutate(topic.id)
                }} className={smallDangerBtn}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </>}
      {data && data.totalPages > 1 && <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}

function SourcesTab() {
  const qc = useQueryClient()
  const empty: AiNewsSourceConfigRequest = { sourceName: '', sourceUrl: '', sourceType: 'OFFICIAL', enabled: true }
  const [form, setForm] = useState<AiNewsSourceConfigRequest>(empty)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [sourceType, setSourceType] = useState<AiNewsSourceType | ''>('')
  const [state, setState] = useState<AiNewsSourceState | ''>('')
  const [origin, setOrigin] = useState<AiNewsSourceOrigin | ''>('')
  const [keywordInput, setKeywordInput] = useState('')
  const keyword = useDebouncedValue(keywordInput)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ai-news', 'sources', sourceType, state, origin, keyword, page],
    queryFn: () => adminAiNewsApi.sources({
      sourceType: sourceType || undefined,
      enabled: state === 'ENABLED' ? true : state === 'DISABLED' ? false : undefined,
      autoDiscovered: origin === 'AUTO' ? true : origin === 'MANUAL' ? false : undefined,
      keyword: keyword || undefined, page, size: 20,
    }),
  })
  useEffect(() => { setPage(0) }, [keyword])
  // 필터나 페이지가 바뀌면 화면에 없는 행이 선택된 채로 남지 않도록 비운다.
  useEffect(() => { setSelected([]) }, [sourceType, state, origin, keyword, page])
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'sources'] })
  const resetForm = () => { setForm(empty); setEditingId(null) }
  const create = useMutation({ mutationFn: adminAiNewsApi.createSource, onSuccess: () => { resetForm(); setPage(0); invalidate() } })
  const update = useMutation({ mutationFn: ({ id, payload }: { id: number; payload: AiNewsSourceConfigRequest }) => adminAiNewsApi.updateSource(id, payload), onSuccess: () => { resetForm(); invalidate() } })
  const remove = useMutation({ mutationFn: adminAiNewsApi.deleteSource, onSuccess: invalidate })
  const removeMany = useMutation({
    mutationFn: adminAiNewsApi.deleteSources,
    onSuccess: (deleted) => { setSelected([]); invalidate(); window.alert(`출처 ${deleted}건을 삭제했습니다.`) },
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.sourceName.trim() || !form.sourceUrl.trim()) return
    if (editingId == null) create.mutate(form)
    else update.mutate({ id: editingId, payload: form })
  }
  const startEdit = (source: AiNewsSourceConfig) => {
    setEditingId(source.id)
    setForm({ sourceName: source.sourceName, sourceUrl: source.sourceUrl, sourceType: source.sourceType, enabled: source.enabled })
  }
  const rows = data?.content ?? []
  const allSelected = rows.length > 0 && rows.every((source) => selected.includes(source.id))
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((source) => source.id))
  const toggleOne = (id: number) => setSelected((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id])
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-5 rounded-xl bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">{editingId == null ? '공식 출처 추가' : '공식 출처 수정'}</h3>
          <RequiredFieldsNotice admin className="mt-1" />
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            출시 소식은 <strong>여기 등록된 출처에서만</strong> 수집합니다. 등록하지 않은 도메인은 검색 대상이 아니며,
            수집 과정에서 목록에 자동으로 추가되지도 않습니다.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <SourceField label="출처 이름" required help="관리자가 알아볼 수 있는 공식 명칭입니다. 예: 메타베브코리아 공식 인스타그램">
            <input required maxLength={100} value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} placeholder="메타베브코리아 공식 인스타그램" className={`${inputCls} w-full`} />
          </SourceField>
          <SourceField label="공식 출처 URL" required help="홈페이지, 뉴스룸 또는 공식 SNS 계정의 전체 URL을 입력하세요.">
            <input required type="url" maxLength={1500} value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://www.instagram.com/metabevkorea" className={`${inputCls} w-full`} />
          </SourceField>
          <SourceField label="출처 등급" required help="수집에 실제로 쓰이는 것은 공식·전문매체뿐입니다. 커뮤니티·미승인은 근거 표시용 분류입니다.">
            <select required value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value as AiNewsSourceType })} className={`${inputCls} w-full`}>
              {Object.entries(sourceTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </SourceField>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />수집 활성</label>
          <div className="flex gap-2">
            {editingId != null && <button type="button" onClick={resetForm} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-700">취소</button>}
            <button disabled={create.isPending || update.isPending} className="rounded-lg bg-primary-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{editingId == null ? (create.isPending ? '추가 중...' : '출처 추가') : (update.isPending ? '저장 중...' : '수정 저장')}</button>
          </div>
        </div>
        {(create.isError || update.isError) && <p className="text-sm text-red-600">저장하지 못했습니다. 동일한 URL 범위가 이미 등록되어 있거나 입력값 형식이 올바르지 않은지 확인해주세요.</p>}
      </form>

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-4 shadow-sm">
        <select aria-label="등급 필터" value={sourceType} onChange={(e) => { setSourceType(e.target.value as AiNewsSourceType | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 등급</option>
          {Object.entries(sourceTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select aria-label="수집 상태 필터" value={state} onChange={(e) => { setState(e.target.value as AiNewsSourceState | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 상태</option>
          {Object.entries(sourceStateLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select aria-label="등록 경로 필터" value={origin} onChange={(e) => { setOrigin(e.target.value as AiNewsSourceOrigin | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 등록 경로</option>
          {Object.entries(sourceOriginLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input aria-label="출처 검색" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
          placeholder="출처 이름 · 도메인 검색" className={`${inputCls} min-w-56 flex-1`} />
        {(sourceType || state || origin || keywordInput) && (
          <button type="button" onClick={() => { setSourceType(''); setState(''); setOrigin(''); setKeywordInput(''); setPage(0) }} className={smallBtn}>
            필터 초기화
          </button>
        )}
      </div>
      {origin === 'AUTO' && (
        <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">
          예전에 수집 과정에서 자동으로 등록된 출처입니다. 지금은 자동 등록을 하지 않으므로 지워도 다시 생기지 않습니다.
          실제로 수집에 쓰는 공식·전문매체만 남기고 정리하세요.
        </p>
      )}

      {isLoading ? <Loading /> : <>
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-800">{selected.length}건 선택됨</p>
            <button type="button" disabled={removeMany.isPending}
              onClick={() => { if (window.confirm(`선택한 출처 ${selected.length}건을 삭제하시겠습니까?`)) removeMany.mutate(selected) }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {removeMany.isPending ? '삭제 중...' : '선택 삭제'}
            </button>
          </div>
        )}
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full min-w-[900px] text-sm">
          <thead className="border-b bg-neutral-50 text-left text-xs text-neutral-500"><tr>
            <th className="px-4 py-3"><input type="checkbox" aria-label="전체 선택" checked={allSelected} onChange={toggleAll} /></th>
            <th className="px-4 py-3">수집 상태</th><th className="px-4 py-3">출처</th><th className="px-4 py-3">URL</th>
            <th className="px-4 py-3">등급</th><th className="px-4 py-3">활성</th><th className="px-4 py-3">관리</th>
          </tr></thead>
          <tbody className="divide-y">{rows.map((source) => (
            <SourceRow key={source.id} source={source}
              checked={selected.includes(source.id)}
              onToggle={() => toggleOne(source.id)}
              onChange={(payload) => update.mutate({ id: source.id, payload })}
              onEdit={() => startEdit(source)}
              onDelete={() => { if (window.confirm(`'${source.sourceName}' 출처를 삭제하시겠습니까?`)) remove.mutate(source.id) }} />
          ))}</tbody>
        </table>{data?.empty && <p className="py-12 text-center text-sm text-neutral-500">조건에 맞는 출처가 없습니다.</p>}</div>
        <Pagination currentPage={data?.page ?? 0} totalPages={data?.totalPages ?? 0} onPageChange={setPage} />
      </>}
    </div>
  )
}

function SourceRow({ source, checked, onToggle, onChange, onEdit, onDelete }: {
  source: AiNewsSourceConfig; checked: boolean; onToggle: () => void
  onChange: (v: AiNewsSourceConfigRequest) => void; onEdit: () => void; onDelete: () => void
}) {
  const payload = (patch: Partial<AiNewsSourceConfigRequest>): AiNewsSourceConfigRequest => ({
    sourceName: source.sourceName, sourceUrl: source.sourceUrl, sourceType: source.sourceType,
    enabled: source.enabled, ...patch,
  })
  return <tr>
    <td className="px-4 py-3"><input type="checkbox" aria-label={`${source.sourceName} 선택`} checked={checked} onChange={onToggle} /></td>
    <td className="px-4 py-3"><CrawlStatus source={source} /></td>
    <td className="max-w-[200px] px-4 py-3 font-semibold">{source.sourceName}
      {source.autoDiscovered && <span className="ml-1.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500">자동 등록</span>}</td>
    <td className="max-w-[320px] px-4 py-3"><a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-blue-600 underline-offset-2 hover:underline" title={source.sourceUrl}>{source.sourceUrl}</a></td>
    <td className="px-4 py-3"><select aria-label="출처 등급" value={source.sourceType} onChange={(e) => onChange(payload({ sourceType: e.target.value as AiNewsSourceType }))} className={inputCls}>{Object.entries(sourceTypeLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></td>
    <td className="px-4 py-3"><input type="checkbox" aria-label="수집 활성" checked={source.enabled} onChange={(e) => onChange(payload({ enabled: e.target.checked }))} /></td>
    <td className="px-4 py-3"><div className="flex gap-2">
      <button onClick={onEdit} className={smallBtn}>수정</button>
      <button onClick={onDelete} className={smallDangerBtn}>삭제</button>
    </div></td></tr>
}

function CrawlStatus({ source }: { source: AiNewsSourceConfig }) {
  const color = source.crawlStatus === 'SUCCESS' ? 'bg-blue-500' : source.crawlStatus === 'ERROR' ? 'bg-red-500' : 'bg-neutral-300'
  const label = source.crawlStatus === 'SUCCESS' ? '수집 성공' : source.crawlStatus === 'ERROR' ? '수집 실패' : '수집 전'
  const detail = source.lastCrawledAt ? `${label} · ${formatDateTime(source.lastCrawledAt)}${source.lastCrawlError ? ` · ${source.lastCrawlError}` : ''}` : label
  return <span className="inline-flex items-center gap-2" title={detail}><span className={`h-3 w-3 rounded-full ${color}`} /><span className="text-xs text-neutral-600">{label}</span></span>
}

function SourceField({ label, required = false, help, children }: { label: string; required?: boolean; help: string; children: ReactNode }) {
  return <label className="block text-xs font-medium text-neutral-700" aria-required={required || undefined}>
    <span>{label}{required && <RequiredMark />}</span>
    <span className="mt-1.5 block">{children}</span>
    <span className="mt-1.5 block font-normal leading-4 text-neutral-500">{help}</span>
  </label>
}

function SettingsTab() {
  const qc = useQueryClient()
  const { data: saved, isLoading } = useQuery({ queryKey: ['admin', 'ai-news', 'settings'], queryFn: adminAiNewsApi.settings })
  const { data: usage } = useQuery({ queryKey: ['admin', 'ai-news', 'usage'], queryFn: adminAiNewsApi.usage })
  const { data: runs } = useQuery({ queryKey: ['admin', 'ai-news', 'runs'], queryFn: () => adminAiNewsApi.runs(0, 20) })
  const [form, setForm] = useState<AiNewsSettings | null>(null)
  useEffect(() => { if (saved) setForm(saved) }, [saved])
  const save = useMutation({ mutationFn: adminAiNewsApi.updateSettings, onSuccess: (next) => { setForm(next); qc.invalidateQueries({ queryKey: ['admin', 'ai-news'] }) } })
  if (isLoading || !form) return <Loading />
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Tavily 크레딧" value={`${usage?.tavilyCredits ?? 0} / ${usage?.tavilyCreditLimit ?? form.tavilyMonthlyCreditLimit}`} />
      <Metric label="입력 토큰" value={(usage?.inputTokens ?? 0).toLocaleString()} />
      <Metric label="출력 토큰" value={(usage?.outputTokens ?? 0).toLocaleString()} />
      <Metric label="월 토큰 합계" value={`${((usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)).toLocaleString()} / ${usage?.openaiTokenLimit?.toLocaleString() ?? '무제한'}`} />
      <Metric label="예상 Gemini 비용" value={`$${Number(usage?.estimatedCostUsd ?? 0).toFixed(4)}`} />
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      <p className="font-semibold text-amber-950">AI는 소재까지만 만듭니다</p>
      <p className="mt-1">
        등록 출처에서 쓸 만한 사건을 찾아 <strong>제목·요약·근거 URL</strong>만 저장합니다.
        본문과 이미지는 관리자가 직접 만들고, 발행도 직접 합니다.
      </p>
    </div>
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(form) }} className="space-y-5 rounded-xl bg-white p-5 shadow-sm">
      <RequiredFieldsNotice admin />
      <Toggle label="자동화 활성화" description="정해진 주기에 따라 등록 출처를 훑어 소재를 모읍니다. OFF이면 새로운 수집을 시작하지 않습니다." checked={form.automationEnabled} onChange={(v) => setForm({ ...form, automationEnabled: v })} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField label="소재 일일 수집 한도" value={form.dailyReleaseLimit} onChange={(v) => setForm({ ...form, dailyReleaseLimit: v })} />
        <NumberField label="Tavily 월 한도" value={form.tavilyMonthlyCreditLimit} onChange={(v) => setForm({ ...form, tavilyMonthlyCreditLimit: v })} />
        <NumberField label="Gemini 월 예산(USD, 0=모니터링)" value={form.openaiMonthlyBudgetUsd ?? 0} step="0.01" onChange={(v) => setForm({ ...form, openaiMonthlyBudgetUsd: v > 0 ? v : null })} />
        <NumberField label="Gemini 월 토큰 한도(0=무제한)" value={form.openaiMonthlyTokenLimit ?? 0} onChange={(v) => setForm({ ...form, openaiMonthlyTokenLimit: v > 0 ? v : null })} />
        <NumberField label="위스키 비율" value={form.whiskyRatio} onChange={(v) => setForm({ ...form, whiskyRatio: v })} />
        <NumberField label="와인 비율" value={form.wineRatio} onChange={(v) => setForm({ ...form, wineRatio: v })} />
        <NumberField label="꼬냑 비율" value={form.cognacRatio} onChange={(v) => setForm({ ...form, cognacRatio: v })} />
      </div>
      <div className="space-y-1 text-xs leading-5 text-neutral-500">
        <p>소재 일일 수집 한도는 <strong>발행이 아니라 수집</strong> 기준입니다.</p>
        <p>주종 비율은 소재 검색이 실행마다 어느 주종에 집중할지 정하는 순환 비중입니다. 합계는 100이어야 합니다. (60/20/20이면 10회 중 위스키 6·와인 2·꼬냑 2)</p>
        <p>API 키와 절대 안전상한은 서버 환경변수에서만 관리합니다.</p>
      </div>
      <button disabled={save.isPending} className="rounded-lg bg-primary-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">설정 저장</button>
    </form>
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full min-w-[760px] text-sm">
      <thead className="border-b bg-neutral-50 text-left text-xs text-neutral-500"><tr><th className="px-4 py-3">시작</th><th className="px-4 py-3">유형</th><th className="px-4 py-3">상태</th><th className="px-4 py-3">후보</th><th className="px-4 py-3">발행</th><th className="px-4 py-3">검토</th><th className="px-4 py-3">중복</th><th className="px-4 py-3">오류</th></tr></thead>
      <tbody className="divide-y">{runs?.content.map((run) => <tr key={run.id}><td className="px-4 py-3 text-xs">{formatDateTime(run.startedAt)}</td><td className="px-4 py-3">{run.runType}</td><td className="px-4 py-3">{run.status}</td><td className="px-4 py-3">{run.candidateCount}</td><td className="px-4 py-3">{run.publishedCount}</td><td className="px-4 py-3">{run.reviewCount}</td><td className="px-4 py-3">{run.duplicateCount}</td><td className="px-4 py-3 text-red-500">{run.errorCount}{run.errorMessage ? ` · ${run.errorMessage}` : ''}</td></tr>)}</tbody>
    </table></div>
  </div>
}

function StatusBadge({ status }: { status: AiNewsArticleStatus }) {
  const color = status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' : status === 'FAILED' || status === 'DELETED' ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-600'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{statusLabels[status]}</span>
}
function Loading() { return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-800" /></div> }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-lg font-bold text-neutral-900">{value}</p></div> }
function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-start gap-3 rounded-lg border p-3">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
    <span><span className="block text-sm font-semibold text-neutral-800">{label}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{description}</span></span>
  </label>
}
function NumberField({ label, value, onChange, step = '1' }: { label: string; value: number; onChange: (v: number) => void; step?: string }) { return <label className="text-xs font-medium text-neutral-600">{label}<RequiredMark /><NumberInput required aria-required="true"step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${inputCls} mt-1 w-full`} /></label> }

const inputCls = 'rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100'
const smallBtn = 'rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100'
const smallPrimaryBtn = 'rounded-md bg-primary-800 px-2 py-1 text-xs text-white hover:bg-primary-900'
const smallDangerBtn = 'rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50'
