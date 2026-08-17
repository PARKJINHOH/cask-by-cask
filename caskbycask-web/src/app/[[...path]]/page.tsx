import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import ClientAppWrapper from '@/app/ClientAppWrapper'
import SeoFallback from '@/app/SeoFallback'
import type { SeoSnapshotData } from '@/shared/utils/seoHelpers'
import {
  parsePath,
  getDefaultMetadata,
  getPublicRouteMetadata,
  getHomeSeoSnapshot,
  getTierListMetadata,
  getTierListSeoSnapshot,
  getSpiritsListMetadata,
  getSpiritsListJsonLd,
  getSpiritsListSeoSnapshot,
  getSpiritDetailMetadata,
  getSpiritDetailJsonLd,
  getSpiritSeoSnapshot,
  getCommunityPostMetadata,
  getCommunityPostJsonLd,
  getCommunityPostSeoSnapshot,
  getByobPostMetadata,
  getByobPostJsonLd,
  getByobPostSeoSnapshot,
  getBoardListMetadata,
  getBoardListSeoSnapshot,
  buildBoardListJsonLd,
  isBoardListNoindex,
  getNoticeDetailMetadata,
  getNoticeDetailJsonLd,
  getNoticeDetailSeoSnapshot,
  getYoutubeListMetadata,
  getYoutubeListSeoSnapshot,
  getYoutubeVideoMetadata,
  getYoutubeVideoJsonLd,
  getYoutubeVideoSeoSnapshot,
  getYoutubeChannelMetadata,
  getYoutubeChannelJsonLd,
  getYoutubeChannelSeoSnapshot,
  getNoindexMetadata,
  getPublicReviewMetadata,
  isApiResourceNotFound,
  readPageParam,
} from '@/shared/utils/seoHelpers'

interface Props {
  params: Promise<{ path?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams])
  const pathSegments = resolvedParams.path || []
  const parsed = parsePath(pathSegments)

  switch (parsed.type) {
    case 'home':
      return getDefaultMetadata(parsed.lang)
    case 'default':
      return getPublicRouteMetadata(parsed.lang, parsed.canonicalPath)
    case 'tier-list':
      return getTierListMetadata(parsed.lang, parsed.tierListShareKey, resolvedSearchParams)
    case 'spirits-list':
      return getSpiritsListMetadata(parsed.lang, resolvedSearchParams)
    case 'spirit-detail':
      return getSpiritDetailMetadata(parsed.spiritId!, parsed.lang)
    case 'community-list':
    case 'notices-list':
      return getBoardListMetadata(
        parsed.boardListType!,
        parsed.lang,
        isBoardListNoindex(parsed.boardListType!, resolvedSearchParams),
        readPageParam(resolvedSearchParams),
      )
    case 'community-detail':
      return getCommunityPostMetadata(parsed.boardType!, parsed.postId!, parsed.lang)
    case 'notice-detail':
      return getNoticeDetailMetadata(parsed.postId!, parsed.lang)
    case 'byob-detail':
      return getByobPostMetadata(parsed.postId!, parsed.lang)
    case 'youtube-list':
      // 필터·검색이 걸린 목록은 본 목록과 내용이 겹친다 — 색인은 맨 주소 하나만 받는다.
      return getYoutubeListMetadata(
        parsed.lang,
        ['type', 'q', 'v', 'spirit'].some((key) => Boolean(resolvedSearchParams[key])),
      )
    case 'youtube-detail':
      return getYoutubeVideoMetadata(parsed.youtubeVideoKey!, parsed.lang)
    case 'youtube-channel':
      return getYoutubeChannelMetadata(parsed.youtubeChannelRef!, parsed.lang)
    case 'review-detail':
      // 리뷰를 찾지 못하면 색인 대상이 아니라는 판정만 남긴다.
      return (await getPublicReviewMetadata(parsed.reviewId!, parsed.lang))
        ?? getNoindexMetadata(parsed.lang, '리뷰 — CaskByCask')
    case 'noindex':
    case 'not-found':
      return getNoindexMetadata(parsed.lang)
    default:
      return getNoindexMetadata(parsed.lang)
  }
}

export default async function CatchAllPage({ params, searchParams }: Props) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams])
  const pathSegments = resolvedParams.path || []
  const parsed = parsePath(pathSegments)
  if (parsed.type === 'not-found') notFound()
  if (parsed.type === 'spirit-detail'
      && (await headers()).get('x-caskbycask-spirit-not-found') === '1') notFound()
  if ((parsed.type === 'default' || parsed.type === 'tier-list') && parsed.resourcePath
      && await isApiResourceNotFound(parsed.resourcePath)) notFound()

  let jsonLdData: object | null = null
  let snapshot: SeoSnapshotData | null = null
  if (parsed.type === 'home') {
    snapshot = await getHomeSeoSnapshot(parsed.lang)
  } else if (parsed.type === 'spirits-list') {
    ;[jsonLdData, snapshot] = await Promise.all([
      getSpiritsListJsonLd(parsed.lang, resolvedSearchParams),
      getSpiritsListSeoSnapshot(parsed.lang, resolvedSearchParams),
    ])
  } else if (parsed.type === 'community-list' || parsed.type === 'notices-list') {
    snapshot = await getBoardListSeoSnapshot(parsed.boardListType!, parsed.lang, resolvedSearchParams)
    if (!isBoardListNoindex(parsed.boardListType!, resolvedSearchParams)) {
      jsonLdData = buildBoardListJsonLd(parsed.boardListType!, snapshot)
    }
  } else if (parsed.type === 'spirit-detail') {
    ;[jsonLdData, snapshot] = await Promise.all([
      getSpiritDetailJsonLd(parsed.spiritId!, parsed.lang),
      getSpiritSeoSnapshot(parsed.spiritId!, parsed.lang),
    ])
  } else if (parsed.type === 'community-detail') {
    ;[jsonLdData, snapshot] = await Promise.all([
      getCommunityPostJsonLd(parsed.boardType!, parsed.postId!, parsed.lang),
      getCommunityPostSeoSnapshot(parsed.boardType!, parsed.postId!, parsed.lang),
    ])
  } else if (parsed.type === 'notice-detail') {
    ;[jsonLdData, snapshot] = await Promise.all([
      getNoticeDetailJsonLd(parsed.postId!, parsed.lang),
      getNoticeDetailSeoSnapshot(parsed.postId!, parsed.lang),
    ])
  } else if (parsed.type === 'byob-detail') {
    ;[jsonLdData, snapshot] = await Promise.all([
      getByobPostJsonLd(parsed.postId!, parsed.lang),
      getByobPostSeoSnapshot(parsed.postId!, parsed.lang),
    ])
  } else if (parsed.type === 'youtube-list') {
    snapshot = await getYoutubeListSeoSnapshot(parsed.lang)
  } else if (parsed.type === 'youtube-detail') {
    ;[jsonLdData, snapshot] = await Promise.all([
      getYoutubeVideoJsonLd(parsed.youtubeVideoKey!),
      getYoutubeVideoSeoSnapshot(parsed.youtubeVideoKey!, parsed.lang),
    ])
  } else if (parsed.type === 'youtube-channel') {
    ;[jsonLdData, snapshot] = await Promise.all([
      getYoutubeChannelJsonLd(parsed.youtubeChannelRef!),
      getYoutubeChannelSeoSnapshot(parsed.youtubeChannelRef!, parsed.lang),
    ])
  } else if (parsed.type === 'tier-list' && !parsed.tierListShareKey) {
    snapshot = getTierListSeoSnapshot(parsed.lang)
  }

  if (!snapshot && parsed.resourcePath
      && await isApiResourceNotFound(parsed.resourcePath)) notFound()

  return (
    <>
      {jsonLdData && (
        <script
          type="application/ld+json"
          data-cbc-route-jsonld="true"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData).replace(/</g, '\\u003c') }}
        />
      )}
      <ClientAppWrapper>
        <SeoFallback snapshot={snapshot} />
      </ClientAppWrapper>
    </>
  )
}
