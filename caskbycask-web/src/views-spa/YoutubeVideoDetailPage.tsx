import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import Spinner from '@/shared/components/Spinner'
import { youtubeApi } from '@/domain/youtube/api/youtubeApi'
import YoutubeVideoView from '@/domain/youtube/components/YoutubeVideoView'

/**
 * 영상 상세 페이지 — 갤러리 팝업과 같은 내용을 **독립된 주소**로 연다.
 *
 * 사람이 공유하고 새 탭으로 여는 주소가 목적이지, 색인 자산은 아니다. 제목·설명·썸네일이
 * 전부 남의 영상에서 온 값이라 `noindex, follow` 로 두고 사이트맵에도 싣지 않는다.
 * 대신 follow 를 남겨 아래 태그된 주류 링크가 크롤 경로로 살아 있게 한다.
 * 색인 대상 유튜브 주소는 `/youtube` 허브 하나뿐이다.
 */
export default function YoutubeVideoDetailPage() {
  const { videoKey = '' } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isEn = i18n.language === 'en'
  const prefix = isEn ? '/en' : '/ko'

  const { data: video, isLoading, isError } = useQuery({
    queryKey: ['youtubeVideo', videoKey],
    queryFn: () => youtubeApi.getVideo(videoKey),
    enabled: Boolean(videoKey),
    retry: false,
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Spinner className="text-primary-800" />
      </div>
    )
  }

  if (isError || !video) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-sm text-neutral-500">{t('youtube.notFound')}</p>
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

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-6">
      <SeoMeta
        title={`${video.title} — ${video.channel.title}`}
        description={video.description?.slice(0, 200) ?? t('youtube.seoDescription')}
        canonical={buildCanonical(`${prefix}/youtube/${video.videoKey}`)}
        alternateKo={buildCanonical(`/ko/youtube/${video.videoKey}`)}
        alternateEn={buildCanonical(`/en/youtube/${video.videoKey}`)}
        alternateDefault={buildCanonical(`/ko/youtube/${video.videoKey}`)}
        locale={isEn ? 'en_US' : 'ko_KR'}
        ogType="article"
        ogImage={video.thumbnailUrl ?? undefined}
        // 제목·설명·썸네일이 모두 남의 영상에서 온 값이라 색인 대상이 아니다.
        // SSR(getYoutubeVideoMetadata)도 같은 판정이며, 둘이 어긋나면 하이드레이션 후 robots 가 뒤집힌다.
        // follow 는 유지 — 아래 태그된 주류 링크가 갤러리에서 카탈로그로 가는 크롤 경로다.
        noindex
      />

      <nav className="mb-3">
        <Link to="/youtube" className="text-xs font-semibold text-neutral-500 hover:text-primary-700">
          ← {t('youtube.backToGallery')}
        </Link>
      </nav>

      <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <YoutubeVideoView video={video} />
      </article>
    </div>
  )
}
