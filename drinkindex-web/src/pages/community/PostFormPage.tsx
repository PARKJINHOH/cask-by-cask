import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePostPrefixes } from '@/domain/community/hooks/usePosts'
import { usePostDetail } from '@/domain/community/hooks/usePostDetail'
import { communityApi } from '@/domain/community/api/communityApi'
import PostEditor from '@/domain/community/components/PostEditor'
import AdultBadge from '@/shared/components/AdultBadge'
import type { BoardType } from '@/domain/community/types/community.types'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'
import SeoMeta from '@/shared/components/SeoMeta'
import Breadcrumb from '@/shared/components/Breadcrumb'
import { draftApi } from '@/shared/api/draftApi'
import DraftSavedNotice from '@/shared/components/DraftSavedNotice'
import DraftListModal from '@/shared/components/DraftListModal'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useMe } from '@/domain/user/hooks/useUser'

// 게시판 공지(고정글) 설정 가능 역할
const PIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PARTNER']

// 성인인증이 필요한 자유게시판 말머리 — 주류 나눔 탭
const SHARING_PREFIX_NAME = '나눔'

const MAX_TITLE = 300
const MAX_POLL_OPTIONS = 10

export default function PostFormPage() {
  const { boardType: boardTypeParam, id } = useParams<{ boardType: string; id: string }>()
  const postId = id ? Number(id) : undefined
  const isEdit = !!postId
  const boardType = (boardTypeParam === 'notice' ? 'NOTICE' : 'FREE') as BoardType
  const boardPath = boardTypeParam ?? 'free'

  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toasts, showToast, removeToast } = useToast()
  const { user } = useAuthStore()
  const canPin = PIN_ROLES.includes(user?.role ?? '')
  const { data: me } = useMe()

  const { data: existingPost } = usePostDetail(postId ?? 0)
  const { data: prefixes = [] } = usePostPrefixes(boardType)
  const { data: mySeries = [] } = useQuery({
    queryKey: ['series', 'mine', boardType],
    queryFn: () => communityApi.getMySeries(boardType).then((r) => r.data.data ?? []),
    staleTime: 60_000,
  })

  const [prefixId, setPrefixId] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [adultOnly, setAdultOnly] = useState(false)
  const [pollEnabled, setPollEnabled] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollMultiple, setPollMultiple] = useState(false)
  const [pollEndsAt, setPollEndsAt] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [seriesId, setSeriesId] = useState<number | ''>('')

  // ── 임시저장 (신규 작성 시에만) ──
  const draftKey = `POST:${boardType}`
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  // 목록에서 불러온 임시저장 id (있으면 임시저장 시 해당 항목 갱신)
  const [currentDraftId, setCurrentDraftId] = useState<number | undefined>(undefined)
  const [draftListOpen, setDraftListOpen] = useState(false)

  // 수정 모드: 기존 게시글 값 복원
  useEffect(() => {
    if (existingPost && isEdit) {
      setPrefixId(existingPost.prefix?.id ?? '')
      setTitle(existingPost.title)
      setContent(existingPost.contentSanitized ?? '')
      setIsPinned(existingPost.isPinned)
      setAdultOnly(existingPost.adultOnly ?? false)
    }
  }, [existingPost, isEdit])

  const saveDraft = async () => {
    if (!title.trim() && !content.trim()) {
      showToast('임시저장할 내용이 없습니다.', 'error')
      return
    }
    setIsSavingDraft(true)
    try {
      const res = await draftApi.save({
        id: currentDraftId,
        draftKey,
        title,
        content,
        meta: JSON.stringify({ prefixId: prefixId !== '' ? prefixId : null, isAnonymous }),
      })
      const saved = res.data.data
      if (saved?.id) setCurrentDraftId(saved.id)
      setLastSavedAt(saved?.updatedAt ?? new Date().toISOString())
      showToast('임시저장되었습니다.', 'success')
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (code === 'DRAFT_003') {
        showToast(msg ?? '임시저장 개수가 가득 찼습니다.', 'error')
      } else {
        showToast(t('common.error'), 'error')
      }
    } finally {
      setIsSavingDraft(false)
    }
  }

  // 목록에서 임시저장 불러오기
  const loadDraft = (d: { id: number; title: string | null; content: string | null; meta: string | null }) => {
    setCurrentDraftId(d.id)
    setTitle(d.title ?? '')
    setContent(d.content ?? '')
    if (d.meta) {
      try {
        const m = JSON.parse(d.meta) as { prefixId?: number | null; isAnonymous?: boolean }
        if (m.prefixId != null) setPrefixId(m.prefixId)
        if (typeof m.isAnonymous === 'boolean') setIsAnonymous(m.isAnonymous)
      } catch { /* meta 파싱 실패 무시 */ }
    }
    showToast('임시저장을 불러왔습니다.', 'success')
  }

  // 신규 작성: 말머리 목록이 로드되면 "일반"을 기본 선택
  useEffect(() => {
    if (!isEdit && prefixes.length > 0 && prefixId === '') {
      const defaultPrefix = prefixes.find((p) => p.name === '일반') ?? prefixes[0]
      setPrefixId(defaultPrefix.id)
    }
  }, [prefixes])

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return communityApi.updatePost(postId!, {
          prefixId: prefixId !== '' ? prefixId : undefined,
          title,
          content,
          adultOnly: isSharingSelected ? adultOnly : false,
          ...(canPin ? { isPinned } : {}),
        })
      }
      const validOptions = pollOptions.filter((o) => o.trim())
      return communityApi.createPost({
        boardType,
        prefixId: prefixId !== '' ? prefixId : undefined,
        title,
        content,
        isAnonymous: boardType === 'FREE' ? isAnonymous : false,
        adultOnly: isSharingSelected ? adultOnly : false,
        ...(canPin ? { isPinned } : {}),
        poll: pollEnabled && pollQuestion.trim() && validOptions.length >= 2 ? {
          question: pollQuestion.trim(),
          isMultipleChoice: pollMultiple,
          endsAt: pollEndsAt || null,
          options: validOptions.map((o, i) => ({ optionText: o.trim(), sortOrder: i })),
        } : undefined,
        seriesId: seriesId !== '' ? seriesId : undefined,
      })
    },
    onSuccess: (res) => {
      const newId = res.data.data?.id
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      // 게시 완료 → 불러온/저장된 임시저장 삭제
      if (!isEdit && currentDraftId) draftApi.remove(currentDraftId).catch(() => { /* 무시 */ })
      navigate(newId ? `/community/${boardPath}/${newId}` : `/community/${boardPath}`, { replace: true })
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { code?: string; detectedWords?: string[] } } })?.response?.data
      if (data?.code === 'BAD_WORD_DETECTED') {
        showToast(`욕설이 포함되어 있습니다: ${data.detectedWords?.join(', ')}`, 'error')
      } else if (data?.code === 'USER_023') {
        showToast(t('post.adultGate.writeToast'), 'error')
      } else {
        showToast(t('common.error'), 'error')
      }
    },
  })

  // 나눔 말머리에서만 '성인 전용' 체크박스 노출. 다른 말머리로 바꾸면 자동 해제.
  const selectedPrefixName = prefixes.find((p) => p.id === prefixId)?.name
  const isSharingSelected = selectedPrefixName === SHARING_PREFIX_NAME
  useEffect(() => {
    if (!isSharingSelected && adultOnly) setAdultOnly(false)
  }, [isSharingSelected, adultOnly])

  // 성인 전용(주류) 글은 작성·수정 시 성인인증 필요
  const needsAdultVerify = adultOnly && me?.adultVerified !== true

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 &&
    prefixId !== '' && !needsAdultVerify &&
    (!pollEnabled || (pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2))

  const addPollOption = () => {
    if (pollOptions.length < MAX_POLL_OPTIONS) setPollOptions((p) => [...p, ''])
  }
  const removePollOption = (i: number) => {
    if (pollOptions.length > 2) setPollOptions((p) => p.filter((_, idx) => idx !== i))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SeoMeta title={isEdit ? '게시글 수정' : '게시글 작성'} description="DrinkIndex 커뮤니티 게시글 작성." noindex />
      <Toast toasts={toasts} onRemove={removeToast} />
      <DraftListModal
        open={draftListOpen}
        draftKey={draftKey}
        onClose={() => setDraftListOpen(false)}
        onLoad={loadDraft}
        onError={(msg) => showToast(msg, 'error')}
      />

      <Breadcrumb
        className="mb-2"
        items={[
          { label: t('menu.community'), to: '/community/all' },
          {
            label: boardType === 'NOTICE' ? t('menu.communityNews') : t('menu.communityBoard'),
            to: `/community/${boardPath}`,
          },
        ]}
      />

      <div className="flex items-center gap-3 mb-6">
        <Link to={`/community/${boardPath}`} className="text-neutral-400 hover:text-neutral-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-neutral-900">
          {isEdit ? t('post.edit') : t('board.write')}
        </h1>
      </div>

      <div className="space-y-5">
        {/* 제목 */}
        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
            placeholder="제목을 입력하세요"
            className="w-full px-4 py-3 text-base border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 pr-16"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 tabular-nums">
            {title.length}/{MAX_TITLE}
          </span>
        </div>

        {/* 말머리 탭 (제목 아래, 말머리가 있을 때만) */}
        {prefixes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {prefixes.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPrefixId(prefixId === p.id ? '' : p.id)}
                className={[
                  'px-4 py-1.5 text-sm font-medium rounded-full border transition-colors',
                  prefixId === p.id
                    ? 'bg-primary-800 text-white border-primary-800'
                    : 'border-neutral-300 text-neutral-600 hover:border-neutral-400',
                ].join(' ')}
                style={prefixId !== p.id && p.colorHex
                  ? { borderColor: p.colorHex, color: p.colorHex }
                  : undefined}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* 나눔 안내 — 주류 나눔은 성인인증 오픈 후 제공 예정 (성인전용 체크박스는 추후 오픈) */}
        {isSharingSelected && (
          <p className="flex items-center gap-1.5 text-xs text-neutral-500">
            <AdultBadge className="w-4 h-4 text-[9px]" />
            {t('board.adultOnlySoon')}
          </p>
        )}

        {/* 성인 전용 글 — 미인증 시 작성 차단 + 인증 경로 안내 */}
        {needsAdultVerify && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800">{t('post.adultGate.writeTitle')}</p>
            <p className="text-xs text-amber-700 leading-relaxed">{t('post.adultGate.writeDesc')}</p>
            <p className="text-xs text-amber-700">{t('post.adultGate.path')}</p>
            <Link
              to="/mypage?tab=settings"
              className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 text-sm font-medium rounded-lg
                bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              {t('post.adultGate.goVerify')}
            </Link>
          </div>
        )}

        {/* 익명 (FREE 게시판 신규 작성 시) */}
        {boardType === 'FREE' && !isEdit && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-primary-800 focus:ring-primary-400"
              />
              {t('board.anonymous')}
            </label>
            <div className="relative group">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-neutral-200 text-neutral-500 text-xs cursor-default">?</span>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10 w-56 px-3 py-2 bg-neutral-800 text-white text-xs rounded-lg shadow-lg leading-relaxed whitespace-normal">
                닉네임만 &apos;익명&apos;으로 표시됩니다. 게시글 내용은 그대로 공개되며, 본인은 언제든지 수정·삭제할 수 있습니다.
                <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-neutral-800" />
              </div>
            </div>
          </div>
        )}

        {/* 게시판 공지(고정글) — 관리자/파트너만 */}
        {canPin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 accent-amber-600 focus:ring-amber-400"
              />
              <span className="text-sm font-medium text-neutral-800">{t('board.pinAsNotice')}</span>
            </label>
            <p className="text-xs text-neutral-500 mt-1 ml-7">{t('board.pinAsNoticeHelp')}</p>
          </div>
        )}

        {/* 본문 */}
        <div>
          <PostEditor
            value={content}
            onChange={setContent}
            placeholder="내용을 입력하세요. YouTube/Vimeo URL을 붙여넣으면 자동 임베드됩니다."
            onImageError={(msg) => showToast(msg, 'error')}
          />
          {/* 임시저장 (신규 작성 시) */}
          {!isEdit && (
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={isSavingDraft}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                  border border-neutral-300 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                {isSavingDraft ? '저장 중...' : '임시저장'}
              </button>
              <button
                type="button"
                onClick={() => setDraftListOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                  border border-neutral-300 text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                임시저장목록
              </button>
              <DraftSavedNotice savedAt={lastSavedAt} />
            </div>
          )}
        </div>

        {/* 투표 */}
        {!isEdit && (
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setPollEnabled((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                투표 {pollEnabled ? '제거' : '추가'}
              </span>
              <span className="text-neutral-400 text-xs">{pollEnabled ? '▲' : '▼'}</span>
            </button>

            {pollEnabled && (
              <div className="px-4 pb-4 pt-3 space-y-3 border-t border-neutral-100 bg-neutral-50">
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="투표 질문을 입력하세요"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                <div className="flex items-center gap-6">
                  {[false, true].map((multi) => (
                    <label key={String(multi)} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={pollMultiple === multi} onChange={() => setPollMultiple(multi)}
                        className="text-primary-800 focus:ring-primary-400" />
                      {multi ? '복수 선택' : '단일 선택'}
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text" value={opt}
                        onChange={(e) => setPollOptions((p) => p.map((o, idx) => idx === i ? e.target.value : o))}
                        placeholder={`선택지 ${i + 1}`}
                        className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                      {pollOptions.length > 2 && (
                        <button type="button" onClick={() => removePollOption(i)}
                          className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors text-lg leading-none">
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < MAX_POLL_OPTIONS && (
                    <button type="button" onClick={addPollOption}
                      className="text-xs text-primary-800 hover:text-primary-900 font-medium">
                      + 선택지 추가
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">종료일시 (선택)</label>
                  <input type="datetime-local" value={pollEndsAt} onChange={(e) => setPollEndsAt(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 시리즈 */}
        {!isEdit && mySeries.length > 0 && (
          <div className="flex items-center gap-3 border border-neutral-200 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <select
              value={seriesId}
              onChange={(e) => setSeriesId(e.target.value !== '' ? Number(e.target.value) : '')}
              className="flex-1 text-sm bg-transparent focus:outline-none"
            >
              <option value="">시리즈에 추가 안 함</option>
              {mySeries.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
        )}

        {/* 제출 버튼 */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to={`/community/${boardPath}`}
            className="px-5 py-2.5 text-sm font-medium border border-neutral-200 rounded-xl text-neutral-600 hover:bg-neutral-50 transition-colors">
            {t('common.cancel')}
          </Link>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="px-6 py-2.5 text-sm font-medium rounded-xl bg-primary-800 text-white hover:bg-primary-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? '저장 중...' : isEdit ? t('common.save') : t('board.write')}
          </button>
        </div>
      </div>
    </div>
  )
}
