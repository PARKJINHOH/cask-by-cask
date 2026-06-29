import { Metadata } from 'next'
import ClientAppWrapper from '@/app/ClientAppWrapper'
import {
  parsePath,
  getDefaultMetadata,
  getSpiritsListMetadata,
  getSpiritDetailMetadata,
  getSpiritDetailJsonLd,
  getCommunityPostMetadata,
  getCommunityPostJsonLd,
  getByobPostMetadata,
  getByobPostJsonLd,
} from '@/shared/utils/seoHelpers'

interface Props {
  params: Promise<{ path?: string[] }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
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
    case 'community-detail':
      return getCommunityPostMetadata(parsed.boardType!, parsed.postId!, parsed.lang)
    case 'byob-detail':
      return getByobPostMetadata(parsed.postId!, parsed.lang)
    default:
      return getDefaultMetadata(parsed.lang)
  }
}

export default async function CatchAllPage({ params }: Props) {
  const resolvedParams = await params
  const pathSegments = resolvedParams.path || []
  const parsed = parsePath(pathSegments)

  let jsonLdData: object | null = null
  if (parsed.type === 'spirit-detail') {
    jsonLdData = await getSpiritDetailJsonLd(parsed.spiritId!, parsed.lang)
  } else if (parsed.type === 'community-detail') {
    jsonLdData = await getCommunityPostJsonLd(parsed.boardType!, parsed.postId!, parsed.lang)
  } else if (parsed.type === 'byob-detail') {
    jsonLdData = await getByobPostJsonLd(parsed.postId!, parsed.lang)
  }

  return (
    <>
      {jsonLdData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData).replace(/</g, '\\u003c') }}
        />
      )}
      <ClientAppWrapper />
    </>
  )
}
