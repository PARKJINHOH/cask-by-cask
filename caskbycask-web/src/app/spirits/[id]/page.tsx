import { Metadata } from 'next'
import ClientAppWrapper from '@/app/ClientAppWrapper'
import { getSpiritDetailMetadata } from '@/shared/utils/seoHelpers'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return getSpiritDetailMetadata(id, null)
}

export default function SpiritDetailSSRPage() {
  return <ClientAppWrapper />
}
