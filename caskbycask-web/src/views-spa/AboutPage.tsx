import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { ABOUT_CONTENT } from '@/shared/config/aboutContent'
import { SITE_SOCIAL_LINKS } from '@/shared/config/site'
import { buildAboutJsonLdGraph } from '@/shared/utils/seoSchema'

/**
 * 서비스 소개 — 브랜드 엔티티를 정의하는 페이지.
 *
 * 검색엔진이 "CaskByCask / 캐스크바이캐스크 / 캐바캐" 를 이 도메인에 묶을 근거가
 * 여기 말고는 없다. 홈은 내용이 주류 목록이라 엔티티 페이지가 되지 못한다.
 *
 * 본문은 `ABOUT_CONTENT` 에서만 온다 — 서버 폴백(`getAboutSeoSnapshot`)이 같은 상수를
 * 쓰므로 서버 HTML 과 이 화면이 글자 단위로 같다. 여기서 문자열을 직접 쓰면 그 보장이 깨진다.
 */
export default function AboutPage() {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ko'
  const copy = ABOUT_CONTENT[lang]
  const prefix = `/${lang}`

  return (
    <>
      <SeoMeta
        title={copy.heading}
        description={copy.lead[0]}
        canonical={buildCanonical(`${prefix}/about`)}
        alternateKo={buildCanonical('/ko/about')}
        alternateEn={buildCanonical('/en/about')}
        alternateDefault={buildCanonical('/ko/about')}
        locale={lang === 'en' ? 'en_US' : 'ko_KR'}
        jsonLd={buildAboutJsonLdGraph(lang)}
      />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">{copy.heading}</h1>
          {copy.lead.map((paragraph) => (
            <p key={paragraph} className="mt-4 text-base leading-8 text-neutral-700">{paragraph}</p>
          ))}
        </header>

        <section className="mt-10" aria-labelledby="about-offerings">
          <h2 id="about-offerings" className="text-lg font-bold text-neutral-900">{copy.offeringsHeading}</h2>
          <ul className="mt-4 space-y-2.5">
            {copy.offerings.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-7 text-neutral-700">
                <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-amber-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="about-facts">
          <h2 id="about-facts" className="text-lg font-bold text-neutral-900">{copy.factsHeading}</h2>
          <dl className="mt-4 divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
            {copy.facts.map((fact) => (
              <div key={fact.label} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
                <dt className="w-32 flex-none text-sm font-semibold text-neutral-500">{fact.label}</dt>
                <dd className="text-sm text-neutral-800">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10" aria-labelledby="about-pages">
          <h2 id="about-pages" className="text-lg font-bold text-neutral-900">{copy.keyPagesHeading}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {copy.keyPages.map((page) => (
              <li key={page.href}>
                <Link
                  to={page.href}
                  className="inline-flex rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm text-neutral-700 hover:border-amber-300 hover:text-amber-800"
                >
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* rel="me" 는 프로필의 역링크와 짝을 이뤄 계정 소유를 상호 증명한다. */}
        <section className="mt-10" aria-labelledby="about-accounts">
          <h2 id="about-accounts" className="text-lg font-bold text-neutral-900">
            {lang === 'en' ? 'Official accounts' : '공식 계정'}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {SITE_SOCIAL_LINKS.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="me noopener noreferrer"
                  className="inline-flex rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-sm text-neutral-700 hover:border-amber-300 hover:text-amber-800"
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}
