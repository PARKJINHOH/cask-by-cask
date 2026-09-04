'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ImageLightbox from '@/shared/components/ImageLightbox'
import Spinner from '@/shared/components/Spinner'
import { useVenueGallery } from '@/domain/venue/hooks/useVenueComments'

interface Props {
  venueId: number
  className?: string
}

/**
 * 장소 사진 — 방문 후기에 달린 사진을 최신순으로 모은다.
 *
 * <p>별도 업로드 경로를 두지 않았다. 사진만 따로 올리게 하면 "누가 언제 찍었는지"가 사라져
 * 오래된 인테리어 사진이 영원히 대표로 남는다. 후기에 딸려 오면 자연히 최신이 앞에 온다.
 */
export default function VenueGallery({ venueId, className }: Props) {
  const { t } = useTranslation()
  const { data: images, isLoading } = useVenueGallery(venueId)
  const [index, setIndex] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  if (!images || images.length === 0) {
    return (
      <p className={`py-10 text-center text-sm text-neutral-400 ${className ?? ''}`}>
        {t('venue.gallery.empty', '아직 사진이 없어요. 후기에 사진을 함께 올려주세요.')}
      </p>
    )
  }

  const urls = images.map((image) => image.imageUrl)

  return (
    <div className={className}>
      {/* 모바일 3열 / 데스크톱 4열 — 썸네일이 손가락으로 누를 만한 크기를 유지한다 */}
      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {urls.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="block w-full overflow-hidden rounded-lg"
              aria-label={t('venue.gallery.openPhoto', '사진 크게 보기')}
            >
              {/* 고정 비율 박스 — 이미지가 늦게 와도 레이아웃이 밀리지 않는다 */}
              <span className="block aspect-square">
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {index !== null && (
        <ImageLightbox images={urls} initialIndex={index} open onClose={() => setIndex(null)} />
      )}
    </div>
  )
}
