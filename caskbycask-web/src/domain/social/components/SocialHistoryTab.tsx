import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { socialApi } from '../api/socialApi'

export default function SocialHistoryTab() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['social', 'history', 'me'],
    queryFn: () => socialApi.myHistory(),
  })
  const retry = useMutation({
    mutationFn: (id: number) => socialApi.retry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social', 'history', 'me'] }),
  })

  if (isLoading) return <p className="py-12 text-center text-sm text-neutral-400">{t('common.loading')}</p>
  const items = data?.content ?? []
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">{t('social.historyTitle')}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t('social.historyHelp')}</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-12 text-center text-sm text-neutral-400">
          {t('social.historyEmpty')}
        </div>
      ) : items.map((item) => (
        <article key={item.id} className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-neutral-900">{item.platform === 'INSTAGRAM' ? 'Instagram' : 'Threads'}</strong>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
              {t(`social.status.${item.status}`)}
            </span>
            <time className="ml-auto text-xs text-neutral-400">
              {new Date(item.createdAt).toLocaleString()}
            </time>
          </div>
          {item.renderedImageUrl && (
            <img src={item.renderedImageUrl} alt="" className="mt-3 h-32 rounded-lg object-cover" />
          )}
          {item.lastError && <p className="mt-2 text-xs text-red-600">{item.lastError}</p>}
          <div className="mt-3 flex gap-2">
            {item.permalink && (
              <a href={item.permalink} target="_blank" rel="noopener noreferrer"
                className="rounded-lg bg-primary-800 px-3 py-2 text-xs font-semibold text-white">
                {t('social.openPost')}
              </a>
            )}
            {item.canRetry && (
              <button type="button" onClick={() => retry.mutate(item.id)} disabled={retry.isPending}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50">
                {t('social.retry')}
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
