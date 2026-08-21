import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ShareUrlButton from '@/shared/components/ShareUrlButton'
import { buildCanonical } from '@/shared/config/site'
import type { YoutubeVideo } from '../types/youtube.types'
import YoutubeChannelAvatar from './YoutubeChannelAvatar'
import YoutubeEmbed from './YoutubeEmbed'

interface Props {
  video: YoutubeVideo
  /** 팝업으로 열렸을 때만 닫기 버튼이 뜬다. 상세 페이지에서는 없다. */
  onClose?: () => void
  onPrev?: () => void
  onNext?: () => void
  /** 팝업은 높이를 화면에 맞추고, 상세 페이지는 내용만큼 늘어난다. */
  fill?: boolean
}

/**
 * 영상 한 편의 본문 — 팝업(YoutubeVideoModal)과 상세 페이지가 함께 쓴다.
 *
 * 숏츠는 세로라 재생 영역을 좁게 잡는다. 가로 영상과 같은 폭을 주면 화면 대부분이 검게 남는다.
 */
export default function YoutubeVideoView({ video, onClose, onPrev, onNext, fill = false }: Props) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const isShorts = video.videoType === 'SHORTS'

  const publishedLabel = new Date(video.publishedAt)
    .toLocaleDateString(isEn ? 'en-US' : 'ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className={`flex flex-col ${fill ? 'h-full min-h-0' : ''}`}>
      {/*
        조작 버튼은 플레이어 <b>위</b> 별도 막대에 둔다 — 영상 위에 겹쳐 놓으면 유튜브가 자기
        오버레이(제목 막대·설정 톱니바퀴·나중에 볼 동영상)를 같은 자리에 그려 서로 가린다.
        우리 버튼을 옮기는 편이 확실하다. 유튜브 UI 는 우리가 통제할 수 없다.
      */}
      {(onClose || onPrev || onNext) && (
        <div className="flex shrink-0 items-center gap-2 bg-neutral-950 px-3 py-2 sm:px-4 sm:py-2.5">
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-white/80">{video.title}</p>
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              aria-label={t('youtube.prev')}
              className="flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              aria-label={t('youtube.next')}
              className="flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/15 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* 메인 콘텐츠 영역: 모달(fill)일 때 PC 에서는 좌:플레이어 / 우:정보 스크롤 2분할, 모바일에서는 상하 */}
      <div className={`flex flex-col ${fill ? 'flex-1 min-h-0 lg:flex-row' : ''}`}>
        {/* 플레이어 */}
        <div
          className={`flex shrink-0 items-center justify-center bg-black ${
            fill ? 'lg:flex-1 lg:min-w-0 lg:h-full' : ''
          }`}
        >
          <div
            className={`w-full ${
              isShorts
                ? 'max-w-[min(420px,52vh)] lg:max-w-[min(420px,100%)] lg:h-full lg:flex lg:items-center lg:justify-center'
                : 'max-w-full'
            }`}
            style={{ aspectRatio: isShorts ? '9 / 16' : '16 / 9' }}
          >
            <YoutubeEmbed video={video} autoPlay={Boolean(onClose)} />
          </div>
        </div>

        {/* 정보 영역 (스크롤 가능) */}
        <div
          className={`flex-1 min-h-0 space-y-4 p-4 sm:p-5 ${
            fill ? 'overflow-y-auto lg:w-[380px] lg:shrink-0 lg:border-l lg:border-neutral-100 xl:w-[420px]' : ''
          }`}
        >
          <div>
            <div className="flex items-start gap-2">
              {isShorts && (
                <span className="shrink-0 rounded-md bg-neutral-900 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {t('youtube.shortsBadge')}
                </span>
              )}
              <h1 className="text-base font-bold leading-snug text-neutral-900 sm:text-lg">{video.title}</h1>
            </div>
            <p className="mt-1 text-xs text-neutral-500">{publishedLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-y border-neutral-100 py-3">
            {/* 우리 채널 페이지로 — 그 채널의 다른 영상으로 이어지는 갤러리 내부 링크다. */}
            <Link
              to={`/youtube/channels/${video.channel.handle ?? video.channel.channelKey}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <YoutubeChannelAvatar channel={video.channel} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-neutral-900 hover:underline">
                  {video.channel.title}
                </span>
                {video.channel.handle && (
                  <span className="block truncate text-xs text-neutral-500">
                    @{video.channel.handle}
                  </span>
                )}
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {/* 채널 홈으로 — 창작자에게 트래픽을 돌려주는 자리라 눈에 띄게 둔다. */}
              <a
                href={video.channel.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-lg bg-neutral-900 px-3.5 text-xs font-bold text-white hover:bg-neutral-700"
              >
                {t('youtube.openChannel')}
              </a>
              <a
                href={video.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-lg border border-neutral-300 px-3.5 text-xs font-bold text-neutral-700 hover:border-red-400 hover:text-red-600"
              >
                {t('youtube.openOnYoutube')}
              </a>
              <ShareUrlButton
                url={buildCanonical(`/youtube/${video.videoKey}`)}
                className="h-9 w-9"
              />
            </div>
          </div>

          {video.spiritTags.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold text-neutral-500">{t('youtube.relatedSpirits')}</p>
              <div className="flex flex-wrap gap-2">
                {video.spiritTags.map((tag) => (
                  <Link
                    key={tag.spiritId}
                    to={`/spirits/${tag.spiritId}`}
                    className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-800 hover:border-primary-400"
                  >
                    {isEn ? tag.nameEn || tag.nameKo : tag.nameKo}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {video.description && (
            <div>
              <p className="mb-1 text-xs font-bold text-neutral-500">{t('youtube.description')}</p>
              <p className="whitespace-pre-line text-sm leading-6 text-neutral-600">{video.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
