import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Badge from './Badge'
import ImageLightbox from './ImageLightbox'
import { scoreColor } from '@/shared/utils/format'
import { localizeCountry } from '@/shared/utils/countryName'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'

export interface SpiritCardProps {
  spirit: SpiritListItem
  className?: string
  listView?: boolean
}

function PlaceholderImage() {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-neutral-50 text-neutral-300"
      aria-hidden="true"
    >
      <svg
        className="w-10 h-10" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M10 2h4" />
        <path d="M10.5 2v4.2a3 3 0 0 1-.45 1.58L9 9.6A4 4 0 0 0 8.5 11.6V19a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3v-7.4a4 4 0 0 0-.5-2l-1.05-1.82A3 3 0 0 1 13.5 6.2V2" />
        <path d="M8.5 13h7" />
      </svg>
    </div>
  )
}

export default function SpiritCard({ spirit, className = '', listView = false }: SpiritCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const primaryName   = isEn ? (spirit.nameEn || spirit.nameKo) : spirit.nameKo
  const secondaryName = isEn ? spirit.nameKo : spirit.nameEn
  const countryLabel  = localizeCountry(spirit.country, i18n.language)

  if (listView) {
    return (
      <div className={className}>
        <article className="bg-white rounded-xl shadow-sm flex items-center gap-3 p-3
          transition-all duration-200 ease-out
          hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">

          {/* 썸네일 — 클릭 시 라이트박스 */}
          {spirit.primaryImageUrl ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={primaryName}
              className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white
                cursor-zoom-in focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-primary-500 focus-visible:ring-offset-1"
            >
              <img
                src={spirit.primaryImageUrl}
                alt={primaryName}
                loading="lazy"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </button>
          ) : (
            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white">
              <PlaceholderImage />
            </div>
          )}

          {/* 나머지 — 상세 페이지 이동 */}
          <Link
            to={`/spirits/${spirit.id}`}
            className="flex-1 flex items-center gap-3 min-w-0 focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
            aria-label={primaryName}
          >
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge variant={spirit.category} size="sm">
                  {t(`spirit.category.${spirit.category}`)}
                </Badge>
                {spirit.country && (
                  <span className="text-xs text-neutral-400">{countryLabel}</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 line-clamp-1 leading-snug">
                {primaryName}
              </h3>
              <p className="text-xs text-neutral-400 line-clamp-1">{secondaryName}</p>
            </div>

            <div className="flex-shrink-0 flex flex-col items-end gap-1 pr-1">
              {spirit.avgScore != null && (
                <span className="text-sm font-bold" style={{ color: scoreColor(spirit.avgScore) }}>
                  ★ {spirit.avgScore.toFixed(1)}
                </span>
              )}
              {spirit.reviewCount > 0 && (
                <span className="text-xs text-neutral-400">
                  {t('review.count', { n: spirit.reviewCount.toLocaleString() })}
                </span>
              )}
            </div>
          </Link>
        </article>

        {spirit.primaryImageUrl && (
          <ImageLightbox
            images={[spirit.primaryImageUrl]}
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </div>
    )
  }

  // 메타 라인: "국가 · 도수%" — 값이 있는 항목만 노출
  const metaParts: string[] = []
  if (spirit.country) metaParts.push(countryLabel)
  if (spirit.abv != null) metaParts.push(`${spirit.abv}%`)

  return (
    <article
      className={`group relative bg-white rounded-2xl shadow-sm overflow-hidden
        transition-all duration-300 ease-out
        hover:shadow-xl hover:-translate-y-1 motion-reduce:hover:translate-y-0 ${className}`}
    >
      {/* 이미지 */}
      <div className="relative aspect-[3/4] overflow-hidden bg-white">
        {spirit.primaryImageUrl ? (
          <img
            src={spirit.primaryImageUrl}
            alt={primaryName}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <PlaceholderImage />
        )}

        {/* 카테고리 오버레이 (좌상단) — 클릭 통과 */}
        <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md text-[11px] font-semibold
          bg-black/45 text-white backdrop-blur-sm pointer-events-none">
          {t(`spirit.category.${spirit.category}`)}
        </span>

        {/* 확대 버튼 (우상단) — 이 버튼만 라이트박스, 나머지 영역은 상세보기 */}
        {spirit.primaryImageUrl && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightboxOpen(true) }}
            aria-label={t('spirit.zoomImage')}
            className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm
              text-neutral-700 shadow-sm flex items-center justify-center
              hover:bg-white hover:text-neutral-900 transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </button>
        )}
      </div>

      {/* 정보 */}
      <div className="px-2.5 py-2">
        {/* 이름 + 점수 (한 줄) */}
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-1 leading-tight min-w-0">
            {primaryName}
          </h3>
          {spirit.avgScore != null && (
            <span className="flex-shrink-0 text-xs font-bold" style={{ color: scoreColor(spirit.avgScore) }}>
              ★ {spirit.avgScore.toFixed(1)}
            </span>
          )}
        </div>

        <p className="text-xs text-neutral-400 line-clamp-1 mb-1">{secondaryName}</p>

        {/* 국가 · 도수 + 리뷰수 */}
        <div className="flex items-center justify-between gap-1.5 text-xs text-neutral-500">
          <span className="line-clamp-1 min-w-0">{metaParts.join(' · ')}</span>
          {spirit.reviewCount > 0 && (
            <span className="flex-shrink-0 text-neutral-400">
              {t('review.count', { n: spirit.reviewCount.toLocaleString() })}
            </span>
          )}
        </div>
      </div>

      {/* 카드 전체를 덮는 상세 링크(stretched link) — 확대 버튼(z-20)보다 아래(z-10) */}
      <Link
        to={`/spirits/${spirit.id}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
        aria-label={primaryName}
      />

      {spirit.primaryImageUrl && (
        <ImageLightbox
          images={[spirit.primaryImageUrl]}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </article>
  )
}
