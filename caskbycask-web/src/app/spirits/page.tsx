import { Metadata } from 'next'
import ClientAppWrapper from '@/app/ClientAppWrapper'
import SeoFallback from '@/app/SeoFallback'
import {
  getSpiritsListJsonLd,
  getSpiritsListMetadata,
  getSpiritsListSeoSnapshot,
  type MetadataSearchParams,
} from '@/shared/utils/seoHelpers'

interface Props {
  searchParams: Promise<MetadataSearchParams>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return getSpiritsListMetadata(null, await searchParams)
}

export default async function SpiritListSSRPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const [jsonLdData, snapshot] = await Promise.all([
    getSpiritsListJsonLd(null, resolvedSearchParams),
    getSpiritsListSeoSnapshot(null, resolvedSearchParams),
  ])

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
