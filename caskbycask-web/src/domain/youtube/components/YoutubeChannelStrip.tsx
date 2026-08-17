import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { YoutubeChannel } from '../types/youtube.types'
import YoutubeChannelAvatar from './YoutubeChannelAvatar'

interface Props {
  channels: YoutubeChannel[]
}

/**
 * 갤러리 상단의 채널 소개 줄.
 *
 * 카드를 누르면 <b>채널 페이지</b>로 간다 — 예전에는 목록을 그 자리에서 걸러 주기만 했는데,
 * 그 화면은 주소가 갤러리와 같아 검색엔진에 채널이 하나도 드러나지 않았다.
 * 채널마다 자기 주소를 갖게 하는 편이 소개로도, 색인으로도 낫다.
 *
 * 채널명과 소개문은 이미지가 아니라 실제 텍스트로 둔다.
 */
export default function YoutubeChannelStrip({ channels }: Props) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  if (channels.length === 0) return null

  return (
    <section aria-label={t('youtube.channelsTitle')} className="mb-5">
      <h2 className="mb-2 text-sm font-bold text-neutral-700">{t('youtube.channelsTitle')}</h2>
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {channels.map((channel) => {
          const description = (isEn ? channel.descriptionEn : channel.description)
            ?? channel.description
          return (
            <li key={channel.id} className="min-w-0">
              <div className="flex h-full w-[248px] flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-primary-300">
                <Link
                  to={`/youtube/channels/${channel.handle ?? channel.channelKey}`}
                  className="flex min-w-0 items-center gap-2.5"
                >
                  <YoutubeChannelAvatar channel={channel} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-neutral-900">
                      {channel.title}
                    </span>
                    <span className="block truncate text-xs text-neutral-500">
                      {t('youtube.videoCount', { count: channel.videoCount })}
                    </span>
                  </span>
                </Link>

                {description && (
                  <p className="line-clamp-2 text-xs leading-5 text-neutral-500">{description}</p>
                )}

                <a
                  href={channel.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex h-8 items-center justify-center rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-600 hover:border-red-400 hover:text-red-600"
                >
                  {t('youtube.openChannel')}
                </a>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
