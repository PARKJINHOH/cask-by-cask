import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { socialApi } from '@/domain/social/api/socialApi'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import Spinner from '@/shared/components/Spinner'

export default function SocialHubPage() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const { data, isLoading } = useQuery({
    queryKey: ['social', 'public-hub'],
    queryFn: () => socialApi.hub(30),
  })
  const prefix = isEn ? '/en' : '/ko'

  return (
    <>
      <SeoMeta
        title={t('social.hubTitle')}
        description={t('social.hubDescription')}
        canonical={buildCanonical(`${prefix}/social`)}
        alternateKo={buildCanonical('/ko/social')}
        alternateEn={buildCanonical('/en/social')}
        alternateDefault={buildCanonical('/ko/social')}
        locale={isEn ? 'en_US' : 'ko_KR'}
      />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-neutral-950">{t('social.hubTitle')}</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-500">{t('social.hubDescription')}</p>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-24"><Spinner className="text-primary-800" /></div>
        ) : !data?.length ? (
          <div className="mt-10 rounded-2xl border border-neutral-200 bg-white py-16 text-center text-sm text-neutral-400">
            {t('social.hubEmpty')}
          </div>
        ) : (
          <div className="mt-9 space-y-4">
            {data.map((item) => (
              <article key={item.bundleId} className="flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="h-24 w-20 flex-none rounded-xl bg-neutral-100 object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 font-bold text-neutral-900">{item.title}</h2>
                  {item.publishedAt && (
                    <time className="mt-1 block text-xs text-neutral-400">
                      {new Date(item.publishedAt).toLocaleDateString(isEn ? 'en-US' : 'ko-KR')}
                    </time>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={item.sourcePath}
                      className="rounded-lg bg-primary-800 px-3 py-2 text-xs font-bold text-white">
                      {t('social.viewOriginal')}
                    </a>
                    {item.platforms.map((link) => (
                      <a key={link.platform} href={link.permalink} target="_blank" rel="noopener noreferrer"
                        className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-700">
                        {link.platform === 'INSTAGRAM' ? 'Instagram' : 'Threads'}
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
