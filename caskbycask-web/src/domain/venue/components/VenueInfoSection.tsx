'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buildMapAppLinks, telHref } from '@/domain/venue/utils/mapAppLinks'
import type { VenueDetail } from '@/domain/venue/types/venue.types'

interface Props {
  detail: VenueDetail
  className?: string
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5">
      <dt className="w-16 shrink-0 text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-neutral-800">{children}</dd>
    </div>
  )
}

/**
 * 장소 정보 — 지도 앱 패널과 문서 페이지가 함께 쓴다.
 *
 * <p>같은 정보를 두 곳에서 각각 그리면 반드시 어긋난다. 두 화면의 차이는 바깥 껍데기(스크롤·폭)일
 * 뿐이므로 안쪽은 이 컴포넌트 하나로 둔다.
 */
export default function VenueInfoSection({ detail, className }: Props) {
  const { t, i18n } = useTranslation()
  const [copied, setCopied] = useState(false)
  const venue = detail.summary
  const isEn = i18n.language === 'en'
  const description = isEn
    ? detail.descriptionEn || detail.descriptionKo
    : detail.descriptionKo || detail.descriptionEn

  const fullAddress = venue.addressDetail
    ? `${venue.address} ${venue.addressDetail}`
    : venue.address

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(fullAddress)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // 클립보드 권한이 없거나 비보안 컨텍스트면 조용히 넘어간다 — 주소는 화면에 그대로 보인다.
    }
  }

  return (
    <div className={className}>
      <dl className="divide-y divide-neutral-100">
        <Row label={t('venue.detail.address', '주소')}>
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 break-keep">{fullAddress}</span>
            <button
              type="button"
              onClick={copyAddress}
              className="shrink-0 border border-neutral-300 px-2 py-1 text-xs text-neutral-600
                hover:bg-neutral-50"
            >
              {copied ? t('venue.detail.copied', '복사됨') : t('venue.detail.copy', '복사')}
            </button>
          </div>
        </Row>

        {detail.openingHours && (
          <Row label={t('venue.detail.hours', '영업시간')}>
            {/* 자유 텍스트라 줄바꿈을 그대로 살린다 */}
            <span className="whitespace-pre-line">{detail.openingHours}</span>
          </Row>
        )}

        {detail.phone && (
          <Row label={t('venue.detail.phone', '전화')}>
            <a href={telHref(detail.phone)} className="text-primary-700 underline">
              {detail.phone}
            </a>
          </Row>
        )}

        {(detail.website || detail.instagramUrl) && (
          <Row label={t('venue.detail.links', '링크')}>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {detail.website && (
                <a
                  href={detail.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary-700 underline"
                >
                  {t('venue.detail.website', '웹사이트')}
                </a>
              )}
              {detail.instagramUrl && (
                <a
                  href={detail.instagramUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary-700 underline"
                >
                  Instagram
                </a>
              )}
            </div>
          </Row>
        )}

        <Row label={t('venue.detail.mapApps', '지도 앱')}>
          <div className="flex flex-wrap gap-2">
            {buildMapAppLinks(detail).map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="border border-neutral-300 px-2.5 py-1 text-xs text-neutral-700
                  hover:bg-neutral-50"
              >
                {link.label}
              </a>
            ))}
          </div>
        </Row>
      </dl>

      {description && (
        <p className="mt-4 whitespace-pre-line break-keep text-sm leading-relaxed text-neutral-700">
          {description}
        </p>
      )}
    </div>
  )
}
