import { SITE_NAME, DEFAULT_OG_IMAGE } from '@/shared/config/site'

/**
 * 페이지별 SEO/OG/JSON-LD 메타 설정 컴포넌트.
 *
 * React 19 의 메타 태그 자동 hoist 기능 활용 — 별도 helmet 라이브러리 불필요.
 * 컴포넌트 트리에서 렌더링된 <title>, <meta>, <link>, <script type="application/ld+json">
 * 은 React 가 자동으로 <head> 로 올려줌.
 *
 * 사용법:
 *   <SeoMeta
 *     title="라프로익 10년"
 *     description="라프로익 10년의 테이스팅 노트와 사용자 평점을 확인하세요."
 *     canonical="https://caskbycask.net/spirits/123"
 *     ogImage="https://caskbycask.net/uploads/spirit/123.jpg"
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
  const altLocale = locale === 'ko_KR' ? 'en_US' : 'ko_KR'

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

      {/* hreflang — SPA 단일 URL이지만 콘텐츠가 i18n 으로 양쪽 노출되므로
          동일 URL을 ko/en alternate 로 명시하고 x-default 도 추가.
          (정공법은 /en, /ko 경로 분리지만 현 SPA 구조에서는 동일 URL 시그널이 안전한 차선.) */}
      {canonical && (
        <>
          <link rel="alternate" hrefLang="ko" href={canonical} />
          <link rel="alternate" hrefLang="en" href={canonical} />
          <link rel="alternate" hrefLang="x-default" href={canonical} />
        </>
      )}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={locale} />
      <meta property="og:locale:alternate" content={altLocale} />
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

/** SITE_URL 재-export — 페이지에서 canonical 작성 시 사용 편의. */
export { SITE_URL, buildCanonical } from '@/shared/config/site'
