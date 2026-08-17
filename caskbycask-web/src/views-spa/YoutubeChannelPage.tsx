import { useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import Spinner from '@/shared/components/Spinner'
import { buildBreadcrumbSchema } from '@/shared/utils/seoSchema'
import InfiniteSentinel from '@/domain/photo-gallery/components/InfiniteSentinel'
import { youtubeApi } from '@/domain/youtube/api/youtubeApi'
import YoutubeChannelAvatar from '@/domain/youtube/components/YoutubeChannelAvatar'
import YoutubeGrid from '@/domain/youtube/components/YoutubeGrid'
import YoutubeVideoModal from '@/domain/youtube/components/YoutubeVideoModal'
import {
  flattenYoutubeVideos,
  useInfiniteYoutubeVideos,
} from '@/domain/youtube/hooks/useInfiniteYoutubeVideos'
import { buildYoutubeChannelSchema } from '@/domain/youtube/utils/youtubeSchema'

/**
 * 채널 랜딩 페이지 — 채널 하나의 소개와 그 채널 영상만 모아 보여 준다.
 *
 * 갤러리의 `?channel=` 필터와 보이는 것은 비슷하지만 성격이 다르다.
 * 필터는 색인하지 않는 화면이고, 이 페이지는 **채널마다 색인 대상 주소를 하나씩 갖게** 하는 것이
 * 목적이다. 창작자에게 "당신 채널 페이지가 우리 사이트에 있다"고 보여 줄 수 있는 자리이기도 하다.
 *
 * 주소의 식별자는 사람이 읽는 핸들이다(`/youtube/channels/juryuhak`). 핸들이 없는 채널은
 * 채널 ID 로 열리며, 서버가 둘 다 받는다.
 */
export default function YoutubeChannelPage() {
  const { channelRef = '' } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isEn = i18n.language === 'en'
  const prefix = isEn ? '/en' : '/ko'

  const openedKey = searchParams.get('v')

  const { data: channel, isLoading, isError } = useQuery({
    queryKey: ['youtubeChannel', channelRef],
    queryFn: () => youtubeApi.getChannel(channelRef),
    enabled: Boolean(channelRef),
    retry: false,
    staleTime: 10 * 60_000,
  })

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteYoutubeVideos(
    // 채널을 아직 모르는 동안에는 목록을 부르지 않는다 — channelId 없이 부르면 전체 목록이 온다.
    channel ? { channelId: channel.id } : { channelId: -1 },
  )
  const videos = useMemo(() => flattenYoutubeVideos(data?.pages), [data?.pages])

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

  const openedIndex = useMemo(
    () => (openedKey === null ? -1 : videos.findIndex((video) => video.videoKey === openedKey)),
    [openedKey, videos],
  )
  const moveTo = useCallback((index: number) => {
    const target = videos[index]
    if (target) patchParams({ v: target.videoKey }, { replace: true })
  }, [videos, patchParams])

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner className="text-primary-800" />
      </div>
    )
  }

  if (isError || !channel) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-sm text-neutral-500">{t('youtube.channelNotFound')}</p>
        <button
          type="button"
          onClick={() => navigate('/youtube', { replace: true })}
          className="mt-5 rounded-lg bg-primary-800 px-4 py-2.5 text-sm font-bold text-white"
        >
          {t('youtube.backToGallery')}
        </button>
      </div>
    )
  }

  // 주소에 핸들이 있으면 그것이 정본이다 — 채널 ID 로 들어와도 canonical 은 핸들 주소를 가리킨다.
  const canonicalRef = channel.handle ?? channel.channelKey
  const description = (isEn ? channel.descriptionEn : channel.description) ?? channel.description
  const pageTitle = t('youtube.channelPageTitle', { channel: channel.title })

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-6">
      <SeoMeta
        title={pageTitle}
        description={description || t('youtube.channelSeoDescription', { channel: channel.title })}
        canonical={buildCanonical(`${prefix}/youtube/channels/${canonicalRef}`)}
        alternateKo={buildCanonical(`/ko/youtube/channels/${canonicalRef}`)}
        alternateEn={buildCanonical(`/en/youtube/channels/${canonicalRef}`)}
        alternateDefault={buildCanonical(`/ko/youtube/channels/${canonicalRef}`)}
        locale={isEn ? 'en_US' : 'ko_KR'}
        ogImage={channel.thumbnailUrl ?? undefined}
        jsonLd={[
          buildYoutubeChannelSchema(channel, videos),
          buildBreadcrumbSchema([
            { name: t('nav.home'), path: '/' },
            { name: t('youtube.title'), path: '/youtube' },
            { name: channel.title, path: `/youtube/channels/${canonicalRef}` },
          ]),
        ]}
      />

      <nav className="mb-3">
        <Link to="/youtube" className="text-xs font-semibold text-neutral-500 hover:text-primary-700">
          ← {t('youtube.backToGallery')}
        </Link>
      </nav>

      <header className="mb-6 flex flex-wrap items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
        <YoutubeChannelAvatar channel={channel} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-neutral-900 lg:text-2xl">{channel.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {channel.handle && <span className="mr-2">@{channel.handle}</span>}
            {t('youtube.videoCount', { count: channel.videoCount })}
          </p>
          {description && (
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-600">
              {description}
            </p>
          )}
        </div>
        <a
          href={channel.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 shrink-0 items-center rounded-lg bg-neutral-900 px-4 text-sm font-bold text-white hover:bg-neutral-700"
        >
          {t('youtube.openChannel')}
        </a>
      </header>

      <h2 className="mb-3 text-sm font-bold text-neutral-700">{t('youtube.channelVideos')}</h2>

      {videos.length === 0 && !isFetchingNextPage ? (
        <p className="py-16 text-center text-sm text-neutral-400">{t('youtube.channelEmpty')}</p>
      ) : (
        <YoutubeGrid
          videos={videos}
          onSelect={(video) => patchParams({ v: video.videoKey })}
        />
      )}

      <InfiniteSentinel
        enabled={Boolean(hasNextPage) && !isFetchingNextPage}
        onReach={() => { void fetchNextPage() }}
      >
        {isFetchingNextPage
          ? t('youtube.loadingMore')
          : hasNextPage ? '' : videos.length > 0 ? t('youtube.end') : ''}
      </InfiniteSentinel>

      <div className="mt-6 text-center">
        <Link to="/youtube" className="text-sm font-semibold text-primary-700 hover:underline">
          {t('youtube.channelOtherChannels')} →
        </Link>
      </div>

      <YoutubeVideoModal
        videoKey={openedKey}
        fallback={openedIndex >= 0 ? videos[openedIndex] : undefined}
        onClose={() => patchParams({ v: undefined }, { replace: true })}
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
