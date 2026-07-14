import type { SeoSnapshotData } from '@/shared/utils/seoHelpers'

interface Props {
  snapshot: SeoSnapshotData | null
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

        {(snapshot.details.length > 0 || snapshot.bodyHtml) && (
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

            {snapshot.bodyHtml && (
              <div
                className="mt-6 max-w-none text-base leading-8 text-neutral-800 [&_a]:text-amber-700 [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_p]:my-3"
                dangerouslySetInnerHTML={{ __html: snapshot.bodyHtml }}
              />
            )}
          </div>
        )}

        {snapshot.items && snapshot.items.length > 0 && (
          <section className="border-t border-neutral-200 p-6 md:p-8" aria-labelledby="seo-list-heading">
            <h2 id="seo-list-heading" className="text-xl font-bold text-neutral-950">
              {snapshot.lang === 'en' ? 'Latest public posts' : '최신 공개 글'}
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
          </section>
        )}

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
    </main>
  )
}
