import { Metadata } from 'next'
import ClientAppWrapper from '@/app/ClientAppWrapper'
import { getSpiritsListMetadata } from '@/shared/utils/seoHelpers'

export const metadata: Metadata = getSpiritsListMetadata(null)

export default function SpiritListSSRPage() {
  return <ClientAppWrapper />
}
