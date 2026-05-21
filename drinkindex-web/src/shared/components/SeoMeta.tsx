/**
 * 페이지별 SEO/OG/JSON-LD 메타 설정 컴포넌트.
 *
 * React 19 의 메타 태그 자동 hoist 기능 활용 — 별도 helmet 라이브러리 불필요.
 * 컴포넌트 트리에서 렌더링된 <title>, <meta>, <link>, <script type="application/ld+json">
 * 은 React 가 자동으로 <head> 로 올려줌.
 *
 * 사용법:
 *   <SeoMeta
 *     title="라프로익 10년 — DrinkIndex"
 *     description="라프로익 10년의 테이스팅 노트와 사용자 평점을 확인하세요."
 *     canonical="https://drinkindex.net/spirits/123"
 *     ogImage="https://drinkindex.net/uploads/spirit/123.jpg"
 *     jsonLd={{ "@type": "Product", ... }}
 *   />
 */
interface JsonLd {
  '@context'?: string
  '@type': string
  [key: string]: unknown
}

interface Props {
  title: string
  description?: string
  canonical?: string
  ogType?: 'website' | 'article' | 'product'
  ogImage?: string
  ogImageAlt?: string
  keywords?: string
  noindex?: boolean
  jsonLd?: JsonLd | JsonLd[]
  locale?: 'ko_KR' | 'en_US'
}

const SITE_NAME = 'DrinkIndex'
const DEFAULT_OG_IMAGE = 'https://drinkindex.net/og-image.png'

export default function SeoMeta({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt,
  keywords,
  noindex = false,
  jsonLd,
  locale = 'ko_KR',
}: Props) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`
  const jsonLdArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={locale} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:image" content={ogImage} />
      {ogImageAlt && <meta property="og:image:alt" content={ogImageAlt} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />

      {jsonLdArray.map((schema, idx) => (
        <script
          key={`ld-${idx}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({ '@context': 'https://schema.org', ...schema }),
          }}
        />
      ))}
    </>
  )
}
