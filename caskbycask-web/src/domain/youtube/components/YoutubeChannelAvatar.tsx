import { useState } from 'react'
import type { YoutubeVideoChannel } from '../types/youtube.types'

interface Props {
  channel: Pick<YoutubeVideoChannel, 'title' | 'thumbnailUrl'>
  size?: number
  className?: string
}

/**
 * 채널 프로필 이미지.
 *
 * 유튜브 프로필 주소는 만료되기도 하고 채널에 따라 아예 못 읽어 오기도 한다. 그래서 이미지가
 * 없거나 깨졌을 때는 <b>채널명 첫 글자</b>로 대신한다 — 깨진 이미지 아이콘이 목록에 남는 것보다 낫다.
 */
export default function YoutubeChannelAvatar({ channel, size = 32, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const dimension = { width: size, height: size }

  if (!channel.thumbnailUrl || failed) {
    return (
      <span
        aria-hidden="true"
        style={{ ...dimension, fontSize: Math.max(11, Math.round(size * 0.42)) }}
        className={`flex shrink-0 items-center justify-center rounded-full bg-neutral-700 font-bold uppercase text-white ${className}`}
      >
        {channel.title.trim().charAt(0)}
      </span>
    )
  }

  return (
    <img
      src={channel.thumbnailUrl}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={dimension}
      referrerPolicy="no-referrer"
      className={`shrink-0 rounded-full bg-neutral-200 object-cover ${className}`}
    />
  )
}
