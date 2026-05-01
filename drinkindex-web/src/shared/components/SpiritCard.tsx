import { Link } from 'react-router-dom'
import Badge from './Badge'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'

export interface SpiritCardProps {
  spirit: SpiritListItem
  className?: string
}

function PlaceholderImage() {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-neutral-50 text-neutral-300"
      aria-hidden="true"
    >
      <span className="text-3xl">🥃</span>
    </div>
  )
}

const CATEGORY_LABEL: Record<string, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', TEQUILA: '데낄라',
  RUM: '럼', GIN: '진', VODKA: '보드카', OTHER: '기타',
}

export default function SpiritCard({ spirit, className = '' }: SpiritCardProps) {
  return (
    <Link
      to={`/spirits/${spirit.id}`}
      className={`group block focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-2xl ${className}`}
      aria-label={`${spirit.nameKo} 상세 보기`}
    >
      <article className="bg-white rounded-2xl shadow-sm overflow-hidden
        hover:shadow-md transition-shadow duration-200">
        {/* Image */}
        <div className="aspect-square overflow-hidden bg-neutral-100">
          {spirit.primaryImageUrl ? (
            <img
              src={spirit.primaryImageUrl}
              alt={spirit.nameKo}
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
            {CATEGORY_LABEL[spirit.category] ?? spirit.category}
          </Badge>

          <div>
            <h3 className="text-sm font-semibold text-neutral-900 line-clamp-1 leading-snug">
              {spirit.nameKo}
            </h3>
            <p className="text-xs text-neutral-400 line-clamp-1">{spirit.nameEn}</p>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            {spirit.country && (
              <span className="text-xs text-neutral-400">{spirit.country}</span>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {spirit.avgScore != null && (
                <span className="text-xs font-bold text-primary-600">
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
