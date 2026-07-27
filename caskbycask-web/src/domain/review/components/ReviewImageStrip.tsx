import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ImageLightbox from '@/shared/components/ImageLightbox'
import type { ReviewImageItem } from '../types/review.types'

interface Props {
  images?: ReviewImageItem[]
  compact?: boolean
  className?: string
}

export default function ReviewImageStrip({ images = [], compact = false, className = '' }: Props) {
  const { t } = useTranslation()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  if (images.length === 0) return null
  const urls = images.map((image) => image.imageUrl)

  return (
    <>
      <div className={`flex items-center gap-1.5 ${className}`}>
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setLightboxIndex(index)}
            aria-label={t('review.images.open', { number: index + 1 })}
            className={`shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 transition hover:border-primary-300 hover:opacity-90 ${
              compact ? 'h-10 w-8' : 'h-10 w-8 sm:h-12 sm:w-[2.4rem]'
            }`}
          >
            <img
              src={image.imageUrl}
              alt={t('review.images.previewAlt', { number: index + 1 })}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
      <ImageLightbox
        images={urls}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex != null}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  )
}
