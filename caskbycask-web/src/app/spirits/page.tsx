import { Metadata } from 'next'
import ClientAppWrapper from '@/app/ClientAppWrapper'

const canonical = 'https://caskbycask.net/spirits'

export const metadata: Metadata = {
  title: '주류 정보 탐색 및 상세 검색 (Search Liquor Specs & Reviews) — CaskByCask',
  description: '위스키, 와인, 꼬냑 등 전 세계 모든 주류의 상세 정보와 평점 리뷰를 탐색해 보세요. Explore detailed specifications, user ratings, and reviews of global spirits.',
  alternates: {
    canonical,
  },
  openGraph: {
    title: '주류 정보 탐색 및 상세 검색 (Search Liquor Specs & Reviews) — CaskByCask',
    description: '위스키, 와인, 꼬냑 등 전 세계의 다양한 주류 상세 정보와 테이스팅 노트 및 평점 리뷰를 간편하게 검색하세요. Search detailed specifications, tasting notes, and ratings of various spirits.',
    url: canonical,
    type: 'website',
    images: [
      {
        url: 'https://caskbycask.net/og-image.png',
        alt: 'CaskByCask 주류 정보 탐색 (Specs & Reviews)',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '주류 정보 탐색 및 상세 검색 (Search Liquor Specs & Reviews) — CaskByCask',
    description: '전 세계의 다양한 주류 상세 정보와 리뷰 평점을 쉽고 빠르게 탐색해 보세요. Easily discover detailed specifications, tasting notes and ratings of global spirits.',
    images: ['https://caskbycask.net/og-image.png'],
  },
}

export default function SpiritListSSRPage() {
  return <ClientAppWrapper />
}
