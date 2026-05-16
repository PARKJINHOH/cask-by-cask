import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePostPrefixes } from '@/domain/community/hooks/usePosts'
import { usePostDetail } from '@/domain/community/hooks/usePostDetail'
import { communityApi } from '@/domain/community/api/communityApi'
import PostEditor from '@/domain/community/components/PostEditor'
import type { BoardType } from '@/domain/community/types/community.types'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'

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
  const [pollEnabled, setPollEnabled] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollMultiple, setPollMultiple] = useState(false)
  const [pollEndsAt, setPollEndsAt] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [seriesId, setSeriesId] = useState<number | ''>('')

  useEffect(() => {
    if (existingPost && isEdit) {
      setPrefixId(existingPost.prefix?.id ?? '')
      setTitle(existingPost.title)
      setContent(existingPost.contentSanitized ?? '')
    }
  }, [existingPost, isEdit])

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return communityApi.updatePost(postId!, {
          prefixId: prefixId !== '' ? prefixId : undefined,
          title,
          content,
        })
      }
      const validOptions = pollOptions.filter((o) => o.trim())
      return communityApi.createPost({
        boardType,
        prefixId: prefixId !== '' ? prefixId : undefined,
        title,
        content,
        isAnonymous: boardType === 'FREE' ? isAnonymous : false,
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
      navigate(newId ? `/community/${boardPath}/${newId}` : `/community/${boardPath}`, { replace: true })
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { code?: string; detectedWords?: string[] } } })?.response?.data
      if (data?.code === 'BAD_WORD_DETECTED') {
        showToast(`욕설이 포함되어 있습니다: ${data.detectedWords?.join(', ')}`, 'error')
      } else {
        showToast(t('common.error'), 'error')
      }
    },
  })

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 &&
    (!pollEnabled || (pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2))

  const addPollOption = () => {
    if (pollOptions.length < MAX_POLL_OPTIONS) setPollOptions((p) => [...p, ''])
  }
  const removePollOption = (i: number) => {
    if (pollOptions.length > 2) setPollOptions((p) => p.filter((_, idx) => idx !== i))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Toast toasts={toasts} onRemove={removeToast} />

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
        {/* 말머리 + 익명 */}
        <div className="flex flex-wrap items-center gap-3">
          {prefixes.length > 0 && (
            <select
              value={prefixId}
              onChange={(e) => setPrefixId(e.target.value !== '' ? Number(e.target.value) : '')}
              className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            >
              <option value="">말머리 없음</option>
              {prefixes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {boardType === 'FREE' && !isEdit && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-400"
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
        </div>

        {/* 제목 */}
        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
            placeholder="제목을 입력하세요"
            className="w-full px-4 py-3 text-base border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 pr-16"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 tabular-nums">
            {title.length}/{MAX_TITLE}
          </span>
        </div>

        {/* 본문 */}
        <PostEditor
          value={content}
          onChange={setContent}
          placeholder="내용을 입력하세요. YouTube/Vimeo URL을 붙여넣으면 자동 임베드됩니다."
          onImageError={(msg) => showToast(msg, 'error')}
        />

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
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                <div className="flex items-center gap-6">
                  {[false, true].map((multi) => (
                    <label key={String(multi)} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={pollMultiple === multi} onChange={() => setPollMultiple(multi)}
                        className="text-primary-600 focus:ring-primary-400" />
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
                        className="flex-1 px-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
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
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                      + 선택지 추가
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">종료일시 (선택)</label>
                  <input type="datetime-local" value={pollEndsAt} onChange={(e) => setPollEndsAt(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300" />
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
            className="px-6 py-2.5 text-sm font-medium rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? '저장 중...' : isEdit ? t('common.save') : t('board.write')}
          </button>
        </div>
      </div>
    </div>
  )
}
