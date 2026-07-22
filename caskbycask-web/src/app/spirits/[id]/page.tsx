import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import ClientAppWrapper from '@/app/ClientAppWrapper'
import SeoFallback from '@/app/SeoFallback'
import { getSpiritDetailJsonLd, getSpiritDetailMetadata, getSpiritSeoSnapshot } from '@/shared/utils/seoHelpers'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return getSpiritDetailMetadata(id, null)
}

export default async function SpiritDetailSSRPage({ params }: Props) {
  const { id } = await params
  if ((await headers()).get('x-caskbycask-spirit-not-found') === '1') notFound()
  const [jsonLdData, snapshot] = await Promise.all([
    getSpiritDetailJsonLd(id, null),
    getSpiritSeoSnapshot(id, null),
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
