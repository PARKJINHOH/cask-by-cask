import { buildCanonical } from '@/shared/config/site'
import type { YoutubeChannel, YoutubeVideo } from '../types/youtube.types'
import { largeThumbnail } from './youtubeThumbnail'

/**
 * VideoObject 구조화 데이터.
 *
 * 영상 자체는 유튜브에 있고 우리는 임베드해 보여 준다. 그래서
 * - `embedUrl` 은 이 페이지에서 실제로 재생되는 임베드 주소를 가리키고,
 * - `contentUrl` 은 쓰지 않는다(우리가 호스팅하는 파일이 아니다),
 * - `publisher` 는 우리가 아니라 **채널**이다. 남의 영상을 우리 것으로 표시하면 안 된다.
 *
 * `duration`·`interactionStatistic`(재생시간·조회수)은 넣지 않는다 — Data API 를 쓰지 않아
 * 값을 모르고, 추측해 넣으면 구조화 데이터에 거짓을 심게 된다.
 */
export function buildVideoObjectSchema(video: YoutubeVideo) {
  return {
    '@type': 'VideoObject',
    name: video.title,
    description: video.description ?? video.title,
    thumbnailUrl: [video.thumbnailUrl ?? largeThumbnail(video.videoKey)],
    uploadDate: video.publishedAt,
    embedUrl: video.embedUrl,
    url: buildCanonical(`/youtube/${video.videoKey}`),
    publisher: {
      '@type': 'Organization',
      name: video.channel.title,
      url: video.channel.channelUrl,
    },
    ...(video.spiritTags.length > 0
      ? {
        about: video.spiritTags.map((tag) => ({
          '@type': 'Product',
          name: tag.nameKo,
          url: buildCanonical(`/spirits/${tag.spiritId}`),
        })),
      }
      : {}),
  }
}

/**
 * 채널 랜딩 페이지의 CollectionPage.
 *
 * `about` 이 채널 자신(Organization)이고 `mainEntity` 가 그 채널 영상 목록이다.
 * 채널의 정본 주소(`sameAs`)로 유튜브 채널 홈을 가리켜, 검색엔진이 이 페이지를
 * **채널을 소개하는 페이지**로 읽고 유튜브 원본과 연결짓게 한다 — 우리가 채널 본인인 척하지 않는다.
 */
export function buildYoutubeChannelSchema(channel: YoutubeChannel, videos: YoutubeVideo[]) {
  const canonical = buildCanonical(`/youtube/channels/${channel.handle ?? channel.channelKey}`)
  return {
    '@type': 'CollectionPage',
    name: channel.title,
    description: channel.description ?? undefined,
    url: canonical,
    about: {
      '@type': 'Organization',
      name: channel.title,
      url: channel.channelUrl,
      sameAs: [channel.channelUrl],
      ...(channel.thumbnailUrl ? { logo: channel.thumbnailUrl } : {}),
    },
    ...(videos.length > 0
      ? {
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: videos.length,
          itemListElement: videos.slice(0, 24).map((video, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: video.title,
            url: buildCanonical(`/youtube/${video.videoKey}`),
          })),
        },
      }
      : {}),
  }
}

/**
 * 갤러리 목록의 ItemList.
 *
 * 목록 페이지가 "영상 모음"임을 알린다 — 검색 결과에서 개별 영상 페이지로 이어지는
 * 내부 링크 구조를 검색엔진이 그대로 읽게 하는 것이 목적이다.
 */
export function buildYoutubeGallerySchema(videos: YoutubeVideo[]) {
  return {
    '@type': 'ItemList',
    itemListElement: videos.map((video, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: video.title,
      url: buildCanonical(`/youtube/${video.videoKey}`),
    })),
  }
}
