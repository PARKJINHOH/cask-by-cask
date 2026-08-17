import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritAutocompleteItem } from '@/domain/spirit/types/spirit.types'
import { youtubeApi } from '@/domain/youtube/api/youtubeApi'
import type {
  AdminYoutubeVideo,
  YoutubeAvailabilityResult,
  YoutubeSpiritTag,
  YoutubeVideoType,
} from '@/domain/youtube/types/youtube.types'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { extractApiErrorMessage } from '@/shared/utils/apiError'

/** 관리자 유튜브 영상 관리 — 노출·고정·유형·주류 태그. */
export default function AdminYoutubeVideoPanel() {
  const queryClient = useQueryClient()
  const [channelId, setChannelId] = useState<number | undefined>(undefined)
  const [visible, setVisible] = useState<'' | 'true' | 'false'>('')
  const [keywordDraft, setKeywordDraft] = useState('')
  const keyword = useDebouncedValue(keywordDraft)
  const [page, setPage] = useState(0)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [availabilityResult, setAvailabilityResult] = useState<YoutubeAvailabilityResult | null>(null)

  const { data: channelPage } = useQuery({
    queryKey: ['admin', 'youtube', 'channels'],
    queryFn: () => youtubeApi.adminChannels({ size: 100 }),
  })
  const channels = channelPage?.content ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'youtube', 'videos', channelId, visible, keyword, page],
    queryFn: () => youtubeApi.adminVideos({
      channelId,
      visible: visible === '' ? undefined : visible === 'true',
      keyword: keyword || undefined,
      page,
    }),
  })
  const videos = data?.content ?? []

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'youtube', 'videos'] })
    queryClient.invalidateQueries({ queryKey: ['youtubeVideos'] })
    queryClient.invalidateQueries({ queryKey: ['youtubeVideo'] })
  }

  const availability = useMutation({
    mutationFn: youtubeApi.checkAvailability,
    onMutate: () => { setError(null); setAvailabilityResult(null) },
    onSuccess: (result) => { setAvailabilityResult(result); invalidate() },
    onError: (cause) => setError(extractApiErrorMessage(cause, '점검에 실패했습니다.')),
  })

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof youtubeApi.updateVideo>[1] }) =>
      youtubeApi.updateVideo(id, payload),
    onMutate: () => setError(null),
    onSuccess: invalidate,
    onError: (cause) => setError(extractApiErrorMessage(cause, '저장에 실패했습니다.')),
  })

  return (
    <section className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {availabilityResult && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          <p className="font-semibold text-neutral-800">
            점검 완료 — {availabilityResult.checked}편 확인, 자동 숨김{' '}
            {availabilityResult.hidden}편, 복구 {availabilityResult.restored}편
          </p>
          {availabilityResult.skipped > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              {availabilityResult.skipped}편은 유튜브 응답을 받지 못해 그대로 두었습니다
              (다음 점검에서 먼저 확인합니다).
            </p>
          )}
          <p className="mt-1 text-xs text-neutral-500">
            현재 자동 숨김 상태 {availabilityResult.autoHiddenTotal}편
          </p>
        </div>
      )}

      <VideoAddForm channels={channels} onDone={invalidate} onError={setError} />

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs leading-5 text-neutral-500">
          유튜브에서 삭제·비공개된 영상은 매일 새벽 자동으로 갤러리에서 내려갑니다.
          다시 공개되면 자동으로 복구됩니다.
        </p>
        <button
          type="button"
          disabled={availability.isPending}
          onClick={() => availability.mutate()}
          className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-50"
        >
          {availability.isPending ? '점검 중...' : '지금 가용성 점검'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={channelId ?? ''}
          onChange={(event) => { setChannelId(Number(event.target.value) || undefined); setPage(0) }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">전체 채널</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>{channel.title}</option>
          ))}
        </select>
        <select
          value={visible}
          onChange={(event) => { setVisible(event.target.value as '' | 'true' | 'false'); setPage(0) }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">전체 상태</option>
          <option value="true">노출 중</option>
          <option value="false">숨김</option>
        </select>
        <input
          value={keywordDraft}
          onChange={(event) => { setKeywordDraft(event.target.value); setPage(0) }}
          placeholder="제목 검색"
          className="ml-auto w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:w-56"
        />
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-neutral-400">불러오는 중...</p>
      ) : videos.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white py-12 text-center text-sm text-neutral-400">
          영상이 없습니다.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {videos.map((video) => (
            <VideoRow
              key={video.id}
              video={video}
              expanded={editingId === video.id}
              onToggleExpand={() => setEditingId((current) => (current === video.id ? null : video.id))}
              onUpdate={(payload) => update.mutate({ id: video.id, payload })}
              pending={update.isPending}
            />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">이전</button>
          <span className="px-3 py-2 text-sm">{page + 1} / {data.totalPages}</span>
          <button type="button" disabled={data.last} onClick={() => setPage((value) => value + 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">다음</button>
        </div>
      )}
    </section>
  )
}

function VideoRow({ video, expanded, onToggleExpand, onUpdate, pending }: {
  video: AdminYoutubeVideo
  expanded: boolean
  onToggleExpand: () => void
  onUpdate: (payload: Parameters<typeof youtubeApi.updateVideo>[1]) => void
  pending: boolean
}) {
  const hide = () => {
    const reason = window.prompt('숨김 사유 (관리용, 생략 가능)') ?? ''
    onUpdate({ visible: false, hiddenReason: reason.trim() || undefined })
  }

  return (
    <div className="border-b border-neutral-100 p-4 last:border-0">
      <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
        <img
          src={`https://i.ytimg.com/vi/${video.videoKey}/mqdefault.jpg`}
          alt=""
          referrerPolicy="no-referrer"
          className={`w-40 rounded-lg bg-neutral-100 object-cover ${
            video.videoType === 'SHORTS' ? 'aspect-[9/16] w-24' : 'aspect-video'
          }`}
        />
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900">{video.title}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {video.channelTitle} · {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
            {' · '}{video.videoType === 'SHORTS' ? '숏츠' : '일반 영상'}
            {' · '}{video.source === 'MANUAL' ? '직접 등록' : '자동 수집'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {/* 자동 숨김은 관리자 숨김과 뜻이 다르다 — 영상이 유튜브에서 사라진 상태라
                되살릴 수 있는 것이 아니므로 색을 달리해 구분한다. */}
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              video.visible
                ? 'bg-emerald-100 text-emerald-700'
                : video.autoHidden
                  ? 'bg-red-100 text-red-700'
                  : 'bg-neutral-100 text-neutral-500'
            }`}>
              {video.visible ? '노출 중' : video.autoHidden ? '재생 불가 · 자동 숨김' : '숨김'}
            </span>
            {video.pinned && (
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800">
                상단 고정
              </span>
            )}
            {video.spiritTags.map((tag) => (
              <span key={tag.spiritId}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {tag.nameKo}
              </span>
            ))}
          </div>
          {video.hiddenReason && (
            <p className="mt-1.5 text-xs text-neutral-400">사유: {video.hiddenReason}</p>
          )}
          {video.lastCheckedAt && (
            <p className="mt-0.5 text-xs text-neutral-400">
              마지막 점검 {new Date(video.lastCheckedAt).toLocaleString('ko-KR')}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <a href={video.watchUrl} target="_blank" rel="noopener noreferrer"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700">
            열기
          </a>
          <button type="button" disabled={pending}
            onClick={() => onUpdate({ pinned: !video.pinned })}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-50">
            {video.pinned ? '고정 해제' : '상단 고정'}
          </button>
          <button type="button" disabled={pending}
            onClick={() => (video.visible ? hide() : onUpdate({ visible: true }))}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-50">
            {video.visible ? '숨기기' : '다시 노출'}
          </button>
          <button type="button" onClick={onToggleExpand}
            className="rounded-lg bg-primary-800 px-3 py-2 text-xs font-semibold text-white">
            {expanded ? '닫기' : '태그·유형'}
          </button>
        </div>
      </div>

      {expanded && (
        <VideoDetailEditor video={video} onUpdate={onUpdate} pending={pending} />
      )}
    </div>
  )
}

/** 주류 태그와 영상 유형 편집. 펼쳤을 때만 그린다(목록마다 자동완성 상태를 들고 있지 않게). */
function VideoDetailEditor({ video, onUpdate, pending }: {
  video: AdminYoutubeVideo
  onUpdate: (payload: Parameters<typeof youtubeApi.updateVideo>[1]) => void
  pending: boolean
}) {
  const [tags, setTags] = useState<YoutubeSpiritTag[]>(video.spiritTags)
  const [videoType, setVideoType] = useState<YoutubeVideoType>(video.videoType)
  const [keyword, setKeyword] = useState('')
  const debounced = useDebouncedValue(keyword)
  const [results, setResults] = useState<SpiritAutocompleteItem[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([])
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    spiritApi.autocomplete(debounced.trim(), controller.signal)
      .then((response) => setResults(response.data.data ?? []))
      // 사용자가 계속 입력하면 직전 요청은 취소된다 — 오류가 아니다.
      .catch(() => undefined)
    return () => controller.abort()
  }, [debounced])

  const addTag = (item: SpiritAutocompleteItem) => {
    setTags((current) => (
      current.some((tag) => tag.spiritId === item.id)
        ? current
        : [...current, {
          spiritId: item.id,
          nameKo: item.nameKo,
          nameEn: item.nameEn,
          category: item.category,
        }]
    ))
    setKeyword('')
    setResults([])
  }

  return (
    <div className="mt-4 space-y-4 rounded-lg bg-neutral-50 p-4">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-neutral-700">영상 유형</p>
        <div className="flex gap-2">
          {(['VIDEO', 'SHORTS'] as YoutubeVideoType[]).map((value) => (
            <button key={value} type="button" onClick={() => setVideoType(value)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                videoType === value
                  ? 'bg-neutral-900 text-white'
                  : 'border border-neutral-300 bg-white text-neutral-600'
              }`}>
              {value === 'SHORTS' ? '숏츠 (세로)' : '일반 영상 (가로)'}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs leading-5 text-neutral-500">
          자동 수집이 유형을 잘못 잡았을 때 바로잡습니다. 여기서 고친 값은 다음 수집 때 덮어쓰이지 않습니다.
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-neutral-700">주류 태그</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.length === 0 && <span className="text-xs text-neutral-400">태그 없음</span>}
          {tags.map((tag) => (
            <span key={tag.spiritId}
              className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-primary-800">
              {tag.nameKo}
              <button type="button" aria-label={`${tag.nameKo} 태그 제거`}
                onClick={() => setTags((current) => current.filter((item) => item.spiritId !== tag.spiritId))}
                className="flex size-4 items-center justify-center rounded-full hover:bg-primary-200">
                ×
              </button>
            </span>
          ))}
        </div>
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)}
          placeholder="주류명으로 검색 (2자 이상)"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:max-w-sm" />
        {results.length > 0 && (
          <ul className="mt-1.5 max-h-52 overflow-y-auto rounded-lg border border-neutral-200 bg-white sm:max-w-sm">
            {results.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => addTag(item)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50">
                  <span className="font-semibold text-neutral-800">{item.nameKo}</span>
                  {item.nameEn && <span className="ml-1.5 text-xs text-neutral-400">{item.nameEn}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 text-xs leading-5 text-neutral-500">
          태그한 주류의 상세 페이지에 이 영상이 &lsquo;관련 영상&rsquo;으로 노출됩니다.
        </p>
      </div>

      <button type="button" disabled={pending}
        onClick={() => onUpdate({ videoType, spiritIds: tags.map((tag) => tag.spiritId) })}
        className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
        {pending ? '저장 중...' : '저장'}
      </button>
    </div>
  )
}

/** 영상 직접 등록 — 채널 RSS 는 최신 15편만 담아 오래된 대표 영상은 이 길로 올린다. */
function VideoAddForm({ channels, onDone, onError }: {
  channels: Array<{ id: number; title: string }>
  onDone: () => void
  onError: (message: string | null) => void
}) {
  const [channelId, setChannelId] = useState<number | ''>('')
  const [videoUrl, setVideoUrl] = useState('')

  const create = useMutation({
    mutationFn: () => youtubeApi.createVideo({
      channelId: Number(channelId),
      videoUrl: videoUrl.trim(),
    }),
    onMutate: () => onError(null),
    onSuccess: () => { setVideoUrl(''); onDone() },
    onError: (cause) => onError(extractApiErrorMessage(cause, '등록에 실패했습니다.')),
  })

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); create.mutate() }}
      className="flex flex-wrap items-end gap-2 rounded-xl border border-neutral-200 bg-white p-4"
    >
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-neutral-700">채널</span>
        <select value={channelId} onChange={(event) => setChannelId(Number(event.target.value) || '')}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm">
          <option value="">선택</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>{channel.title}</option>
          ))}
        </select>
      </label>
      <label className="block min-w-0 flex-1">
        <span className="mb-1.5 block text-xs font-semibold text-neutral-700">영상 주소 직접 등록</span>
        <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=... 또는 /shorts/..."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
      </label>
      <button type="submit" disabled={!channelId || !videoUrl.trim() || create.isPending}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
        {create.isPending ? '등록 중...' : '등록'}
      </button>
    </form>
  )
}
