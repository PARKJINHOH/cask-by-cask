import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { communityApi } from '../api/communityApi'
import type { BoardType } from '../types/community.types'

interface Props {
  seriesId: number
  currentPostId: number
  seriesTitle: string
  boardType: BoardType
}

export default function PostSeriesNav({ seriesId, currentPostId, seriesTitle, boardType }: Props) {
  const { t } = useTranslation()
  const boardPath = boardType === 'NOTICE' ? 'notice' : 'free'

  const { data: series } = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => communityApi.getSeriesDetail(seriesId).then((r) => r.data.data!),
    staleTime: 60_000,
  })

  const posts = series?.posts ?? []
  const idx = posts.findIndex((p) => p.id === currentPostId)
  const prev = idx > 0 ? posts[idx - 1] : null
  const next = idx !== -1 && idx < posts.length - 1 ? posts[idx + 1] : null

  return (
    <div className="my-6 border border-neutral-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2">
        <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="text-sm font-semibold text-neutral-700">{t('post.seriesLabel')}</span>
        <Link to={`/series/${seriesId}`} className="text-sm text-primary-600 hover:underline ml-1 truncate">
          {seriesTitle}
        </Link>
      </div>

      <div className="divide-y divide-neutral-100">
        {prev && (
          <Link
            to={`/community/${boardPath}/${prev.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors group"
          >
            <span className="text-xs text-neutral-400 w-14 flex-shrink-0">{t('post.seriesPrev')}</span>
            <span className="text-sm text-neutral-700 group-hover:text-primary-600 transition-colors truncate">
              {prev.title}
            </span>
          </Link>
        )}
        {next && (
          <Link
            to={`/community/${boardPath}/${next.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors group"
          >
            <span className="text-xs text-neutral-400 w-14 flex-shrink-0">{t('post.seriesNext')}</span>
            <span className="text-sm text-neutral-700 group-hover:text-primary-600 transition-colors truncate">
              {next.title}
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}
