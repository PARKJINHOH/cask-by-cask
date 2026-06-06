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
        <article className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200
          flex items-center gap-3 p-3">

          {/* 썸네일 — 클릭 시 라이트박스 */}
          {spirit.primaryImageUrl ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={primaryName}
              className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100
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
            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
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

  return (
    <Link
      to={`/spirits/${spirit.id}`}
      className={`group block focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-2xl ${className}`}
      aria-label={primaryName}
    >
      <article className="bg-white rounded-2xl shadow-sm overflow-hidden
        hover:shadow-md transition-shadow duration-200">
        {/* Image */}
        <div className="aspect-square overflow-hidden bg-neutral-100">
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
        </div>

        {/* Info */}
        <div className="p-3 space-y-1.5">
          <Badge variant={spirit.category} size="sm">
            {t(`spirit.category.${spirit.category}`)}
          </Badge>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900 line-clamp-1 leading-snug">
              {primaryName}
            </h3>
            <p className="text-xs text-neutral-400 line-clamp-1">{secondaryName}</p>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            {spirit.country && (
              <span className="text-xs text-neutral-400">{countryLabel}</span>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {spirit.avgScore != null && (
                <span className="text-xs font-bold" style={{ color: scoreColor(spirit.avgScore) }}>
                  ★ {spirit.avgScore.toFixed(1)}
                </span>
              )}
              {spirit.reviewCount > 0 && (
                <span className="text-xs text-neutral-400">
                  {spirit.reviewCount.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
