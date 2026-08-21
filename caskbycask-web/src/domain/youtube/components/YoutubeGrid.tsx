import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
// 이미지 갤러리와 같은 메이슨리 계산을 그대로 쓴다 — 두 갤러리의 타일 리듬을 맞추기 위해서다
// (순수 함수라 DOM 의존이 없고, photo-gallery 쪽 테스트가 회귀를 막는다).
import { columnCountFor, columnWidthFor, layoutPhotoColumns } from '@/domain/photo-gallery/utils/columnLayout'
import type { YoutubeVideo } from '../types/youtube.types'
import {
  aspectRatioFor,
  gridThumbnail,
  handleThumbnailError,
  handleThumbnailLoad,
} from '../utils/youtubeThumbnail'
import YoutubeChannelAvatar from './YoutubeChannelAvatar'

interface Props {
  videos: YoutubeVideo[]
  /** 타일을 눌렀을 때 — 이미지 갤러리처럼 목록을 벗어나지 않고 그 자리에서 연다 */
  onSelect?: (video: YoutubeVideo) => void
}

/** 타일 사이 간격(px) — 이미지 갤러리와 같은 값 */
const GAP = 8

/**
 * 영상 타일 목록.
 *
 * 이미지 갤러리와 달리 비율이 두 가지(16:9 / 9:16)뿐이라 열 높이가 크게 어긋나기 쉽다.
 * 그래서 같은 메이슨리 계산(가장 짧은 열에 넣기)을 쓴다 — 숏츠가 몰려도 한 열만 길어지지 않는다.
 */
export default function YoutubeGrid({ videos, onSelect }: Props) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const update = () => setContainerWidth(element.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const columns = useMemo(() => {
    if (containerWidth <= 0) return []
    const columnCount = columnCountFor(containerWidth)
    const columnWidth = columnWidthFor(containerWidth, columnCount, GAP)
    // 썸네일을 기다리지 않고 유형만으로 비율이 정해지므로 로드 후 재배치가 없다.
    const items = videos.map((video) => {
      const ratio = aspectRatioFor(video.videoType)
      return { width: ratio, height: 1, video }
    })
    return layoutPhotoColumns(items, { columnCount, columnWidth, gap: GAP })
  }, [containerWidth, videos])

  /**
   * 좌클릭은 팝업으로 연다. 새 탭/새 창(⌘·Ctrl·Shift·가운데 버튼)은 브라우저에 맡겨
   * 주소를 그대로 열 수 있게 둔다 — 그래서 타일은 계속 진짜 링크(<a>)다.
   */
  const handleClick = useCallback((event: MouseEvent<HTMLAnchorElement>, video: YoutubeVideo) => {
    if (!onSelect) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    onSelect(video)
  }, [onSelect])

  // 컨테이너는 항상 그린다 — 폭을 재는 ResizeObserver 가 붙을 자리라
  // 영상이 없는 동안 걷어 내면 채워져도 폭이 0 으로 남는다.
  return (
    <div ref={containerRef} className="flex items-start" style={{ gap: GAP }}>
      {videos.length === 0 && (
        <p className="w-full py-16 text-center text-sm text-neutral-400">{t('youtube.empty')}</p>
      )}
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-1 flex-col" style={{ gap: GAP }}>
          {column.cells.map(({ item, aspectRatio }) => {
            const video = item.video
            return (
              <Link
                key={video.videoKey}
                to={`/youtube/${video.videoKey}`}
                onClick={(event) => handleClick(event, video)}
                className="group relative block w-full overflow-hidden rounded-xl bg-neutral-900"
              >
                <div style={{ aspectRatio }} className="w-full">
                  <img
                    src={gridThumbnail(video.videoKey)}
                    onError={(event) => handleThumbnailError(event.currentTarget, video.videoKey)}
                    onLoad={(event) => handleThumbnailLoad(event.currentTarget, video.videoKey)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                {video.videoType === 'SHORTS' && (
                  <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {t('youtube.shortsBadge')}
                  </span>
                )}
                {video.pinned && (
                  <span className="absolute right-2 top-2 rounded-md bg-primary-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {t('youtube.pinnedBadge')}
                  </span>
                )}

                {/* 제목과 채널은 항상 보인다 — 이미지와 달리 영상은 제목이 곧 내용이라
                    hover 로 감추면 무엇에 관한 영상인지 알 수 없다. */}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 pt-10 text-white">
                  <YoutubeChannelAvatar channel={video.channel} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-bold leading-snug">{video.title}</span>
                    <span className="mt-0.5 block truncate text-xs opacity-80">
                      {video.channel.title}
                    </span>
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <span className="flex h-11 w-16 items-center justify-center rounded-xl bg-red-600 shadow-lg">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}
