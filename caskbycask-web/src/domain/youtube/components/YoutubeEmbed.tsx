import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { YoutubeVideo } from '../types/youtube.types'
import { handleThumbnailError, largeThumbnail } from '../utils/youtubeThumbnail'

interface Props {
  video: YoutubeVideo
  /** 팝업에서 열자마자 재생할지. 목록 안 미리보기는 false 로 두어 스크롤만 해도 재생되지 않게 한다. */
  autoPlay?: boolean
  className?: string
}

/**
 * 유튜브 임베드 플레이어.
 *
 * **누르기 전에는 iframe 을 만들지 않는다.** 썸네일만 먼저 그리고, 재생 버튼을 눌렀을 때 비로소
 * iframe 을 붙인다. 이유가 둘 있다.
 * 1) 유튜브 iframe 하나가 수백 KB 짜리 플레이어를 끌고 온다 — 목록에서 여러 개가 동시에 뜨면
 *    모바일에서 눈에 띄게 느려진다.
 * 2) iframe 이 붙는 순간 제3자(유튜브) 요청이 시작된다. 사용자가 재생을 선택하기 전까지는
 *    아무것도 보내지 않는 편이 개인정보 처리방침과도 맞다.
 *
 * 주소는 `youtube-nocookie.com` 이다(서버가 조립해 내려 준다 — `YoutubeUrlParser.embedUrl`).
 */
export default function YoutubeEmbed({ video, autoPlay = false, className = '' }: Props) {
  const { t } = useTranslation()
  const [playing, setPlaying] = useState(autoPlay)

  if (playing) {
    return (
      <iframe
        // autoplay=1 은 사용자가 재생을 누른 뒤에만 붙는다 — 저절로 소리가 나지 않게.
        src={`${video.embedUrl}?autoplay=1&rel=0&modestbranding=1`}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className={`h-full w-full border-0 ${className}`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={t('youtube.play', { title: video.title })}
      className={`group relative block h-full w-full overflow-hidden bg-black ${className}`}
    >
      <img
        src={largeThumbnail(video.videoKey)}
        onError={(event) => handleThumbnailError(event.currentTarget, video.videoKey)}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30"
      >
        <span className="flex h-14 w-20 items-center justify-center rounded-2xl bg-red-600 shadow-lg transition-transform group-hover:scale-105">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  )
}
