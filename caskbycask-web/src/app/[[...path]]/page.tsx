import { Metadata } from 'next'
import ClientAppWrapper from '@/app/ClientAppWrapper'
import SeoFallback from '@/app/SeoFallback'
import type { SeoSnapshotData } from '@/shared/utils/seoHelpers'
import {
  parsePath,
  getDefaultMetadata,
  getSpiritsListMetadata,
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
  getNoindexMetadata,
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
    case 'default':
      return getDefaultMetadata(parsed.lang)
    case 'spirits-list':
      return getSpiritsListMetadata(parsed.lang)
    case 'spirit-detail':
      return getSpiritDetailMetadata(parsed.spiritId!, parsed.lang)
    case 'community-list':
    case 'notices-list':
      return getBoardListMetadata(
        parsed.boardListType!,
        parsed.lang,
        isBoardListNoindex(parsed.boardListType!, resolvedSearchParams),
      )
    case 'community-detail':
      return getCommunityPostMetadata(parsed.boardType!, parsed.postId!, parsed.lang)
    case 'notice-detail':
      return getNoticeDetailMetadata(parsed.postId!, parsed.lang)
    case 'byob-detail':
      return getByobPostMetadata(parsed.postId!, parsed.lang)
    case 'noindex':
      return getNoindexMetadata(parsed.lang)
    default:
      return getNoindexMetadata(parsed.lang)
  }
}

export default async function CatchAllPage({ params, searchParams }: Props) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams])
  const pathSegments = resolvedParams.path || []
  const parsed = parsePath(pathSegments)

  let jsonLdData: object | null = null
  let snapshot: SeoSnapshotData | null = null
  if (parsed.type === 'community-list' || parsed.type === 'notices-list') {
    snapshot = await getBoardListSeoSnapshot(parsed.boardListType!, parsed.lang)
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
  }

  return (
    <>
      {jsonLdData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData).replace(/</g, '\\u003c') }}
        />
      )}
      <ClientAppWrapper>
        <SeoFallback snapshot={snapshot} />
      </ClientAppWrapper>
    </>
  )
}
