import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { YoutubeVideo } from '../types/youtube.types'
import { gridThumbnail, handleThumbnailError } from '../utils/youtubeThumbnail'
import YoutubeChannelAvatar from './YoutubeChannelAvatar'

interface Props {
  videos: YoutubeVideo[]
  heading: string
  /** '전체 보기' 링크. 없으면 표시하지 않는다. */
  moreTo?: string
}

/**
 * 가로 스크롤 영상 줄 — 주류 상세의 '관련 영상'과 메인의 '최신 영상'이 함께 쓴다.
 *
 * 갤러리 본 목록과 달리 팝업을 열지 않고 상세 페이지로 보낸다. 이 줄이 놓이는 화면(주류 상세·메인)은
 * 각자 자기 상태를 갖고 있어, 그 위에 영상 팝업까지 얹으면 뒤로가기가 어디로 가는지 헷갈린다.
 */
export default function YoutubeVideoRail({ videos, heading, moreTo }: Props) {
  const { t } = useTranslation()
  if (videos.length === 0) return null

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold text-neutral-900">{heading}</h2>
        {moreTo && (
          <Link to={moreTo} className="text-xs font-semibold text-primary-700 hover:underline">
            {t('youtube.viewAll')} →
          </Link>
        )}
      </div>

      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {videos.map((video) => (
          <li key={video.videoKey} className="shrink-0">
            <Link
              to={`/youtube/${video.videoKey}`}
              className="group block w-[240px] sm:w-[268px]"
            >
              <span className="relative block overflow-hidden rounded-xl bg-neutral-900">
                <span
                  className="block w-full"
                  style={{ aspectRatio: video.videoType === 'SHORTS' ? '9 / 16' : '16 / 9' }}
                >
                  <img
                    src={gridThumbnail(video.videoKey)}
                    onError={(event) => handleThumbnailError(event.currentTarget, video.videoKey)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </span>
                {video.videoType === 'SHORTS' && (
                  <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {t('youtube.shortsBadge')}
                  </span>
                )}
              </span>
              <span className="mt-2 flex gap-2">
                <YoutubeChannelAvatar channel={video.channel} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
                    {video.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-neutral-500">
                    {video.channel.title}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
