import { Metadata } from 'next'
import ClientAppWrapper from '@/app/ClientAppWrapper'

interface Props {
  params: { id: string }
}

const API_URL = process.env.INTERNAL_API_URL || 'http://localhost:8080'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params
  
  try {
    const res = await fetch(`${API_URL}/api/spirits/${id}`, {
      next: { revalidate: 3600 }, // 1시간 동안 캐싱 (ISR)
    })
    
    if (!res.ok) {
      return {
        title: '주류 상세 정보 및 리뷰 (Specs & Reviews) — CaskByCask',
        description: 'CaskByCask에서 각 주류의 상세 정보와 평점 리뷰를 확인해 보세요. Explore detailed specifications and ratings for various spirits.',
      }
    }
    
    const responseData = await res.json()
    const spirit = responseData.data
    
    if (!spirit) {
      return {
        title: '존재하지 않는 주류 — CaskByCask',
      }
    }

    const title = spirit.nameEn 
      ? `${spirit.nameKo} (${spirit.nameEn}) 주류 정보 & 리뷰 (Specs & Reviews) — CaskByCask` 
      : `${spirit.nameKo} 주류 정보 & 리뷰 (Specs & Reviews) — CaskByCask`
      
    const category = spirit.categoryLabel || spirit.category || '주류'
    const abv = spirit.abv ? `도수 ${spirit.abv}%` : ''
    const abvEn = spirit.abv ? `ABV ${spirit.abv}%` : ''
    const age = spirit.commonDetail?.ageStatement ? `${spirit.commonDetail.ageStatement}년 숙성` : ''
    const ageEn = spirit.commonDetail?.ageStatement ? `${spirit.commonDetail.ageStatement}yo` : ''
    const description = `${spirit.nameKo}의 원산지, ${abv}, ${age} 캐스크 정보 등 상세한 주류 정보와 함께 테이스팅 노트 및 평점(${spirit.scoreAvg ?? 0}점) 리뷰를 만나보세요. Discover detailed specs (${abvEn}, ${ageEn}), tasting notes, and ratings for ${spirit.nameEn || spirit.nameKo} on CaskByCask.`
    
    const canonical = `https://caskbycask.net/spirits/${id}`
    const ogImage = spirit.imageUrl || 'https://caskbycask.net/og-image.png'

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        url: canonical,
        images: [
          {
            url: ogImage,
            alt: title,
          },
        ],
        type: 'website',
        siteName: 'CaskByCask',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    }
  } catch (error) {
    return {
      title: '주류 상세 정보 및 리뷰 (Specs & Reviews) — CaskByCask',
      description: 'CaskByCask에서 각 주류의 상세 정보와 평점 리뷰를 확인해 보세요. Explore detailed specifications and ratings for various spirits.',
    }
  }
}

export default function SpiritDetailSSRPage() {
  return <ClientAppWrapper />
}
