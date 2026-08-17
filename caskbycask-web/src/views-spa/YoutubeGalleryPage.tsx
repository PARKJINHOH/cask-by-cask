import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import InfiniteSentinel from '@/domain/photo-gallery/components/InfiniteSentinel'
import { youtubeApi } from '@/domain/youtube/api/youtubeApi'
import YoutubeChannelStrip from '@/domain/youtube/components/YoutubeChannelStrip'
import YoutubeGrid from '@/domain/youtube/components/YoutubeGrid'
import YoutubeVideoModal from '@/domain/youtube/components/YoutubeVideoModal'
import {
  flattenYoutubeVideos,
  useInfiniteYoutubeVideos,
} from '@/domain/youtube/hooks/useInfiniteYoutubeVideos'
import type { YoutubeVideoType } from '@/domain/youtube/types/youtube.types'
import { buildYoutubeGallerySchema } from '@/domain/youtube/utils/youtubeSchema'

/**
 * 유튜브 갤러리 — 관리자가 승인한 채널의 영상을 이미지 갤러리와 같은 타일 목록으로 보여 준다.
 *
 * 화면 상태는 모두 주소에 담는다 — 영상 팝업 `?v=<videoKey>`, 채널 `?channel=`,
 * 유형 `?type=`, 검색어 `?q=`. 뒤로가기로 되돌릴 수 있고 그 주소를 공유해도 같은 화면이 열린다
 * (이미지 갤러리 `PhotoGalleryPage` 와 같은 규약).
 */
export default function YoutubeGalleryPage() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isEn = i18n.language === 'en'
  const prefix = isEn ? '/en' : '/ko'

  const openedKey = searchParams.get('v')
  // 채널별 목록은 이 화면의 필터가 아니라 채널 페이지(/youtube/channels/…)가 맡는다.
  // 주류 상세의 '관련 영상 전체 보기'가 이 주소로 들어온다.
  const spiritId = Number(searchParams.get('spirit')) || undefined
  const typeParam = searchParams.get('type')
  const videoType: YoutubeVideoType | undefined =
    typeParam === 'SHORTS' || typeParam === 'VIDEO' ? typeParam : undefined
  const keywordParam = searchParams.get('q') ?? ''

  // 입력은 즉시 반영하되 요청은 눌러 담는다 — 한 글자마다 목록을 새로 부르지 않는다.
  const [keywordDraft, setKeywordDraft] = useState(keywordParam)
  const debouncedKeyword = useDebouncedValue(keywordDraft)

  /** 다른 파라미터를 지우지 않고 일부만 바꾼다 — ?v= 팝업 상태와 필터가 공존해야 한다. */
  const patchParams = useCallback((
    patch: Record<string, string | undefined>,
    options?: { replace?: boolean },
  ) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      Object.entries(patch).forEach(([key, value]) => {
        if (value) next.set(key, value)
        else next.delete(key)
      })
      return next
    }, options)
  }, [setSearchParams])

  // 디바운스가 끝난 검색어만 주소에 반영한다. 검색어가 바뀌면 열려 있던 영상은 닫는다
  // (걸러진 목록에 없는 영상이 팝업으로 남아 있으면 좌우 이동이 어긋난다).
  useEffect(() => {
    if (debouncedKeyword === keywordParam) return
    patchParams({ q: debouncedKeyword || undefined, v: undefined }, { replace: true })
  }, [debouncedKeyword, keywordParam, patchParams])

  // 반대 방향 — 뒤로가기·링크로 ?q= 가 바뀌면 입력칸도 따라간다.
  useEffect(() => {
    setKeywordDraft((current) => (current === keywordParam ? current : keywordParam))
  }, [keywordParam])

  const query = useMemo(
    () => ({ videoType, keyword: keywordParam || undefined, spiritId }),
    [videoType, keywordParam, spiritId],
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteYoutubeVideos(query)

  const videos = useMemo(() => flattenYoutubeVideos(data?.pages), [data?.pages])

  const { data: channels = [] } = useQuery({
    queryKey: ['youtubeChannels'],
    queryFn: youtubeApi.getChannels,
    staleTime: 10 * 60_000,
  })

  const openedIndex = useMemo(
    () => (openedKey === null ? -1 : videos.findIndex((video) => video.videoKey === openedKey)),
    [openedKey, videos],
  )
  const openedVideo = openedIndex >= 0 ? videos[openedIndex] : undefined

  // push — 뒤로가기가 곧 닫기가 된다.
  const openVideo = useCallback((videoKey: string) => {
    patchParams({ v: videoKey })
  }, [patchParams])

  // replace — 닫은 뒤 뒤로가기로 같은 영상이 다시 열리지 않게 한다.
  const closeVideo = useCallback(() => {
    patchParams({ v: undefined }, { replace: true })
  }, [patchParams])

  const moveTo = useCallback((index: number) => {
    const target = videos[index]
    if (target) patchParams({ v: target.videoKey }, { replace: true })
  }, [videos, patchParams])

  const hasFilter = Boolean(videoType || keywordParam || spiritId)

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-6">
      <SeoMeta
        title={t('youtube.seoTitle')}
        description={t('youtube.seoDescription')}
        canonical={buildCanonical(`${prefix}/youtube`)}
        alternateKo={buildCanonical('/ko/youtube')}
        alternateEn={buildCanonical('/en/youtube')}
        alternateDefault={buildCanonical('/ko/youtube')}
        locale={isEn ? 'en_US' : 'ko_KR'}
        // 필터가 걸린 목록은 본 목록과 내용이 겹친다 — 색인은 필터 없는 주소 하나만 받는다.
        noindex={hasFilter}
        // 걸러진 목록의 ItemList 는 색인 대상이 아니므로 붙이지 않는다.
        jsonLd={!hasFilter && videos.length > 0
          ? buildYoutubeGallerySchema(videos.slice(0, 24))
          : undefined}
      />

      <header className="mb-4">
        <h1 className="text-xl font-bold text-neutral-900 lg:text-2xl">{t('youtube.title')}</h1>
      </header>

      <YoutubeChannelStrip channels={channels} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([
          [undefined, t('youtube.filterAll')],
          ['VIDEO' as YoutubeVideoType, t('youtube.filterVideos')],
          ['SHORTS' as YoutubeVideoType, t('youtube.filterShorts')],
        ] as const).map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => patchParams({ type: value, v: undefined })}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              videoType === value
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {label}
          </button>
        ))}

        {/* 주류 상세에서 넘어온 필터. 이름을 알 수 없어(목록 응답에 태그를 싣지 않는다)
            일반 문구로 두되, 해제할 길은 반드시 남긴다 — 없으면 갇힌 화면이 된다. */}
        {spiritId && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-50 py-1.5 pl-3.5 pr-1.5 text-xs font-semibold text-primary-800">
            {t('youtube.filterBySpirit')}
            <button
              type="button"
              onClick={() => patchParams({ spirit: undefined, v: undefined })}
              aria-label={t('youtube.clearSpiritFilter')}
              className="flex size-5 items-center justify-center rounded-full text-primary-600 hover:bg-primary-200/60"
            >
              ×
            </button>
          </span>
        )}

        <div className="ml-auto w-full sm:w-56">
          <input
            type="search"
            value={keywordDraft}
            onChange={(event) => setKeywordDraft(event.target.value)}
            placeholder={t('youtube.searchPlaceholder')}
            aria-label={t('youtube.searchLabel')}
            className="h-9 w-full rounded-full border border-neutral-200 bg-white px-4 text-xs text-neutral-700 focus:border-primary-400 focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="py-20 text-center text-sm text-neutral-400">···</p>
      ) : videos.length === 0 && hasFilter ? (
        <p className="py-16 text-center text-sm text-neutral-400">{t('youtube.filterEmpty')}</p>
      ) : (
        <YoutubeGrid videos={videos} onSelect={(video) => openVideo(video.videoKey)} />
      )}

      <InfiniteSentinel
        enabled={Boolean(hasNextPage) && !isFetchingNextPage}
        onReach={() => { void fetchNextPage() }}
      >
        {isFetchingNextPage
          ? t('youtube.loadingMore')
          : hasNextPage ? '' : videos.length > 0 ? t('youtube.end') : ''}
      </InfiniteSentinel>

      <YoutubeVideoModal
        videoKey={openedKey}
        fallback={openedVideo}
        onClose={closeVideo}
        onPrev={openedIndex > 0 ? () => moveTo(openedIndex - 1) : undefined}
        onNext={
          openedIndex >= 0 && openedIndex < videos.length - 1
            ? () => moveTo(openedIndex + 1)
            : undefined
        }
      />
    </div>
  )
}
