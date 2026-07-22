import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ClientAppWrapper from '@/app/ClientAppWrapper'
import SeoFallback from '@/app/SeoFallback'
import {
  extractLeadingId,
  getByobPostMetadata,
  getByobPostJsonLd,
  getByobPostSeoSnapshot,
  isApiResourceNotFound,
} from '@/shared/utils/seoHelpers'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return getByobPostMetadata(id, null)
}

export default async function ByobPostSSRPage({ params }: Props) {
  const { id } = await params
  const [jsonLdData, snapshot] = await Promise.all([
    getByobPostJsonLd(id, null),
    getByobPostSeoSnapshot(id, null),
  ])
  const numericId = extractLeadingId(id)
  if (!snapshot && numericId
      && await isApiResourceNotFound(`/api/byob/${numericId}`)) notFound()

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
