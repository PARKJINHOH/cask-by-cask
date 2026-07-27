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
    <div className="space-y-2">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">{t('social.historyTitle')}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t('social.historyHelp')}</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-12 text-center text-sm text-neutral-400">
          {t('social.historyEmpty')}
        </div>
      ) : items.map((item) => (
        <article key={item.id}
          className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg border border-neutral-200 bg-white p-2.5 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:gap-3">
          {item.renderedImageUrl ? (
            <img src={item.renderedImageUrl} alt="" className="aspect-[4/5] w-11 rounded-md object-cover sm:w-13" />
          ) : (
            <div className="aspect-[4/5] w-11 rounded-md bg-neutral-100 sm:w-13" />
          )}
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <strong className="text-xs text-neutral-900 sm:text-sm">
                {item.platform === 'INSTAGRAM' ? 'Instagram' : 'Threads'}
              </strong>
              <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600 sm:text-xs">
                {t(`social.status.${item.status}`)}
              </span>
            </div>
            <time className="mt-1 block text-[10px] text-neutral-400 sm:text-xs">
              {new Date(item.createdAt).toLocaleString()}
            </time>
            {item.lastError && (
              <p className="mt-1 line-clamp-2 break-words text-[10px] leading-4 text-red-600 sm:text-xs">
                {item.lastError}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {item.permalink && (
              <a href={item.permalink} target="_blank" rel="noopener noreferrer"
                className="whitespace-nowrap rounded-md bg-primary-800 px-2 py-1.5 text-[10px] font-semibold text-white sm:px-2.5 sm:text-xs">
                {t('social.openPost')}
              </a>
            )}
            {item.canRetry && (
              <button type="button" onClick={() => retry.mutate(item.id)} disabled={retry.isPending}
                className="whitespace-nowrap rounded-md border border-red-200 px-2 py-1.5 text-[10px] font-semibold text-red-600 disabled:opacity-50 sm:px-2.5 sm:text-xs">
                {t('social.retry')}
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
