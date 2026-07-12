import { useEffect, useState, type FormEvent } from 'react'
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
import { formatDateTime } from '@/shared/utils/format'

type Tab = 'articles' | 'topics' | 'sources' | 'settings'

const statusLabels: Record<AiNewsArticleStatus, string> = {
  DRAFT: '임시저장', PENDING_REVIEW: '검토 대기', PUBLISHED: '발행됨', REJECTED: '반려',
  SKIPPED_DUPLICATE: '중복 제외', FAILED: '실패', DELETED: '삭제됨',
}
const articleTypeLabels: Record<AiNewsArticleType, string> = {
  RELEASE_NEWS: '출시·국내 소식', TIP_INFO: '팁 및 정보',
}
const categoryLabels: Record<AiNewsCategory, string> = { WHISKY: '위스키', WINE: '와인', COGNAC: '꼬냑' }
const sourceTypeLabels: Record<AiNewsSourceType, string> = {
  OFFICIAL: '공식', TRUSTED_MEDIA: '전문매체', COMMUNITY: '커뮤니티', UNAPPROVED: '미승인',
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
    if ((kind === 'delete' || kind === 'publish') && !window.confirm(kind === 'delete' ? '삭제하시겠습니까?' : '지금 발행하시겠습니까?')) return
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
                      <button onClick={() => navigate(`/admin/community/ai-news/${item.id}/edit`)} className="truncate font-semibold text-neutral-800 hover:text-primary-700">
                        {item.updateAvailable && <span className="mr-1 text-amber-600">●</span>}{item.title}
                      </button>
                      {item.failureReason && <p className="mt-1 truncate text-xs text-red-500">{item.failureReason}</p>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{Math.round(Number(item.confidenceScore) * 100)}%</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/admin/community/ai-news/${item.id}/edit`)} className={smallBtn}>수정</button>
                        {!['PUBLISHED', 'DELETED', 'SKIPPED_DUPLICATE', 'REJECTED'].includes(item.status) && <button onClick={() => runAction(item.id, 'publish')} className={smallPrimaryBtn}>발행</button>}
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
  const [form, setForm] = useState<AiNewsTopicRequest>({ title: '', normalizedKey: '', category: 'WHISKY', status: 'READY' })
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ai-news', 'topics', status],
    queryFn: () => adminAiNewsApi.topics({ status: status || undefined, page: 0, size: 100 }),
  })
  const save = useMutation({
    mutationFn: (payload: AiNewsTopicRequest) => adminAiNewsApi.createTopic(payload),
    onSuccess: () => { setForm({ title: '', normalizedKey: '', category: 'WHISKY', status: 'READY' }); qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'topics'] }) },
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AiNewsTopicRequest }) => adminAiNewsApi.updateTopic(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'topics'] }),
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.normalizedKey.trim()) return
    save.mutate(form)
  }
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-5">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="새 정보 글 주제" className={inputCls} />
        <input value={form.normalizedKey} onChange={(e) => setForm({ ...form, normalizedKey: e.target.value })} placeholder="중복 키 (영문 권장)" className={inputCls} />
        <input value={form.aliases ?? ''} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="동의어, 쉼표 구분" className={inputCls} />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AiNewsCategory })} className={inputCls}>
          {Object.entries(categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button disabled={save.isPending} className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">주제 추가</button>
      </form>
      <div className="flex justify-end"><select value={status} onChange={(e) => setStatus(e.target.value as AiNewsTopicStatus | '')} className={inputCls}>
        <option value="">전체 상태</option>{['READY','SCHEDULED','HOLD','BLOCKED','COMPLETED'].map((s) => <option key={s} value={s}>{s}</option>)}
      </select></div>
      {isLoading ? <Loading /> : <div className="grid gap-3 lg:grid-cols-2">
        {data?.content.map((topic) => (
          <div key={topic.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-neutral-800">{topic.title}</p>
              <p className="mt-1 text-xs text-neutral-400">{topic.normalizedKey} · {categoryLabels[topic.category]}{topic.aiSuggested ? ' · AI 제안' : ''}</p></div>
              <select value={topic.status} onChange={(e) => update.mutate({ id: topic.id, payload: { title: topic.title, normalizedKey: topic.normalizedKey, aliases: topic.aliases, category: topic.category, status: e.target.value as AiNewsTopicStatus, allowRepublish: topic.allowRepublish } })} className={inputCls}>
                {['READY','SCHEDULED','HOLD','BLOCKED','COMPLETED'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
            {topic.aliases && <p className="mt-3 text-xs text-neutral-500">동의어: {topic.aliases}</p>}
            <label className="mt-3 flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={topic.allowRepublish}
              onChange={(e) => update.mutate({ id: topic.id, payload: { title: topic.title, normalizedKey: topic.normalizedKey, aliases: topic.aliases, category: topic.category, status: topic.status, allowRepublish: e.target.checked } })} /> 재발행 허용</label>
          </div>
        ))}
      </div>}
    </div>
  )
}

function SourcesTab() {
  const qc = useQueryClient()
  const empty: AiNewsSourceConfigRequest = { sourceName: '', domain: '', sourceType: 'UNAPPROVED', enabled: true, autoPublishAllowed: false, imageUseAllowed: false, crawlerType: null, crawlerTargetKey: null, crawlerTargetValue: null }
  const [form, setForm] = useState<AiNewsSourceConfigRequest>(empty)
  const { data = [], isLoading } = useQuery({ queryKey: ['admin', 'ai-news', 'sources'], queryFn: adminAiNewsApi.sources })
  const create = useMutation({ mutationFn: adminAiNewsApi.createSource, onSuccess: () => { setForm(empty); qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'sources'] }) } })
  const update = useMutation({ mutationFn: ({ id, payload }: { id: number; payload: AiNewsSourceConfigRequest }) => adminAiNewsApi.updateSource(id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ai-news', 'sources'] }) })
  const submit = (e: FormEvent) => { e.preventDefault(); if (form.sourceName.trim() && form.domain.trim()) create.mutate(form) }
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-xl bg-white p-4 shadow-sm lg:grid-cols-4">
        <input value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} placeholder="출처 이름" className={inputCls} />
        <input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="example.com" className={inputCls} />
        <select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value as AiNewsSourceType })} className={inputCls}>
          {Object.entries(sourceTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white">출처 추가</button>
        <input value={form.crawlerType ?? ''} onChange={(e) => setForm({ ...form, crawlerType: e.target.value || null })} placeholder="수집기 (NAVER_CAFE/DCINSIDE)" className={inputCls} />
        <input value={form.crawlerTargetKey ?? ''} onChange={(e) => setForm({ ...form, crawlerTargetKey: e.target.value || null })} placeholder="대상 키 (club_id/board_id)" className={inputCls} />
        <input value={form.crawlerTargetValue ?? ''} onChange={(e) => setForm({ ...form, crawlerTargetValue: e.target.value || null })} placeholder="대상 값" className={inputCls} />
      </form>
      {isLoading ? <Loading /> : <div className="overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full min-w-[850px] text-sm">
        <thead className="border-b bg-neutral-50 text-left text-xs text-neutral-500"><tr><th className="px-4 py-3">출처</th><th className="px-4 py-3">도메인</th><th className="px-4 py-3">등급</th><th className="px-4 py-3">활성</th><th className="px-4 py-3">자동발행</th><th className="px-4 py-3">이미지</th><th className="px-4 py-3">수집 대상</th></tr></thead>
        <tbody className="divide-y">{data.map((source) => <SourceRow key={source.id} source={source} onChange={(payload) => update.mutate({ id: source.id, payload })} />)}</tbody>
      </table></div>}
    </div>
  )
}

function SourceRow({ source, onChange }: { source: AiNewsSourceConfig; onChange: (v: AiNewsSourceConfigRequest) => void }) {
  const payload = (patch: Partial<AiNewsSourceConfigRequest>): AiNewsSourceConfigRequest => ({
    sourceName: source.sourceName, domain: source.domain, sourceType: source.sourceType, enabled: source.enabled,
    autoPublishAllowed: source.autoPublishAllowed, imageUseAllowed: source.imageUseAllowed,
    crawlerType: source.crawlerType, crawlerTargetKey: source.crawlerTargetKey, crawlerTargetValue: source.crawlerTargetValue, ...patch,
  })
  return <tr><td className="px-4 py-3 font-semibold">{source.sourceName}</td><td className="px-4 py-3 text-neutral-500">{source.domain}</td>
    <td className="px-4 py-3"><select value={source.sourceType} onChange={(e) => onChange(payload({ sourceType: e.target.value as AiNewsSourceType }))} className={inputCls}>{Object.entries(sourceTypeLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></td>
    <td className="px-4 py-3"><input type="checkbox" checked={source.enabled} onChange={(e) => onChange(payload({ enabled: e.target.checked }))} /></td>
    <td className="px-4 py-3"><input type="checkbox" checked={source.autoPublishAllowed} onChange={(e) => onChange(payload({ autoPublishAllowed: e.target.checked }))} /></td>
    <td className="px-4 py-3"><input type="checkbox" checked={source.imageUseAllowed} onChange={(e) => onChange(payload({ imageUseAllowed: e.target.checked }))} /></td>
    <td className="px-4 py-3 text-xs text-neutral-500">{[source.crawlerType, source.crawlerTargetKey, source.crawlerTargetValue].filter(Boolean).join(' · ') || '-'}</td></tr>
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
  const color = status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-700' : status === 'FAILED' || status === 'DELETED' ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-600'
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
function NumberField({ label, value, onChange, step = '1' }: { label: string; value: number; onChange: (v: number) => void; step?: string }) { return <label className="text-xs font-medium text-neutral-600">{label}<input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${inputCls} mt-1 w-full`} /></label> }

const inputCls = 'rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100'
const smallBtn = 'rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100'
const smallPrimaryBtn = 'rounded-md bg-primary-800 px-2 py-1 text-xs text-white hover:bg-primary-900'
const smallDangerBtn = 'rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50'
