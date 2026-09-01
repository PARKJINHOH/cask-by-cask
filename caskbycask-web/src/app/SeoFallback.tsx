import type { SeoSnapshotData } from '@/shared/utils/seoHelpers'
import { BRAND_ALIAS_LINE, SITE_NAME, SITE_SOCIAL_LINKS } from '@/shared/config/site'

interface Props {
  snapshot: SeoSnapshotData | null
}

/** 섹션 제목을 aria-labelledby 로 쓸 수 있는 id 로 바꾼다. 한글 제목이라 공백만 걷어내면 된다. */
function slugify(heading: string): string {
  return heading.trim().replace(/\s+/g, '-')
}

export default function SeoFallback({ snapshot }: Props) {
  if (!snapshot) return null

  return (
    <main
      data-seo-fallback={snapshot.kind}
      lang={snapshot.lang}
      className="min-h-screen bg-neutral-50 px-4 py-6 text-neutral-900"
    >
      <article className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="grid gap-0 md:grid-cols-[280px_1fr]">
          {snapshot.image && (
            <div className="bg-neutral-100">
              <img
                src={snapshot.image}
                alt={snapshot.title}
                className="h-full min-h-[260px] w-full object-cover"
                loading="eager"
              />
            </div>
          )}

          <div className="p-6 md:p-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-amber-700">
              {snapshot.eyebrow}
            </p>
            <h1 className="text-3xl font-bold leading-tight text-neutral-950 md:text-4xl">
              {snapshot.title}
            </h1>
            {snapshot.subtitle && (
              <p className="mt-2 text-base font-medium text-neutral-500">{snapshot.subtitle}</p>
            )}
            {snapshot.description && (
              <p className="mt-5 max-w-3xl text-base leading-7 text-neutral-700">
                {snapshot.description}
              </p>
            )}

            {snapshot.metrics.length > 0 && (
              <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {snapshot.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <dt className="text-xs font-semibold text-neutral-500">{metric.label}</dt>
                    <dd className="mt-1 text-lg font-bold text-neutral-950">{metric.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {(snapshot.details.length > 0 || snapshot.bodyHtml
          || (snapshot.sourceUrls?.length ?? 0) > 0 || (snapshot.hashtags?.length ?? 0) > 0) && (
          <div className="border-t border-neutral-200 p-6 md:p-8">
            {snapshot.details.length > 0 && (
              <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                {snapshot.details.map((detail) => (
                  <div key={`${detail.label}:${detail.value}`} className="border-b border-neutral-100 pb-3">
                    <dt className="text-sm font-semibold text-neutral-500">{detail.label}</dt>
                    <dd className="mt-1 text-base font-medium text-neutral-900">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {/*
              작성자가 에디터로 쓴 본문이다. 안에 어떤 헤딩이 들어올지는 코드가 정하지 못하므로
              (h1 을 직접 넣는 글도 있다) 문서 구조를 검사할 때 이 영역은 구분해서 본다.
              SPA 쪽 같은 영역은 RichContent 의 `notice-content` 클래스가 같은 역할을 한다.
            */}
            {snapshot.bodyHtml && (
              <div
                data-cbc-user-content="true"
                className="mt-6 max-w-none text-base leading-8 text-neutral-800 [&_a]:text-amber-700 [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_p]:my-3"
                dangerouslySetInnerHTML={{ __html: snapshot.bodyHtml }}
              />
            )}

            {snapshot.sourceUrls && snapshot.sourceUrls.length > 0 && (
              <section className="mt-8 border-t border-neutral-100 pt-5" aria-labelledby="seo-source-heading">
                <h2 id="seo-source-heading" className="text-sm font-bold text-neutral-700">
                  {snapshot.lang === 'en' ? 'Sources' : '출처'}
                </h2>
                <ul className="mt-2 space-y-1 text-sm">
                  {snapshot.sourceUrls.map((sourceUrl) => (
                    <li key={sourceUrl} className="break-all">
                      <a href={sourceUrl} rel="noopener noreferrer" className="text-amber-800 hover:underline">
                        {sourceUrl}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {snapshot.hashtags && snapshot.hashtags.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label={snapshot.lang === 'en' ? 'Hashtags' : '해시태그'}>
                {snapshot.hashtags.map((hashtag) => (
                  <li key={hashtag.toLocaleLowerCase()} className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900">
                    #{hashtag}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {snapshot.items && snapshot.items.length > 0 && (
          <section className="border-t border-neutral-200 p-6 md:p-8" aria-labelledby="seo-list-heading">
            <h2 id="seo-list-heading" className="text-xl font-bold text-neutral-950">
              {snapshot.itemsHeading
                ?? (snapshot.lang === 'en' ? 'Latest public posts' : '최신 공개 글')}
            </h2>
            <ul className="mt-4 divide-y divide-neutral-100">
              {snapshot.items.map((item) => (
                <li key={item.href} className="py-4">
                  <a className="text-base font-semibold text-amber-900 hover:underline" href={item.href}>
                    {item.title}
                  </a>
                  {(item.description || item.meta) && (
                    <p className="mt-1 text-sm text-neutral-500">
                      {[item.description, item.meta].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {snapshot.pagination && (
              <nav
                className="mt-6 flex flex-wrap items-center gap-2 text-sm font-semibold"
                aria-label={snapshot.lang === 'en' ? 'Pagination' : '페이지 목록'}
              >
                {snapshot.pagination.prevHref && (
                  <a
                    className="rounded-md border border-neutral-200 px-3 py-1.5 text-amber-800 hover:underline"
                    href={snapshot.pagination.prevHref}
                    rel="prev"
                  >
                    {snapshot.lang === 'en' ? 'Previous' : '이전'}
                  </a>
                )}
                {snapshot.pagination.links.map((link) => (
                  <a
                    key={link.page}
                    className={link.current
                      ? 'rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-900'
                      : 'rounded-md border border-neutral-200 px-3 py-1.5 text-amber-800 hover:underline'}
                    href={link.href}
                    aria-current={link.current ? 'page' : undefined}
                  >
                    {link.page + 1}
                  </a>
                ))}
                {snapshot.pagination.nextHref && (
                  <a
                    className="rounded-md border border-neutral-200 px-3 py-1.5 text-amber-800 hover:underline"
                    href={snapshot.pagination.nextHref}
                    rel="next"
                  >
                    {snapshot.lang === 'en' ? 'Next' : '다음'}
                  </a>
                )}
              </nav>
            )}
          </section>
        )}

        {snapshot.sections?.map((section) => (
          <section
            key={section.heading}
            className="border-t border-neutral-200 p-6 md:p-8"
            aria-labelledby={`seo-section-${slugify(section.heading)}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2
                id={`seo-section-${slugify(section.heading)}`}
                className="text-xl font-bold text-neutral-950"
              >
                {section.heading}
              </h2>
              {section.moreHref && (
                <a className="text-sm font-semibold text-amber-800 hover:underline" href={section.moreHref}>
                  {section.moreLabel ?? (snapshot.lang === 'en' ? 'View all' : '전체 보기')}
                </a>
              )}
            </div>
            <ul className="mt-4 divide-y divide-neutral-100">
              {section.items.map((item) => (
                <li key={item.href} className="py-4">
                  <a className="text-base font-semibold text-amber-900 hover:underline" href={item.href}>
                    {item.title}
                  </a>
                  {(item.description || item.meta) && (
                    <p className="mt-1 text-sm text-neutral-500">
                      {[item.description, item.meta].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {snapshot.links.length > 0 && (
          <nav
            className="border-t border-neutral-200 bg-neutral-50 px-6 py-4 md:px-8"
            aria-label={snapshot.lang === 'en' ? 'Related pages' : '관련 페이지'}
          >
            <ul className="flex flex-wrap gap-3 text-sm font-semibold">
              {snapshot.links.map((link) => (
                <li key={link.href}>
                  <a className="text-amber-800 hover:underline" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>

      {/*
        브랜드 공식 계정 링크. 화면 푸터(MainLayout)는 SPA 안에 있어 JS 를 실행하지 않는
        크롤러에게는 존재하지 않는다. Organization.sameAs 와 같은 목록을 서버 HTML 에도
        남겨야 '이 계정과 이 도메인은 같은 주체'라는 신호가 렌더링 여부와 무관하게 성립한다.
        rel="me" 는 계정 프로필 bio 의 역링크와 짝을 이루는 신원 관계 선언이다.
      */}
      <footer className="mx-auto mt-6 max-w-5xl px-2 text-sm">
        {/*
          브랜드 블록. 사이트 이름과 한국어 별칭을 서버 HTML 에 남긴다 — 예전에는
          '캐스크바이캐스크' 가 JSON-LD 의 alternateName 과 PC 전용 클라이언트 푸터에만 있어서,
          크롤러가 받는 HTML 어디에도 이 사이트의 한국어 이름이 없었다.
          같은 문구를 MainLayout 의 PC·모바일 푸터도 렌더하므로 화면과 어긋나지 않는다.
        */}
        <p className="font-bold text-neutral-700">{SITE_NAME}</p>
        <p className="text-neutral-500">{BRAND_ALIAS_LINE[snapshot.lang]}</p>
        <p className="mt-2">
          <a className="text-amber-800 hover:underline" href={`/${snapshot.lang}/about`}>
            {snapshot.lang === 'en' ? 'About CaskByCask' : '서비스 소개'}
          </a>
        </p>
        <h2 className="mt-4 font-bold text-neutral-700">
          {snapshot.lang === 'en' ? 'Official accounts' : '공식 계정'}
        </h2>
        <ul className="mt-2 flex flex-wrap gap-4">
          {SITE_SOCIAL_LINKS.map((link) => (
            <li key={link.url}>
              <a
                className="text-amber-800 hover:underline"
                href={link.url}
                rel="me noopener noreferrer"
              >
                {link.name}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </main>
  )
}
