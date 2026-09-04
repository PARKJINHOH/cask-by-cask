'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  /** 최신순 이미지 URL. 서버가 댓글 작성시각 내림차순으로 이미 정렬해 준다. */
  urls: string[]
  className?: string
}

/**
 * 장소 대표 이미지 — 최근 사진부터 순서대로 넘겨 본다.
 *
 * <p>포인터 핸들러 대신 <b>가로 스크롤 + scroll-snap</b> 으로 만든다. 직접 드래그를 구현하면
 * 모바일 바텀시트의 세로 드래그와 싸우게 되는데, 네이티브 스크롤은 축이 갈리는 순간을
 * 브라우저가 판단해 준다 — 가로로 밀면 사진이 넘어가고 세로로 밀면 시트가 따라온다.
 *
 * <p>사진이 한 장이면 화살표도 점도 그리지 않는다. 넘길 게 없는데 조작부만 있으면
 * 눌러 보고 나서야 "안 되는구나"를 알게 된다.
 */
export default function VenueHeroCarousel({ urls, className }: Props) {
  const { t } = useTranslation()
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const multiple = urls.length > 1

  // 스크롤 위치에서 현재 장을 역산한다 — 손으로 민 경우까지 점이 따라오게.
  useEffect(() => {
    const track = trackRef.current
    if (!track || !multiple) return
    let frame = 0
    const sync = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const width = track.clientWidth
        if (width > 0) setIndex(Math.round(track.scrollLeft / width))
      })
    }
    track.addEventListener('scroll', sync, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      track.removeEventListener('scroll', sync)
    }
  }, [multiple])

  const goTo = useCallback(
    (next: number) => {
      const track = trackRef.current
      if (!track) return
      const clamped = ((next % urls.length) + urls.length) % urls.length
      track.scrollTo({
        left: clamped * track.clientWidth,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
      setIndex(clamped)
    },
    [urls.length],
  )

  if (urls.length === 0) return null

  return (
    <div className={`relative bg-neutral-100 ${className ?? ''}`}>
      <div
        ref={trackRef}
        // pan-y 를 남겨 둬야 사진 위에서 세로로 밀 때 페이지·시트가 그대로 움직인다.
        className="flex aspect-[16/9] w-full snap-x snap-mandatory overflow-x-auto
          overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: 'pan-y pinch-zoom' }}
      >
        {urls.map((url, i) => (
          <div key={url} className="w-full shrink-0 snap-center">
            <img
              src={url}
              alt=""
              /* 첫 장은 화면에 바로 보이므로 지연 로딩하지 않는다 — 히어로가 늦게 뜨면
                 페이지가 통째로 덜 그려진 것처럼 보인다. */
              loading={i === 0 ? 'eager' : 'lazy'}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {multiple && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label={t('venue.hero.prev', '이전 사진')}
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center
              justify-center rounded-full bg-black/35 text-white backdrop-blur-sm
              transition-colors hover:bg-black/55"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label={t('venue.hero.next', '다음 사진')}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center
              justify-center rounded-full bg-black/35 text-white backdrop-blur-sm
              transition-colors hover:bg-black/55"
          >
            ›
          </button>

          {/* 점은 위치만 알린다. 장수가 많으면 점이 뭉개지므로 그때는 숫자로 바꾼다. */}
          {urls.length <= 8 ? (
            <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {urls.map((url, i) => (
                <span
                  key={url}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
          ) : (
            <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/45
              px-2 py-0.5 text-[11px] text-white">
              {index + 1} / {urls.length}
            </div>
          )}
        </>
      )}
    </div>
  )
}
