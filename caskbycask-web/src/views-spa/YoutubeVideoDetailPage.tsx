import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import Spinner from '@/shared/components/Spinner'
import { buildBreadcrumbSchema } from '@/shared/utils/seoSchema'
import { youtubeApi } from '@/domain/youtube/api/youtubeApi'
import YoutubeVideoView from '@/domain/youtube/components/YoutubeVideoView'
import { buildVideoObjectSchema } from '@/domain/youtube/utils/youtubeSchema'

/**
 * 영상 상세 페이지 — 갤러리 팝업과 같은 내용을 **독립된 주소**로 연다.
 *
 * 팝업만 있으면 영상마다 검색엔진이 색인할 주소가 없다. 이 페이지가 있어야
 * 사이트맵에 영상별 URL 을 실을 수 있고, VideoObject 구조화 데이터도 여기에 붙는다.
 * 갤러리에서 타일을 새 탭으로 열면 바로 이 화면이다.
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
        jsonLd={[
          buildVideoObjectSchema(video),
          buildBreadcrumbSchema([
            { name: t('nav.home'), path: '/' },
            { name: t('youtube.title'), path: '/youtube' },
            { name: video.title, path: `/youtube/${video.videoKey}` },
          ]),
        ]}
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
