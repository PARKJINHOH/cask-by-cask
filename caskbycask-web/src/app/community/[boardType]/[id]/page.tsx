import { Metadata } from 'next'
import ClientAppWrapper from '@/app/ClientAppWrapper'

interface Props {
  params: { boardType: string; id: string }
}

const API_URL = process.env.INTERNAL_API_URL || 'http://localhost:8080'

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
  const { boardType, id } = params
  
  try {
    const res = await fetch(`${API_URL}/api/posts/${id}`, {
      next: { revalidate: 60 }, // 커뮤니티 글은 60초 캐싱 (실시간성 반영)
    })
    
    if (!res.ok) {
      return {
        title: '커뮤니티 게시글 — CaskByCask',
        description: 'CaskByCask 커뮤니티에서 유익한 주류 이야기를 만나보세요.',
      }
    }
    
    const responseData = await res.json()
    const post = responseData.data
    
    if (!post) {
      return {
        title: '존재하지 않는 게시글 — CaskByCask',
      }
    }

    const title = `${post.title} — CaskByCask`
    const description = stripHtmlAndSummarize(post.content) || 'CaskByCask 커뮤니티 게시글 상세 페이지입니다.'
    const canonical = `https://caskbycask.net/community/${boardType}/${id}`
    
    // 첫 번째 본문 이미지가 있다면 ogImage로 활용, 없으면 기본 ogImage
    const ogImage = post.imageUrl || 'https://caskbycask.net/og-image.png'

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
        type: 'article',
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
      title: '커뮤니티 게시글 — CaskByCask',
      description: 'CaskByCask 커뮤니티에서 다양한 정보를 확인해 보세요.',
    }
  }
}

export default async function CommunityPostSSRPage({ params }: Props) {
  const { boardType, id } = params
  let jsonLdData: object | null = null

  try {
    const res = await fetch(`${API_URL}/api/posts/${id}`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const responseData = await res.json()
      const post = responseData.data
      if (post) {
        // DiscussionForumPosting 구조화 데이터 구성
        jsonLdData = {
          '@context': 'https://schema.org',
          '@type': 'DiscussionForumPosting',
          'headline': post.title,
          'articleBody': stripHtmlAndSummarize(post.content, 500),
          'url': `https://caskbycask.net/community/${boardType}/${id}`,
          'datePublished': post.createdAt,
          'dateModified': post.updatedAt || post.createdAt,
          'author': {
            '@type': 'Person',
            'name': post.authorNickname || post.authorName || 'User',
          },
          'interactionStatistic': {
            '@type': 'InteractionCounter',
            'interactionType': 'https://schema.org/LikeAction',
            'userInteractionCount': post.likeCount || 0,
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
