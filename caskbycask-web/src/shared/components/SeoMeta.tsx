'use client'

import { useEffect } from 'react'
import { SITE_NAME, DEFAULT_OG_IMAGE } from '@/shared/config/site'

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
  deferIndexState?: boolean
  deferJsonLd?: boolean
  jsonLd?: JsonLd | JsonLd[]
  locale?: 'ko_KR' | 'en_US'
  alternateKo?: string
  alternateEn?: string
  alternateDefault?: string
}

function upsertMeta(attribute: 'name' | 'property', key: string, content?: string) {
  const selector = `meta[${attribute}="${key}"]`
  const matches = Array.from(document.head.querySelectorAll<HTMLMetaElement>(selector))
  if (!content) {
    matches.forEach((element) => element.remove())
    return
  }

  const element = matches.shift() ?? document.createElement('meta')
  element.setAttribute(attribute, key)
  element.content = content
  if (!element.isConnected) document.head.appendChild(element)
  matches.forEach((duplicate) => duplicate.remove())
}

function upsertLink(rel: string, href?: string, hrefLang?: string) {
  const hrefLangSelector = hrefLang ? `[hreflang="${hrefLang}"]` : ':not([hreflang])'
  const selector = `link[rel="${rel}"]${hrefLangSelector}`
  const matches = Array.from(document.head.querySelectorAll<HTMLLinkElement>(selector))
  if (!href) {
    matches.forEach((element) => element.remove())
    return
  }

  const element = matches.shift() ?? document.createElement('link')
  element.rel = rel
  element.href = href
  if (hrefLang) element.hreflang = hrefLang
  if (!element.isConnected) document.head.appendChild(element)
  matches.forEach((duplicate) => duplicate.remove())
}

function syncRouteJsonLd(jsonLd: JsonLd | JsonLd[] | undefined, noindex: boolean) {
  // Next page 컴포넌트의 SSR JSON-LD는 body에 남을 수 있으므로 문서 전체에서
  // 기존 경로 스크립트를 찾아 갱신해야 hydration 뒤에도 정확히 하나만 유지된다.
  const matches = Array.from(document.querySelectorAll<HTMLScriptElement>(
    'script[data-cbc-route-jsonld="true"]',
  ))
  const schemas = noindex ? [] : (Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [])

  if (schemas.length === 0) {
    matches.forEach((element) => element.remove())
    return
  }

  const element = matches.shift() ?? document.createElement('script')
  element.type = 'application/ld+json'
  element.dataset.cbcRouteJsonld = 'true'
  element.text = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': schemas.map(({ '@context': _context, ...schema }) => schema),
  }).replace(/</g, '\\u003c')
  if (!element.isConnected) document.head.appendChild(element)
  matches.forEach((duplicate) => duplicate.remove())
}

function preserveMatchingCollectionJsonLd(canonical?: string) {
  const matches = Array.from(document.querySelectorAll<HTMLScriptElement>(
    'script[data-cbc-route-jsonld="true"]',
  ))
  let kept = false
  for (const element of matches) {
    let matchesCanonical = false
    try {
      const parsed = JSON.parse(element.textContent || '{}') as { '@graph'?: unknown[] }
      const graph = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed]
      matchesCanonical = Boolean(canonical) && graph.some((node) => {
        if (!node || typeof node !== 'object') return false
        const schema = node as Record<string, unknown>
        return schema['@type'] === 'CollectionPage'
          && (schema.url === canonical || schema['@id'] === canonical)
      })
    } catch {
      matchesCanonical = false
    }

    if (matchesCanonical && !kept) {
      kept = true
    } else {
      element.remove()
    }
  }
}

/**
 * Next.js가 직접 요청의 초기 SEO 태그를 생성하고, 이 컴포넌트는 React Router의
 * 클라이언트 이동 시 동일 태그를 교체한다. React 19 head hoisting으로 태그를
 * 추가하지 않으므로 SSR 메타데이터와 중복되지 않는다.
 */
export default function SeoMeta({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt,
  keywords,
  noindex = false,
  deferIndexState = false,
  deferJsonLd = false,
  jsonLd,
  locale = 'ko_KR',
  alternateKo,
  alternateEn,
  alternateDefault,
}: Props) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`
    const defaultHref = alternateDefault ?? alternateKo

    document.title = fullTitle
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'keywords', keywords)
    if (!deferIndexState) {
      upsertMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow')
    }
    upsertLink('canonical', canonical)
    upsertLink('alternate', alternateKo, 'ko')
    upsertLink('alternate', alternateEn, 'en')
    upsertLink('alternate', defaultHref, 'x-default')

    upsertMeta('property', 'og:type', ogType)
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:locale', locale)
    upsertMeta('property', 'og:locale:alternate', locale === 'ko_KR' ? 'en_US' : 'ko_KR')
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:image', ogImage)
    upsertMeta('property', 'og:image:alt', ogImageAlt)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', ogImage)
    if (!deferIndexState) {
      if (deferJsonLd) preserveMatchingCollectionJsonLd(canonical)
      else syncRouteJsonLd(jsonLd, noindex)
    }
  }, [
    alternateDefault,
    alternateEn,
    alternateKo,
    canonical,
    description,
    deferIndexState,
    deferJsonLd,
    jsonLd,
    keywords,
    locale,
    noindex,
    ogImage,
    ogImageAlt,
    ogType,
    title,
  ])

  return null
}

export { SITE_URL, buildCanonical } from '@/shared/config/site'
