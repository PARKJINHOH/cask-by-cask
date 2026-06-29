import { Metadata } from 'next'
import ClientAppWrapper from '@/app/ClientAppWrapper'
import { getSpiritDetailJsonLd, getSpiritDetailMetadata } from '@/shared/utils/seoHelpers'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return getSpiritDetailMetadata(id, null)
}

export default async function SpiritDetailSSRPage({ params }: Props) {
  const { id } = await params
  const jsonLdData = await getSpiritDetailJsonLd(id, null)

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
