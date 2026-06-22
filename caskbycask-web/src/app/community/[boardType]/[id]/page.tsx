import { Metadata } from 'next'
import ClientAppWrapper from '@/app/ClientAppWrapper'
import { getCommunityPostMetadata, getCommunityPostJsonLd } from '@/shared/utils/seoHelpers'

interface Props {
  params: Promise<{ boardType: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boardType, id } = await params
  return getCommunityPostMetadata(boardType, id, null)
}

export default async function CommunityPostSSRPage({ params }: Props) {
  const { boardType, id } = await params
  const jsonLdData = await getCommunityPostJsonLd(boardType, id, null)

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
