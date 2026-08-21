import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { YoutubeChannel } from '../types/youtube.types'
import YoutubeChannelAvatar from './YoutubeChannelAvatar'

interface Props {
  channels: YoutubeChannel[]
}

/**
 * 갤러리 상단의 채널 목록 (접기/펼치기 가능, 가로 스크롤 없이 컴팩트한 그리드 카드)
 */
export default function YoutubeChannelStrip({ channels }: Props) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(true)

  if (channels.length === 0) return null

  return (
    <section className="mb-5 rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-600">
          {t('youtube.channelsCount', { count: channels.length })}
        </span>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900"
          aria-expanded={isOpen}
        >
          <span>{isOpen ? t('youtube.hideChannels') : t('youtube.showChannels')}</span>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {channels.map((channel) => (
            <Link
              key={channel.id}
              to={`/youtube/channels/${channel.handle ?? channel.channelKey}`}
              className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-neutral-200 bg-white p-2.5 transition-all hover:border-primary-400 hover:shadow-xs"
            >
              <YoutubeChannelAvatar channel={channel} size={32} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-neutral-900 group-hover:text-primary-800">
                  {channel.title}
                </span>
                <span className="block truncate text-[11px] text-neutral-400">
                  {t('youtube.videoCount', { count: channel.videoCount })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}