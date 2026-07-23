import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminAiNewsApi } from '@/domain/admin/api/adminAiNewsApi'
import type { AiNewsArticleType, AiNewsCategory, AiNewsSourceEvidence } from '@/domain/admin/types/aiNews.types'
import { communityApi } from '@/domain/community/api/communityApi'
import PostEditor from '@/domain/community/components/PostEditor'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import Spinner from '@/shared/components/Spinner'
import AdminAiNewsRequestPanel from './AdminAiNewsRequestPanel'
import { formatHashtagInput, MAX_HASHTAGS, MAX_HASHTAG_LENGTH, parseHashtagInput } from '@/shared/utils/hashtags'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'

const MAX_TITLE_LENGTH = 70

export default function AdminAiNewsFormPage() {
  const { id } = useParams()
  const articleId = id ? Number(id) : null
  const isEdit = articleId != null && Number.isFinite(articleId)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const writeMode = searchParams.get('mode') === 'ai' ? 'ai' : 'manual'
  const [articleType, setArticleType] = useState<AiNewsArticleType>('TIP_INFO')
  const [category, setCategory] = useState<AiNewsCategory>('WHISKY')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [prefixId, setPrefixId] = useState<number | ''>('')
  const [topicId, setTopicId] = useState<number | ''>('')
  const [pinned, setPinned] = useState(false)
  const [confidence, setConfidence] = useState(1)
  const [semanticFingerprint, setSemanticFingerprint] = useState('')
  const [sourceUrls, setSourceUrls] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')
  const [rewritePrompt, setRewritePrompt] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [error, setError] = useState('')

  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin', 'ai-news', 'article', articleId],
    queryFn: () => adminAiNewsApi.article(articleId!),
    enabled: isEdit,
  })
  const { data: prefixes = [] } = useQuery({
    queryKey: ['post-prefixes', 'NOTICE'],
    queryFn: () => communityApi.getPrefixes('NOTICE').then((r) => r.data.data ?? []),
  })
  const { data: topics } = useQuery({
    queryKey: ['admin', 'ai-news', 'topics', 'form'],
    queryFn: () => adminAiNewsApi.topics({ page: 0, size: 100 }),
  })

  useEffect(() => {
    if (!detail) return
    setArticleType(detail.articleType)
    setCategory(detail.category)
    setTitle(detail.title)
    setContent(detail.content)
    setPrefixId(detail.prefixId ?? '')
    setTopicId(detail.topicId ?? '')
    setPinned(detail.pinned)
    setConfidence(Number(detail.confidenceScore))
    setSemanticFingerprint(detail.semanticFingerprint ?? '')
    setSourceUrls(detail.sources.map((source) => source.canonicalUrl))
    setHashtagInput(formatHashtagInput(detail.hashtags))
    setScheduledAt(detail.scheduledAt?.slice(0, 16) ?? '')
  }, [detail])

  useEffect(() => {
    if (!isEdit && prefixId === '' && prefixes.length > 0) setPrefixId(prefixes[0].id)
  }, [isEdit, prefixId, prefixes])

  const save = useMutation({
    mutationFn: async (action: 'save' | 'publish' | 'schedule') => {
      if (!title.trim() || !content.trim()) throw new Error('제목과 본문을 입력하세요.')
      if (action === 'schedule' && (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) {
        throw new Error('현재 이후의 예약 발행일시를 입력하세요.')
      }
      const sources = buildSourceEvidence(sourceUrls)
      const hashtags = parseHashtagInput(hashtagInput)
      if (hashtags.length > MAX_HASHTAGS || hashtags.some((hashtag) => hashtag.length > MAX_HASHTAG_LENGTH)) {
        throw new Error(`해시태그는 최대 ${MAX_HASHTAGS}개, 각 ${MAX_HASHTAG_LENGTH}자까지 입력할 수 있습니다.`)
      }
      if (isEdit) {
        const updated = await adminAiNewsApi.updateArticle(articleId!, {
          category, title: title.trim(), content,
          prefixId: prefixId === '' ? null : prefixId,
          pinned, confidenceScore: confidence,
          semanticFingerprint: semanticFingerprint.trim() || null,
          hashtags,
          sourceUrls: sources.map((source) => source.sourceUrl),
        })
        if (action === 'publish' && updated.status !== 'PUBLISHED') await adminAiNewsApi.publish(updated.id)
        if (action === 'schedule') await adminAiNewsApi.publish(updated.id, scheduledAt)
        return updated.id
      }
      const created = await adminAiNewsApi.createArticle({
        articleType, category, title: title.trim(), content,
        dedupeKey: `manual:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        confidenceScore: confidence,
        semanticFingerprint: semanticFingerprint.trim() || title.trim().toLowerCase(),
        topicId: topicId === '' ? null : topicId,
        prefixId: prefixId === '' ? null : prefixId,
        pinned, autoPublishRequested: false, hashtags, sources,
      })
      if (action === 'publish') await adminAiNewsApi.publish(created.id)
      if (action === 'schedule') await adminAiNewsApi.publish(created.id, scheduledAt)
      return created.id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ai-news'] })
      navigate('/admin/community/ai-news', { replace: true })
    },
    onError: (e) => setError(e instanceof Error ? e.message : '저장하지 못했습니다.'),
  })

  const deleteMut = useMutation({
    mutationFn: () => adminAiNewsApi.deleteArticle(articleId!, '관리자 화면에서 삭제'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'ai-news'] }); navigate('/admin/community/ai-news', { replace: true }) },
  })

  const canPublish = !detail || !['PUBLISHED', 'DELETED', 'REJECTED', 'SKIPPED_DUPLICATE', 'REWRITE_REQUESTED'].includes(detail.status)

  const cancelScheduleMut = useMutation({
    mutationFn: () => adminAiNewsApi.cancelSchedule(articleId!),
    onSuccess: (next) => {
      setScheduledAt('')
      qc.invalidateQueries({ queryKey: ['admin', 'ai-news'] })
      qc.setQueryData(['admin', 'ai-news', 'article', articleId], next)
    },
    onError: (e) => setError(e instanceof Error ? e.message : '예약발행을 취소하지 못했습니다.'),
  })

  const rewriteMut = useMutation({
    mutationFn: () => adminAiNewsApi.requestRewrite(articleId!, rewritePrompt.trim()),
    onSuccess: (next) => {
      setRewritePrompt('')
      qc.invalidateQueries({ queryKey: ['admin', 'ai-news'] })
      qc.setQueryData(['admin', 'ai-news', 'article', articleId], next)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'AI 재작성을 요청하지 못했습니다.'),
  })

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-primary-800" /></div>
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <AdminPageHeader
        breadcrumbs={[{ label: '커뮤니티' }, { label: '소식(AI)', to: '/admin/community/ai-news' }, { label: isEdit ? '수정' : '작성' }]}
        backTo="/admin/community/ai-news" useBackToPath title={isEdit ? 'AI 소식 수정' : 'AI 소식 작성'}
      />
      {!isEdit && (
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-neutral-100 p-1.5">
          <button type="button" onClick={() => setSearchParams({}, { replace: true })}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              writeMode === 'manual' ? 'bg-white text-primary-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
            }`}>
            직접작성
          </button>
          <button type="button" onClick={() => setSearchParams({ mode: 'ai' }, { replace: true })}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              writeMode === 'ai' ? 'bg-white text-primary-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
            }`}>
            AI요청
          </button>
        </div>
      )}
      {!isEdit && writeMode === 'ai' ? <AdminAiNewsRequestPanel /> : (
      <div className="space-y-5 rounded-xl bg-white p-5 shadow-sm">
        <RequiredFieldsNotice admin />
        {detail && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
            상태: <strong>{detail.status}</strong> · 중복 키: {detail.dedupeKey}
            {detail.failureReason && <p className="mt-1 text-red-600">검토 사유: {detail.failureReason}</p>}
            {detail.duplicateReason && <p className="mt-1 text-amber-700">중복 판정: {detail.duplicateReason}</p>}
            {detail.rewritePrompt && <p className="mt-1 text-violet-700">재작성 추가 프롬프트: {detail.rewritePrompt}</p>}
            {detail.status === 'SCHEDULED' && detail.scheduledAt && (
              <p className="mt-1 text-blue-700">예약 발행: {new Date(detail.scheduledAt).toLocaleString('ko-KR')}</p>
            )}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="글 유형">
            <select disabled={isEdit} value={articleType} onChange={(e) => setArticleType(e.target.value as AiNewsArticleType)} className={inputCls}>
              <option value="RELEASE_NEWS">출시·국내 소식</option><option value="TIP_INFO">팁 및 정보</option>
            </select>
          </Field>
          <Field label="주종">
            <select value={category} onChange={(e) => setCategory(e.target.value as AiNewsCategory)} className={inputCls}>
              <option value="WHISKY">위스키</option><option value="WINE">와인</option><option value="COGNAC">꼬냑</option>
            </select>
          </Field>
          <Field label="말머리">
            <select value={prefixId} onChange={(e) => setPrefixId(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
              <option value="">없음</option>{prefixes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="정보 주제">
            <select disabled={isEdit || articleType !== 'TIP_INFO'} value={topicId} onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
              <option value="">직접 작성</option>{topics?.content.map((t) => <option key={t.id} value={t.id}>{t.title} ({t.status})</option>)}
            </select>
          </Field>
        </div>
        <Field label="제목" required>
          <input required aria-required="true" maxLength={MAX_TITLE_LENGTH} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="제목을 입력하세요." />
          <p className="mt-1 text-right text-xs text-neutral-400">{title.length}/{MAX_TITLE_LENGTH}</p>
        </Field>
        <Field label="해시태그">
          <input value={hashtagInput} onChange={(event) => setHashtagInput(event.target.value)}
            className={inputCls} placeholder="#위스키 #신제품 #증류소" />
          <p className="mt-1 text-xs text-neutral-500">
            쉼표 또는 공백으로 구분합니다. 최대 {MAX_HASHTAGS}개이며, AI 초안도 관련 해시태그를 함께 제안합니다.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {parseHashtagInput(hashtagInput).map((hashtag) => (
              <span key={hashtag.toLocaleLowerCase()} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">#{hashtag}</span>
            ))}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="신뢰도 (0~1)"><input type="number" min="0" max="1" step="0.01" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className={inputCls} /></Field>
          <Field label="의미 중복 지문"><input value={semanticFingerprint} onChange={(e) => setSemanticFingerprint(e.target.value)} className={inputCls} placeholder="동일 주제 판별용 문구" /></Field>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-neutral-700">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> 소식 게시판 상단 고정
        </label>
        <div aria-required="true">
          <p className="mb-1.5 text-xs font-semibold text-neutral-600">본문 <RequiredMark /></p>
          <PostEditor value={content} onChange={setContent} placeholder="내용을 입력하세요. 이미지와 영상을 업로드할 수 있습니다." onImageError={setError} onVideoError={setError} />
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-800">출처 URL</p>
              <p className="mt-0.5 text-xs text-neutral-500">저장된 URL은 발행 게시글 본문 최하단에 표시됩니다.</p>
            </div>
            <button type="button"
              onClick={() => setSourceUrls((current) => [...current, ''])}
              className="shrink-0 rounded-lg border border-primary-200 px-3 py-1.5 text-sm font-semibold text-primary-800 hover:bg-primary-50">
              + 추가
            </button>
          </div>
          {sourceUrls.length === 0 ? (
            <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-4 text-center text-xs text-neutral-400">등록된 출처 URL이 없습니다.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {sourceUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="url" maxLength={1500} value={url}
                    onChange={(e) => setSourceUrls((current) => current.map((item, itemIndex) => itemIndex === index ? e.target.value : item))}
                    className={inputCls} placeholder="https://example.com/news/article" aria-label={`출처 URL ${index + 1}`} />
                  <button type="button" onClick={() => setSourceUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 text-lg text-red-500 hover:bg-red-50"
                    aria-label={`출처 URL ${index + 1} 삭제`} title="출처 URL 삭제">−</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {canPublish && <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-blue-900">예약 발행</p>
            <button type="button" onClick={() => setScheduledAt(toLocalInputValue(new Date()))}
              className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
              지금
            </button>
          </div>
          <p className="mt-1 text-xs text-blue-700">년·월·일과 시·분을 지정하면 해당 시각 이후 서버가 자동 발행합니다.</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <ScheduledDateTimeFields value={scheduledAt} onChange={setScheduledAt} />
            {detail?.status === 'SCHEDULED' && (
              <button type="button" disabled={cancelScheduleMut.isPending} onClick={() => {
                if (window.confirm('예약발행을 취소하고 검토 대기 상태로 변경하시겠습니까?')) cancelScheduleMut.mutate()
              }} className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                예약 취소
              </button>
            )}
          </div>
        </div>}
        {detail && !['PUBLISHED', 'SCHEDULED', 'SKIPPED_DUPLICATE', 'REWRITE_REQUESTED'].includes(detail.status) && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
            <p className="text-sm font-semibold text-violet-900">AI 재작성 요청 <RequiredMark /></p>
            <p className="mt-1 text-xs leading-5 text-violet-700">
              아래 추가 프롬프트는 이 원고 재작성에만 적용됩니다. 다음 AI 자동화 실행에서 기존 제목과 본문을 바탕으로 다시 작성하며, 결과는 검토 대기로 저장됩니다.
            </p>
            <textarea required aria-required="true" maxLength={4000} rows={4} value={rewritePrompt} onChange={(e) => setRewritePrompt(e.target.value)}
              className={`${inputCls} mt-3 resize-y`} placeholder="예: 초보자가 이해하기 쉽게 용어 설명을 보강하고, 각 단락에 구체적인 예시를 추가해주세요." />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-violet-500">{rewritePrompt.length}/4000</span>
              <button type="button" disabled={!rewritePrompt.trim() || rewriteMut.isPending} onClick={() => {
                if (window.confirm('이 원고를 AI 재작성 대기 상태로 변경하시겠습니까?')) rewriteMut.mutate()
              }} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50">
                AI 재작성 요청
              </button>
            </div>
          </div>
        )}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          {isEdit ? <button type="button" onClick={() => { if (window.confirm('삭제하시겠습니까?')) deleteMut.mutate() }} disabled={deleteMut.isPending} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">삭제</button> : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={() => save.mutate('save')} disabled={save.isPending} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">저장</button>
            {canPublish && <button type="button" onClick={() => save.mutate('schedule')} disabled={save.isPending || !scheduledAt} className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">예약 발행</button>}
            {canPublish && <button type="button" onClick={() => save.mutate('publish')} disabled={save.isPending} className="rounded-lg bg-primary-800 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-900">즉시 발행</button>}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

function Field({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) {
  return <label className="block" aria-required={required || undefined}><span className="mb-1.5 block text-xs font-semibold text-neutral-600">{label}{required && <RequiredMark />}</span>{children}</label>
}
const inputCls = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100'

function ScheduledDateTimeFields({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const date = value.slice(0, 10)
  const time = value.slice(11, 16)
  const now = new Date()

  const updateDate = (nextDate: string) => {
    if (!nextDate) {
      onChange('')
      return
    }
    onChange(`${nextDate}T${time || toLocalTimeValue(now)}`)
  }
  const updateTime = (nextTime: string) => {
    if (!nextTime) {
      onChange('')
      return
    }
    onChange(`${date || toLocalDateValue(now)}T${nextTime}`)
  }

  return (
    <div className="grid min-w-64 flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(10rem,1fr)_8rem]">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-blue-800">날짜</span>
        <input type="date" min={toLocalDateValue(now)} max="9999-12-31" value={date}
          onClick={openPicker} onChange={(e) => updateDate(e.target.value)} className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-blue-800">시간</span>
        <input type="time" step="60" value={time}
          onClick={openPicker} onChange={(e) => updateTime(e.target.value)} className={inputCls} />
      </label>
    </div>
  )
}

function openPicker(event: MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker()
  } catch {
    // showPicker 미지원 브라우저는 기본 입력 동작을 사용한다.
  }
}

function buildSourceEvidence(sourceUrls: string[]): AiNewsSourceEvidence[] {
  const seenDomains = new Set<string>()
  return sourceUrls
    .map((url) => url.trim())
    .filter(Boolean)
    .map((sourceUrl) => {
      let parsed: URL
      try {
        parsed = new URL(sourceUrl)
      } catch {
        throw new Error(`올바른 출처 URL을 입력하세요: ${sourceUrl}`)
      }
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
        throw new Error(`http 또는 https 출처 URL만 등록할 수 있습니다: ${sourceUrl}`)
      }
      const domain = parsed.hostname.toLowerCase().replace(/^www\./, '')
      if (seenDomains.has(domain)) {
        throw new Error(`동일한 도메인의 출처 URL은 하나만 등록할 수 있습니다: ${domain}`)
      }
      seenDomains.add(domain)
      return {
        sourceUrl,
        canonicalUrl: sourceUrl,
        domain,
        sourceType: 'UNAPPROVED' as const,
      }
    })
}

function toLocalInputValue(date: Date) {
  return `${toLocalDateValue(date)}T${toLocalTimeValue(date)}`
}

function toLocalDateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function toLocalTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
