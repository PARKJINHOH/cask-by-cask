'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import VenueInfoSection from '@/domain/venue/components/VenueInfoSection'
import VenueGallery from '@/domain/venue/components/VenueGallery'
import VenueHeroCarousel from '@/domain/venue/components/VenueHeroCarousel'
import VenueCommentThread from '@/domain/venue/components/VenueCommentThread'
import { useVenueDetail } from '@/domain/venue/hooks/useVenues'
import { useVenueComments, useVenueGallery } from '@/domain/venue/hooks/useVenueComments'
import { primaryDirectionsLink, telHref } from '@/domain/venue/utils/mapAppLinks'
import { venueDisplayName, type VenueSummary } from '@/domain/venue/types/venue.types'
import { venueTypeLabelKey } from '@/domain/venue/utils/venueLabels'

type Tab = 'info' | 'photos' | 'comments'

interface Props {
  venueId: number
  /** 목록에서 이미 받아 둔 요약. 있으면 상세를 기다리지 않고 먼저 그린다(깜빡임 방지). */
  fallbackSummary?: VenueSummary | null
  onBack?: () => void
  onClose?: () => void
  /** 문서 페이지에서는 "전체 페이지 보기"가 필요 없다. */
  showFullPageLink?: boolean
  /**
   * 어디에 얹혀 있는가.
   *
   * <p>{@code app} — 지도 패널·바텀시트처럼 <b>높이가 정해진</b> 그릇 안. 내용이 자체 스크롤한다.
   * <p>{@code document} — 문서 페이지. <b>페이지가 스크롤을 맡는다.</b> 여기서 내부 스크롤 영역을
   * 두면 높이 제약이 없어 넘칠 일이 없고, 그 위에서 굴린 휠은 {@code overscroll-contain} 에
   * 막혀 페이지로 전달되지도 않는다 — 사진 위에서 스크롤이 멈추는 증상이 이것이었다.
   */
  variant?: 'app' | 'document'
  className?: string
}

/**
 * 장소 상세 — 지도 앱 패널과 문서 페이지의 공용 알맹이.
 *
 * <p>히어로·이름·액션 3개는 <b>탭 밖에 고정</b>한다. 어느 탭을 보고 있든 "길찾기"가
 * 한 번에 눌리는 것이 이 화면의 목적이기 때문이다.
 *
 * <p>탭을 쓰는 이유는 댓글이 길어질 수 있어서다 — 세로로 쌓으면 사진을 보려고 한참
 * 스크롤해야 한다. 네이버·카카오가 만들어 놓은 사용자 기대와도 맞는다.
 */
export default function VenueDetailPanel({
  venueId,
  fallbackSummary,
  onBack,
  onClose,
  showFullPageLink = true,
  variant = 'app',
  className,
}: Props) {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<Tab>('info')
  const { data: detail, isLoading } = useVenueDetail(venueId)
  const { data: gallery } = useVenueGallery(venueId)
  const { data: comments } = useVenueComments(venueId)

  const summary = detail?.summary ?? fallbackSummary ?? null
  const photoCount = gallery?.length ?? 0
  const commentCount = (comments ?? []).reduce((sum, c) => sum + 1 + c.replies.length, 0)

  if (!summary) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  const name = venueDisplayName(summary, i18n.language)
  const cityName = i18n.language === 'en' ? summary.cityNameEn : summary.cityNameKo
  const heroUrls = (gallery ?? []).map((image) => image.imageUrl)
  const isDocument = variant === 'document'

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'info', label: t('venue.tab.info', '정보') },
    { key: 'photos', label: t('venue.tab.photos', '사진'), count: photoCount },
    { key: 'comments', label: t('venue.tab.comments', '후기'), count: commentCount },
  ]

  return (
    <div className={`flex min-h-0 flex-col ${className ?? ''}`}>
      {/* 상단 바 — 뒤로/전체페이지/닫기 */}
      {(onBack || onClose || showFullPageLink) && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-9 items-center rounded-lg px-2.5 text-sm text-neutral-600
                transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              ‹ {t('venue.panel.backToList', '목록')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            {showFullPageLink && (
              /* 옆의 닫기 버튼과 높이를 맞추고 테두리를 준다 — 링크처럼 보이면
                 누를 수 있는지 알기 어렵고, 높이가 다르면 헤더 정렬이 어긋난 것처럼 보인다. */
              <Link
                to={`/venues/${summary.id}`}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-neutral-300
                  bg-white px-2.5 text-xs font-medium text-neutral-700 transition-colors
                  hover:border-neutral-400 hover:bg-neutral-50"
              >
                {t('venue.panel.fullPage', '전체 페이지')}
                <span aria-hidden="true" className="text-[10px] text-neutral-400">↗</span>
              </Link>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close', '닫기')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400
                  transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* 스크롤 영역 — 문서 페이지에서는 페이지가 스크롤을 맡으므로 그릇만 남긴다 */}
      <div
        className={
          isDocument ? '' : 'min-h-0 flex-1 overflow-y-auto overscroll-contain'
        }
      >
        {/* 히어로 — 사진이 없으면 억지로 자리를 만들지 않는다 */}
        <VenueHeroCarousel urls={heroUrls} className="w-full" />

        <div className="px-4 pt-3">
          <p className="text-xs text-neutral-500">
            {t(venueTypeLabelKey(summary.venueType), summary.venueType)} · {cityName}
            {summary.status === 'CLOSED' && (
              <span className="ml-2 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
                {t('venue.status.closed', '폐업')}
              </span>
            )}
          </p>
          <h2 className="mt-0.5 break-keep text-lg font-bold text-neutral-900">{name}</h2>
          {summary.nameLocal && (
            <p className="text-sm text-neutral-400">{summary.nameLocal}</p>
          )}

          {/* 액션 3개 — 탭 밖에 두어 어디서든 한 번에 눌린다. 모바일 터치 타깃 44px 확보. */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {detail && (
              <a
                href={primaryDirectionsLink(detail).href}
                target="_blank"
                rel="noreferrer noopener"
                className="flex min-h-[44px] items-center justify-center rounded-lg bg-primary-800
                  text-sm font-medium text-white hover:bg-primary-900"
              >
                {t('venue.action.directions', '길찾기')}
              </a>
            )}
            <a
              href={detail?.phone ? telHref(detail.phone) : undefined}
              aria-disabled={!detail?.phone}
              className={`flex min-h-[44px] items-center justify-center rounded-lg border text-sm ${
                detail?.phone
                  ? 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                  : 'pointer-events-none border-neutral-200 text-neutral-300'
              }`}
            >
              {t('venue.action.call', '전화')}
            </a>
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/${i18n.language}/venues/${summary.id}`
                if (navigator.share) {
                  void navigator.share({ title: name, url }).catch(() => {})
                } else {
                  void navigator.clipboard?.writeText(url).catch(() => {})
                }
              }}
              className="flex min-h-[44px] items-center justify-center rounded-lg border
                border-neutral-300 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              {t('venue.action.share', '공유')}
            </button>
          </div>
        </div>

        {/* 탭 — 앱 패널에서만 고정한다. 문서 페이지에서 고정하면 GNB 아래로 파고든다. */}
        <div
          className={`z-10 mt-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur ${
            isDocument ? '' : 'sticky top-0'
          }`}
        >
          <div role="tablist" className="flex gap-1">
            {tabs.map((item) => (
              <button
                key={item.key}
                role="tab"
                aria-selected={tab === item.key}
                onClick={() => setTab(item.key)}
                className={`min-h-[44px] border-b-2 px-3 text-sm transition-colors ${
                  tab === item.key
                    ? 'border-primary-700 font-semibold text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {item.label}
                {item.count != null && item.count > 0 && (
                  <span className="ml-1 text-xs text-neutral-400">{item.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-8 pt-3">
          {isLoading && !detail ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              {tab === 'info' && detail && <VenueInfoSection detail={detail} />}
              {tab === 'photos' && <VenueGallery venueId={venueId} />}
              {tab === 'comments' && <VenueCommentThread venueId={venueId} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
