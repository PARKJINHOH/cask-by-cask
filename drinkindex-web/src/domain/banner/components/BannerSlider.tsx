import { useState, useEffect, useRef, useCallback } from 'react'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import type { BannerResponse } from '../types/banner.types'

interface BannerSliderProps {
  banners: BannerResponse[]
}

export default function BannerSlider({ banners }: BannerSliderProps) {
  const [current, setCurrent] = useState(0)
  const [isHoverPaused, setIsHoverPaused] = useState(false)
  const [isManualPaused, setIsManualPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const total = banners.length

  const isPaused = isHoverPaused || isManualPaused

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total])
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total])

  useEffect(() => {
    if (total <= 1 || isPaused) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [total, isPaused, next])

  if (total === 0) return null

  const banner = banners[current]

  const handleBannerClick = () => {
    if (!banner.linkUrl) return
    if (banner.linkTargetBlank) {
      window.open(banner.linkUrl, '_blank', 'noopener noreferrer')
    } else {
      window.location.href = banner.linkUrl
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev()
    touchStartX.current = null
  }

  return (
    <div
      className="relative w-full overflow-hidden bg-neutral-900 select-none"
      onMouseEnter={() => setIsHoverPaused(true)}
      onMouseLeave={() => setIsHoverPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 슬라이드 트랙 */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((b, idx) => (
          <div
            key={b.id}
            className={[
              'w-full flex-shrink-0 aspect-[3/4] lg:aspect-[21/5] relative',
              b.linkUrl ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
            onClick={b === banner ? handleBannerClick : undefined}
            role={b.linkUrl ? 'link' : undefined}
            tabIndex={b.linkUrl ? 0 : undefined}
            onKeyDown={(e) => { if (e.key === 'Enter' && b === banner) handleBannerClick() }}
          >
            {b.bannerType === 'IMAGE' ? (
              (b.pcImage || b.moImage) ? (
                <>
                  {/* PC: pcImage. 없으면 moImage 폴백. 첫 슬라이드만 LCP 우선. */}
                  <img
                    src={(b.pcImage ?? b.moImage)!.imageUrl}
                    alt="배너"
                    className="hidden lg:block w-full h-full object-cover"
                    draggable={false}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    fetchPriority={idx === 0 ? 'high' : 'auto'}
                    decoding="async"
                  />
                  {/* MO: moImage. 없으면 pcImage 폴백 */}
                  <img
                    src={(b.moImage ?? b.pcImage)!.imageUrl}
                    alt="배너"
                    className="block lg:hidden w-full h-full object-cover"
                    draggable={false}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    fetchPriority={idx === 0 ? 'high' : 'auto'}
                    decoding="async"
                  />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-amber-900 to-amber-700
                  flex items-center justify-center">
                  <span className="text-white text-3xl font-bold tracking-tight">DrinkIndex</span>
                </div>
              )
            ) : (
              <div
                className="w-full h-full overflow-hidden prose max-w-none"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(b.contentSanitized ?? ''),
                }}
              />
            )}

            {/* 하단 그라데이션 (도트 가독성 향상) */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
          </div>
        ))}
      </div>

      {/* 이전/다음 버튼 (PC) */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
              bg-white/80 hover:bg-white text-neutral-700 items-center justify-center
              shadow-md transition-all backdrop-blur-sm z-10"
            aria-label="이전 배너"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
              bg-white/80 hover:bg-white text-neutral-700 items-center justify-center
              shadow-md transition-all backdrop-blur-sm z-10"
            aria-label="다음 배너"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* 도트 인디케이터 + 재생/일시정지 */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {/* 도트 */}
          <div className="flex items-center gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCurrent(i) }}
                className={[
                  'rounded-full transition-all duration-300',
                  i === current
                    ? 'w-5 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80',
                ].join(' ')}
                aria-label={`배너 ${i + 1}`}
              />
            ))}
          </div>

          {/* 구분선 */}
          <span className="w-px h-3 bg-white/30" />

          {/* 재생/일시정지 */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsManualPaused((p) => !p) }}
            className="w-5 h-5 flex items-center justify-center text-white/80
              hover:text-white transition-colors"
            aria-label={isManualPaused ? '자동 재생' : '일시 정지'}
          >
            {isManualPaused ? (
              /* 재생 아이콘 */
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            ) : (
              /* 일시정지 아이콘 */
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* 슬라이드 카운터 (모바일) */}
      {total > 1 && (
        <div className="absolute top-3 right-3 lg:hidden z-10 text-xs text-white/80
          bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">
          {current + 1} / {total}
        </div>
      )}
    </div>
  )
}
