import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ClientAppWrapper from '@/app/ClientAppWrapper'
import SeoFallback from '@/app/SeoFallback'
import {
  extractLeadingId,
  getCommunityPostMetadata,
  getCommunityPostJsonLd,
  getCommunityPostSeoSnapshot,
  isApiResourceNotFound,
} from '@/shared/utils/seoHelpers'

interface Props {
  params: Promise<{ boardType: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boardType, id } = await params
  return getCommunityPostMetadata(boardType, id, null)
}

export default async function CommunityPostSSRPage({ params }: Props) {
  const { boardType, id } = await params
  const [jsonLdData, snapshot] = await Promise.all([
    getCommunityPostJsonLd(boardType, id, null),
    getCommunityPostSeoSnapshot(boardType, id, null),
  ])
  const numericId = extractLeadingId(id)
  if (!snapshot && numericId
      && await isApiResourceNotFound(`/api/posts/${numericId}`)) notFound()

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
