import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminAiNewsApi } from '@/domain/admin/api/adminAiNewsApi'
import type {
  AiNewsArticleStatus, AiNewsArticleType, AiNewsCategory, AiNewsSettings,
  AiNewsSourceConfig, AiNewsSourceConfigRequest, AiNewsSourceState, AiNewsSourceType,
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
  SKIPPED_DUPLICATE: '중복 제외', FAILED: '실패', DELETED: '삭제됨', REWRITE_REQUESTED: '재작성 대기',
}
const articleTypeLabels: Record<AiNewsArticleType, string> = {
  RELEASE_NEWS: '출시·국내 소식', TIP_INFO: '팁 및 정보',
}
const categoryLabels: Record<AiNewsCategory, string> = {
  WHISKY: '위스키', WINE: '와인', COGNAC: '꼬냑', OTHER: '기타',
}
const sourceTypeLabels: Record<AiNewsSourceType, string> = {
  OFFICIAL: '공식', TRUSTED_MEDIA: '전문매체', COMMUNITY: '커뮤니티', UNAPPROVED: '미승인',
}
const sourceStateLabels: Record<AiNewsSourceState, string> = {
  ENABLED: '수집 활성', DISABLED: '수집 비활성', BLOCKED: '차단됨',
}
const topicStatusLabels: Record<AiNewsTopicStatus, string> = {
  READY: '작성 대기', SCHEDULED: '작성 예정', HOLD: '보류', BLOCKED: '중복 차단', COMPLETED: '발행 완료',
}
const topicStatusDescriptions: Record<AiNewsTopicStatus, string> = {
  READY: 'AI 자동화가 실제로 선택하는 상태입니다. 정보 글 발행 주기가 되면 오래된 주제부터 처리합니다.',
  SCHEDULED: '향후 작성을 위해 분류해 둔 상태입니다. 현재 날짜 예약 기능은 없으므로 작성하려면 READY로 변경해야 합니다.',
  HOLD: '원고나 자동발행 조건을 관리자가 확인해야 하는 보류 상태이며 자동 처리되지 않습니다.',
  BLOCKED: '기존 글과 주제·동의어 또는 의미가 중복되어 차단된 상태이며 자동 처리되지 않습니다.',
  COMPLETED: '해당 주제로 글이 발행된 상태입니다. 다시 작성하려면 재발행 허용을 켜고 READY로 변경해야 합니다.',
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
          작성 / AI 요청
        </button>
      </div>

      {isLoading ? <Loading /> : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
              <tr><th className="px-4 py-3">작성일</th><th className="px-4 py-3">유형</th><th className="px-4 py-3">주종</th>
                <th className="px-4 py-3">제목</th><th className="px-4 py-3">신뢰도</th><th className="px-4 py-3">상태</th><th className="px-4 py-3">작업</th></tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {!data || data.empty ? <tr><td colSpan={7} className="py-12 text-center text-neutral-400">게시글이 없습니다.</td></tr>
                : data.content.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3">{articleTypeLabels[item.articleType]}</td>
                    <td className="px-4 py-3">{categoryLabels[item.category]}</td>
                    <td className="max-w-[340px] px-4 py-3">
                      <button title={item.title} onClick={() => navigate(`/admin/community/ai-news/${item.id}/edit`)} className="block max-w-[340px] truncate font-semibold text-neutral-800 hover:text-primary-700">
                        {item.updateAvailable && <span className="mr-1 text-amber-600">●</span>}{shortTitle(item.title)}
                      </button>
                      {item.failureReason && <p className="mt-1 truncate text-xs text-red-500">{item.failureReason}</p>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{Math.round(Number(item.confidenceScore) * 100)}%</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                      {item.status === 'SCHEDULED' && item.scheduledAt && <p className="mt-1 whitespace-nowrap text-[11px] text-blue-600">{formatDateTime(item.scheduledAt)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/admin/community/ai-news/${item.id}/edit`)} className={smallBtn}>수정</button>
                        {!['PUBLISHED', 'DELETED', 'SKIPPED_DUPLICATE', 'REJECTED', 'REWRITE_REQUESTED'].includes(item.status) && <button onClick={() => runAction(item.id, 'publish')} className={smallPrimaryBtn}>발행</button>}
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
  const [form, setForm] = useState<AiNewsTopicRequest>({ title: '', normalizedKey: '', category: 'WHISKY', status: 'READY' })
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ai-news', 'topics', status, category, keyword, page],
    queryFn: () => adminAiNewsApi.topics({
      status: status || undefined, category: category || undefined,
      keyword: keyword || undefined, page, size: 20,
    }),
  })
  // 검색어 확정 시점(디바운스 후)에도 페이지를 처음으로 되돌려야 빈 목록이 나오지 않는다.
  useEffect(() => { setPage(0) }, [keyword])
  const save = useMutation({
    mutationFn: (payload: AiNewsTopicRequest) => adminAiNewsApi.createTopic(payload),
    onSuccess: () => { setForm({ title: '', normalizedKey: '', category: 'WHISKY', status: 'READY' }); qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'topics'] }) },
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AiNewsTopicRequest }) => adminAiNewsApi.updateTopic(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'topics'] }),
  })
  const remove = useMutation({
    mutationFn: (id: number) => adminAiNewsApi.deleteTopic(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'topics'] }),
    onError: () => window.alert('이미 생성된 원고가 연결된 주제는 삭제할 수 없습니다. 사용을 중단하려면 상태를 보류로 변경해주세요.'),
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.normalizedKey.trim()) return
    save.mutate(form)
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">정보 주제란?</p>
        <p className="mt-1 leading-6 text-amber-900">
          출시 소식과 별도로 AI가 작성할 위스키·와인·꼬냑 팁과 장기 정보 글의 소재 목록입니다.
          설정된 정보 글 간격이 지나면 READY 주제를 오래된 순서로 하나 선택해 자료 검색, 원고 작성, 중복 검사를 진행합니다.
          READY 주제가 없으면 AI가 새 주제를 제안할 수 있습니다.
        </p>
        <p className="mt-2 text-xs text-amber-800">
          중복 키는 주제를 식별하는 고유값이며 생성 후 변경할 수 없습니다. 삭제는 아직 원고에 사용되지 않은 주제만 가능합니다.
        </p>
      </div>
      {/* 상태 설명은 처음 한 번만 읽으면 되므로 접어 두고 필터 바에 자리를 내준다. */}
      <details className="rounded-xl bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-neutral-800">상태별 동작 설명</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {(Object.keys(topicStatusLabels) as AiNewsTopicStatus[]).map((value) => (
            <div key={value} className="rounded-lg border border-neutral-200 p-3">
              <p className="text-sm font-semibold text-neutral-800">{value} · {topicStatusLabels[value]}</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">{topicStatusDescriptions[value]}</p>
            </div>
          ))}
        </div>
      </details>
      <form onSubmit={submit} className="grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-5">
        <RequiredFieldsNotice admin className="sm:col-span-5" />
        <input required aria-required="true" aria-label="새 정보 글 주제" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="새 정보 글 주제" className={inputCls} />
        <input required aria-required="true" aria-label="중복 키" value={form.normalizedKey} onChange={(e) => setForm({ ...form, normalizedKey: e.target.value })} placeholder="중복 키 (영문 권장)" className={inputCls} />
        <input value={form.aliases ?? ''} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="동의어, 쉼표 구분" className={inputCls} />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AiNewsCategory })} className={inputCls}>
          {Object.entries(categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button disabled={save.isPending} className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">주제 추가</button>
      </form>
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-4 shadow-sm">
        <select aria-label="상태 필터" value={status} onChange={(e) => { setStatus(e.target.value as AiNewsTopicStatus | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 상태</option>
          {(Object.keys(topicStatusLabels) as AiNewsTopicStatus[]).map((s) => <option key={s} value={s}>{s} · {topicStatusLabels[s]}</option>)}
        </select>
        <select aria-label="주종 필터" value={category} onChange={(e) => { setCategory(e.target.value as AiNewsCategory | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 주종</option>
          {Object.entries(categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input aria-label="주제 검색" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
          placeholder="제목 · 중복 키 · 동의어 검색" className={`${inputCls} min-w-56 flex-1`} />
        {(status || category || keywordInput) && (
          <button type="button" onClick={() => { setStatus(''); setCategory(''); setKeywordInput(''); setPage(0) }} className={smallBtn}>
            필터 초기화
          </button>
        )}
      </div>
      {isLoading ? <Loading /> : !data || data.empty ? (
        <p className="rounded-xl bg-white py-12 text-center text-sm text-neutral-400 shadow-sm">조건에 맞는 주제가 없습니다.</p>
      ) : <div className="grid gap-3 lg:grid-cols-2">
        {data.content.map((topic) => (
          <div key={topic.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-neutral-800">{topic.title}</p>
              <p className="mt-1 text-xs text-neutral-400">{topic.normalizedKey} · {categoryLabels[topic.category]}{topic.aiSuggested ? ' · AI 제안' : ''}</p></div>
              <select value={topic.status} onChange={(e) => update.mutate({ id: topic.id, payload: { title: topic.title, normalizedKey: topic.normalizedKey, aliases: topic.aliases, category: topic.category, status: e.target.value as AiNewsTopicStatus, allowRepublish: topic.allowRepublish } })} className={inputCls}>
                {(Object.keys(topicStatusLabels) as AiNewsTopicStatus[]).map((s) => <option key={s} value={s}>{s} · {topicStatusLabels[s]}</option>)}
              </select></div>
            {topic.aliases && <p className="mt-3 text-xs text-neutral-500">동의어: {topic.aliases}</p>}
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={topic.allowRepublish}
                onChange={(e) => update.mutate({ id: topic.id, payload: { title: topic.title, normalizedKey: topic.normalizedKey, aliases: topic.aliases, category: topic.category, status: topic.status, allowRepublish: e.target.checked } })} /> 재발행 허용</label>
              <button type="button" disabled={remove.isPending} onClick={() => {
                if (window.confirm(`'${topic.title}' 주제를 삭제하시겠습니까? 원고 이력이 있는 주제는 삭제할 수 없습니다.`)) remove.mutate(topic.id)
              }} className={smallDangerBtn}>삭제</button>
            </div>
          </div>
        ))}
      </div>}
      {data && data.totalPages > 1 && <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}

function SourcesTab() {
  const qc = useQueryClient()
  const empty: AiNewsSourceConfigRequest = { sourceName: '', sourceUrl: '', sourceType: 'OFFICIAL', enabled: true, autoPublishAllowed: false, imageUseAllowed: false }
  const [form, setForm] = useState<AiNewsSourceConfigRequest>(empty)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [sourceType, setSourceType] = useState<AiNewsSourceType | ''>('')
  const [state, setState] = useState<AiNewsSourceState | ''>('')
  const [keywordInput, setKeywordInput] = useState('')
  const keyword = useDebouncedValue(keywordInput)
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ai-news', 'sources', sourceType, state, keyword, page],
    queryFn: () => adminAiNewsApi.sources({
      sourceType: sourceType || undefined,
      // 활성/비활성은 차단이 아닌 행에서만 의미가 있고, 차단은 별도 축이라 하나의 select 로 합쳐 보낸다.
      enabled: state === 'ENABLED' ? true : state === 'DISABLED' ? false : undefined,
      blocked: state === 'BLOCKED' ? true : undefined,
      keyword: keyword || undefined, page, size: 10,
    }),
  })
  useEffect(() => { setPage(0) }, [keyword])
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'sources'] })
  const resetForm = () => { setForm(empty); setEditingId(null) }
  const create = useMutation({ mutationFn: adminAiNewsApi.createSource, onSuccess: () => { resetForm(); setPage(0); invalidate() } })
  const update = useMutation({ mutationFn: ({ id, payload }: { id: number; payload: AiNewsSourceConfigRequest }) => adminAiNewsApi.updateSource(id, payload), onSuccess: () => { resetForm(); invalidate() } })
  const remove = useMutation({ mutationFn: adminAiNewsApi.deleteSource, onSuccess: invalidate })
  const unblock = useMutation({ mutationFn: adminAiNewsApi.unblockSource, onSuccess: invalidate })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.sourceName.trim() || !form.sourceUrl.trim()) return
    if (editingId == null) create.mutate(form)
    else update.mutate({ id: editingId, payload: form })
  }
  const startEdit = (source: AiNewsSourceConfig) => {
    setEditingId(source.id)
    setForm({ sourceName: source.sourceName, sourceUrl: source.sourceUrl, sourceType: source.sourceType, enabled: source.enabled, autoPublishAllowed: source.autoPublishAllowed, imageUseAllowed: source.imageUseAllowed })
  }
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-5 rounded-xl bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">{editingId == null ? '공식 출처 추가' : '공식 출처 수정'}</h3>
          <RequiredFieldsNotice admin className="mt-1" />
          <p className="mt-1 text-xs leading-5 text-neutral-500">AI가 등록 URL을 직접 확인하고 Tavily 제한 검색의 신뢰 출처로 사용합니다.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <SourceField label="출처 이름" required help="관리자가 알아볼 수 있는 공식 명칭입니다. 예: 메타베브코리아 공식 인스타그램">
            <input required maxLength={100} value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} placeholder="메타베브코리아 공식 인스타그램" className={`${inputCls} w-full`} />
          </SourceField>
          <SourceField label="공식 출처 URL" required help="홈페이지, 뉴스룸 또는 공식 SNS 계정의 전체 URL을 입력하세요.">
            <input required type="url" maxLength={1500} value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://www.instagram.com/metabevkorea" className={`${inputCls} w-full`} />
          </SourceField>
          <SourceField label="출처 등급" required help="공식 홈페이지·계정은 공식, 검증된 언론은 전문매체를 선택합니다.">
            <select required value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value as AiNewsSourceType })} className={`${inputCls} w-full`}>
              {Object.entries(sourceTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </SourceField>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <div className="flex flex-wrap gap-5 text-sm text-neutral-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />수집 활성</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.autoPublishAllowed} onChange={(e) => setForm({ ...form, autoPublishAllowed: e.target.checked })} />자동 발행 허용</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.imageUseAllowed} onChange={(e) => setForm({ ...form, imageUseAllowed: e.target.checked })} />공식 이미지 사용 허용</label>
          </div>
          <div className="flex gap-2">
            {editingId != null && <button type="button" onClick={resetForm} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-700">취소</button>}
            <button disabled={create.isPending || update.isPending} className="rounded-lg bg-primary-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{editingId == null ? (create.isPending ? '추가 중...' : '출처 추가') : (update.isPending ? '저장 중...' : '수정 저장')}</button>
          </div>
        </div>
        {(create.isError || update.isError) && <p className="text-sm text-red-600">저장하지 못했습니다. 동일한 URL 범위가 이미 등록되어 있거나(차단 목록도 확인하세요) 입력값 형식이 올바르지 않은지 확인해주세요.</p>}
      </form>

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-4 shadow-sm">
        <select aria-label="등급 필터" value={sourceType} onChange={(e) => { setSourceType(e.target.value as AiNewsSourceType | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 등급</option>
          {Object.entries(sourceTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select aria-label="수집 상태 필터" value={state} onChange={(e) => { setState(e.target.value as AiNewsSourceState | ''); setPage(0) }} className={inputCls}>
          <option value="">전체 상태 (차단 제외)</option>
          {Object.entries(sourceStateLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input aria-label="출처 검색" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)}
          placeholder="출처 이름 · 도메인 검색" className={`${inputCls} min-w-56 flex-1`} />
        {(sourceType || state || keywordInput) && (
          <button type="button" onClick={() => { setSourceType(''); setState(''); setKeywordInput(''); setPage(0) }} className={smallBtn}>
            필터 초기화
          </button>
        )}
      </div>
      {state === 'BLOCKED' && (
        <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">
          차단된 출처는 수집·근거에 쓰이지 않고, 같은 도메인이 수집 과정에서 다시 등록되지도 않습니다.
          다시 쓰려면 차단을 해제한 뒤 수집 활성을 켜세요.
        </p>
      )}

      {isLoading ? <Loading /> : <>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full min-w-[1050px] text-sm">
          <thead className="border-b bg-neutral-50 text-left text-xs text-neutral-500"><tr><th className="px-4 py-3">수집 상태</th><th className="px-4 py-3">출처</th><th className="px-4 py-3">URL</th><th className="px-4 py-3">등급</th><th className="px-4 py-3">활성</th><th className="px-4 py-3">자동발행</th><th className="px-4 py-3">이미지</th><th className="px-4 py-3">관리</th></tr></thead>
          <tbody className="divide-y">{data?.content.map((source) => (
            <SourceRow key={source.id} source={source}
              onChange={(payload) => update.mutate({ id: source.id, payload })}
              onEdit={() => startEdit(source)}
              onUnblock={() => unblock.mutate(source.id)}
              onDelete={() => { if (window.confirm(deleteSourceMessage(source))) remove.mutate(source.id) }} />
          ))}</tbody>
        </table>{data?.empty && <p className="py-12 text-center text-sm text-neutral-500">조건에 맞는 출처가 없습니다.</p>}</div>
        <Pagination currentPage={data?.page ?? 0} totalPages={data?.totalPages ?? 0} onPageChange={setPage} />
      </>}
    </div>
  )
}

/** 자동 등록 출처는 지우지 않고 차단으로 남으므로 결과를 다르게 안내한다. */
function deleteSourceMessage(source: AiNewsSourceConfig) {
  return source.autoDiscovered
    ? `'${source.sourceName}' 출처를 차단하시겠습니까?\n\n`
      + '수집 중 자동 등록된 출처입니다. 목록에서 지우기만 하면 다음 수집에서 같은 도메인이 다시 등록되므로 '
      + '차단 목록에 남겨 재등록을 막습니다. 상태 필터의 "차단됨"에서 다시 볼 수 있습니다.'
    : `'${source.sourceName}' 출처를 삭제하시겠습니까?`
}

function SourceRow({ source, onChange, onEdit, onUnblock, onDelete }: { source: AiNewsSourceConfig; onChange: (v: AiNewsSourceConfigRequest) => void; onEdit: () => void; onUnblock: () => void; onDelete: () => void }) {
  const payload = (patch: Partial<AiNewsSourceConfigRequest>): AiNewsSourceConfigRequest => ({
    sourceName: source.sourceName, sourceUrl: source.sourceUrl, sourceType: source.sourceType, enabled: source.enabled,
    autoPublishAllowed: source.autoPublishAllowed, imageUseAllowed: source.imageUseAllowed, ...patch,
  })
  // 차단된 출처는 어떤 설정도 수집에 반영되지 않는다. 오해를 막기 위해 편집을 잠그고 해제만 남긴다.
  const locked = source.blocked
  return <tr className={locked ? 'bg-neutral-50 text-neutral-500' : undefined}>
    <td className="px-4 py-3">{locked
      ? <span className="inline-flex items-center gap-2" title={source.blockedAt ? `차단 · ${formatDateTime(source.blockedAt)}` : '차단됨'}>
          <span className="h-3 w-3 rounded-full bg-neutral-400" /><span className="text-xs font-semibold text-neutral-600">차단됨</span>
        </span>
      : <CrawlStatus source={source} />}</td>
    <td className="max-w-[200px] px-4 py-3 font-semibold">{source.sourceName}
      {source.autoDiscovered && <span className="ml-1.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500">자동 등록</span>}</td>
    <td className="max-w-[320px] px-4 py-3"><a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-blue-600 underline-offset-2 hover:underline" title={source.sourceUrl}>{source.sourceUrl}</a></td>
    <td className="px-4 py-3"><select disabled={locked} value={source.sourceType} onChange={(e) => onChange(payload({ sourceType: e.target.value as AiNewsSourceType }))} className={`${inputCls} disabled:bg-neutral-100`}>{Object.entries(sourceTypeLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></td>
    <td className="px-4 py-3"><input type="checkbox" disabled={locked} checked={source.enabled} onChange={(e) => onChange(payload({ enabled: e.target.checked }))} /></td>
    <td className="px-4 py-3"><input type="checkbox" disabled={locked} checked={source.autoPublishAllowed} onChange={(e) => onChange(payload({ autoPublishAllowed: e.target.checked }))} /></td>
    <td className="px-4 py-3"><input type="checkbox" disabled={locked} checked={source.imageUseAllowed} onChange={(e) => onChange(payload({ imageUseAllowed: e.target.checked }))} /></td>
    <td className="px-4 py-3"><div className="flex gap-2">{locked
      ? <button onClick={onUnblock} className={smallBtn}>차단 해제</button>
      : <>
          <button onClick={onEdit} className={smallBtn}>수정</button>
          <button onClick={onDelete} className={smallDangerBtn}>{source.autoDiscovered ? '차단' : '삭제'}</button>
        </>}</div></td></tr>
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Metric label="Tavily 크레딧" value={`${usage?.tavilyCredits ?? 0} / ${usage?.tavilyCreditLimit ?? form.tavilyMonthlyCreditLimit}`} />
      <Metric label="입력 토큰" value={(usage?.inputTokens ?? 0).toLocaleString()} />
      <Metric label="출력 토큰" value={(usage?.outputTokens ?? 0).toLocaleString()} />
      <Metric label="월 토큰 합계" value={`${((usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)).toLocaleString()} / ${usage?.openaiTokenLimit?.toLocaleString() ?? '무제한'}`} />
      <Metric label="AI 이미지" value={`${usage?.imageCount ?? 0} / ${usage?.openaiImageLimit ?? '무제한'}장`} />
      <Metric label="예상 Gemini 비용" value={`$${Number(usage?.estimatedCostUsd ?? 0).toFixed(4)}`} />
    </div>
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(form) }} className="space-y-5 rounded-xl bg-white p-5 shadow-sm">
      <RequiredFieldsNotice admin />
      <div className="grid gap-4 sm:grid-cols-3">
        <Toggle label="자동화 활성화" description="정해진 주기에 따라 소식 수집, AI 원고·이미지 생성 및 원고 저장을 실행합니다. OFF이면 새로운 자동 작업을 시작하지 않습니다." checked={form.automationEnabled} onChange={(v) => setForm({ ...form, automationEnabled: v })} />
        <Toggle label="조건부 자동발행" description="자동화가 ON이고 드라이런이 OFF일 때, 출처·신뢰도·이미지·예산 등 모든 조건을 통과한 원고만 커뮤니티에 발행합니다. OFF이면 검토 대기로 저장합니다." checked={form.autoPublishEnabled} onChange={(v) => setForm({ ...form, autoPublishEnabled: v })} />
        <Toggle label="드라이런" description="수집과 AI 생성은 실제로 실행해 사용량이 발생하지만 자동 발행은 차단하는 안전 모드입니다. 조건부 자동발행이 OFF이면 ON/OFF 모두 공개 결과는 같습니다." checked={form.dryRun} onChange={(v) => setForm({ ...form, dryRun: v })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField label="출시 소식 일일 한도" value={form.dailyReleaseLimit} onChange={(v) => setForm({ ...form, dailyReleaseLimit: v })} />
        <NumberField label="정보 글 간격(시간)" value={form.tipIntervalHours} onChange={(v) => setForm({ ...form, tipIntervalHours: v })} />
        <NumberField label="신뢰도 기준(0~1)" value={form.confidenceThreshold} step="0.01" onChange={(v) => setForm({ ...form, confidenceThreshold: v })} />
        <NumberField label="Tavily 월 한도" value={form.tavilyMonthlyCreditLimit} onChange={(v) => setForm({ ...form, tavilyMonthlyCreditLimit: v })} />
        <NumberField label="Gemini 월 예산(USD, 0=모니터링)" value={form.openaiMonthlyBudgetUsd ?? 0} step="0.01" onChange={(v) => setForm({ ...form, openaiMonthlyBudgetUsd: v > 0 ? v : null })} />
        <NumberField label="Gemini 월 토큰 한도(0=무제한)" value={form.openaiMonthlyTokenLimit ?? 0} onChange={(v) => setForm({ ...form, openaiMonthlyTokenLimit: v > 0 ? v : null })} />
        <NumberField label="Gemini 월 이미지 한도(0=무제한)" value={form.openaiMonthlyImageLimit ?? 0} onChange={(v) => setForm({ ...form, openaiMonthlyImageLimit: v > 0 ? v : null })} />
        <NumberField label="위스키 비율" value={form.whiskyRatio} onChange={(v) => setForm({ ...form, whiskyRatio: v })} />
        <NumberField label="와인 비율" value={form.wineRatio} onChange={(v) => setForm({ ...form, wineRatio: v })} />
        <NumberField label="꼬냑 비율" value={form.cognacRatio} onChange={(v) => setForm({ ...form, cognacRatio: v })} />
      </div>
      <p className="text-xs text-neutral-500">주종 비율 합계는 100이어야 합니다. API 키와 절대 안전상한은 서버 환경변수에서만 관리합니다.</p>
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
function shortTitle(value: string, maxLength = 32) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}...` : value
}
function NumberField({ label, value, onChange, step = '1' }: { label: string; value: number; onChange: (v: number) => void; step?: string }) { return <label className="text-xs font-medium text-neutral-600">{label}<RequiredMark /><NumberInput required aria-required="true"step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${inputCls} mt-1 w-full`} /></label> }

const inputCls = 'rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100'
const smallBtn = 'rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100'
const smallPrimaryBtn = 'rounded-md bg-primary-800 px-2 py-1 text-xs text-white hover:bg-primary-900'
const smallDangerBtn = 'rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50'
