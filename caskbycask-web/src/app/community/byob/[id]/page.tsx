import { Metadata } from 'next'
import ClientAppWrapper from '@/app/ClientAppWrapper'

interface Props {
  params: { id: string }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// HTML 태그 제거 및 텍스트 요약 유틸리티
function stripHtmlAndSummarize(htmlStr: string, maxLength = 150): string {
  if (!htmlStr) return ''
  const cleanText = htmlStr
    .replace(/<[^>]*>/g, ' ') // HTML 태그 제거
    .replace(/\s+/g, ' ') // 공백 단일화
    .trim()
  if (cleanText.length <= maxLength) return cleanText
  return cleanText.substring(0, maxLength) + '...'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params
  
  try {
    const res = await fetch(`${API_URL}/api/byob/${id}`, {
      next: { revalidate: 60 },
    })
    
    if (!res.ok) {
      return {
        title: 'BYOB 모임 상세 — CaskByCask',
        description: 'CaskByCask BYOB(Bring Your Own Bottle) 모임에서 함께 주류를 나누어 즐겨 보세요.',
      }
    }
    
    const responseData = await res.json()
    const byob = responseData.data
    
    if (!byob) {
      return {
        title: '존재하지 않는 BYOB 모임 — CaskByCask',
      }
    }

    const title = `${byob.title} (BYOB 모임) — CaskByCask`
    const description = stripHtmlAndSummarize(byob.content) || 'CaskByCask BYOB 주류 공유 모임 모집글 상세 페이지입니다.'
    const canonical = `https://caskbycask.net/community/byob/${id}`
    const ogImage = byob.imageUrl || 'https://caskbycask.net/og-image.png'

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
      title: 'BYOB 모임 상세 — CaskByCask',
      description: 'CaskByCask BYOB 주류 공유 모임 정보를 확인해 보세요.',
    }
  }
}

export default async function ByobPostSSRPage({ params }: Props) {
  const { id } = params
  let jsonLdData: object | null = null

  try {
    const res = await fetch(`${API_URL}/api/byob/${id}`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const responseData = await res.json()
      const byob = responseData.data
      if (byob) {
        // BYOB 모임은 Event 성격을 지니므로 Event + DiscussionForumPosting 복합 데이터 구성
        jsonLdData = {
          '@context': 'https://schema.org',
          '@type': 'Event',
          'name': byob.title,
          'description': stripHtmlAndSummarize(byob.content, 300),
          'startDate': byob.meetingDate || byob.createdAt,
          'eventStatus': 'https://schema.org/EventScheduled',
          'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
          'location': {
            '@type': 'Place',
            'name': byob.locationName || '상세 주소는 본문 참조',
            'address': {
              '@type': 'PostalAddress',
              'streetAddress': byob.address || '상세 장소',
              'addressLocality': byob.region || '지역',
              'addressCountry': 'KR',
            },
          },
          'organizer': {
            '@type': 'Person',
            'name': byob.hostNickname || 'Host',
          },
        }
      }
    }
  } catch (e) {
    // Graceful error handling for JSON-LD fetch
  }

  return (
    <>
      {jsonLdData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      )}
      <ClientAppWrapper />
    </>
  )
}
