import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Pagination from '@/shared/components/Pagination'
import { useMyWishlist, useRemoveWishlist } from '../hooks/useWishlist'

export default function MyWishlist() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const [page, setPage] = useState(0)

  const { data, isLoading } = useMyWishlist('COLLECTION', page)
  const removeMutation      = useRemoveWishlist()

  const handleRemove = async (id: number, name: string) => {
    if (!confirm(t('wishlist.removeConfirm', { name }))) return
    await removeMutation.mutateAsync(id)
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary-800" />
        </div>
      ) : !data || data.empty ? (
        <EmptyState
          title={t('wishlist.noItem')}
          description={t('wishlist.noItemDesc')}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.content.map((item) => (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleRemove(item.id, isEn ? (item.spirit.nameEn || item.spirit.nameKo) : item.spirit.nameKo)}
                  aria-label={t('wishlist.removeAria')}
                  disabled={removeMutation.isPending}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full
                    bg-white/90 shadow-sm flex items-center justify-center text-xs
                    text-neutral-400 hover:text-red-500 hover:bg-white transition-colors
                    opacity-0 group-hover:opacity-100 disabled:opacity-40"
                >
                  ✕
                </button>

                <Link
                  to={`/spirits/${item.spirit.id}`}
                  className="block focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-2xl"
                >
                  <article className="bg-white rounded-2xl shadow-sm overflow-hidden
                    hover:shadow-md transition-shadow duration-200">
                    <div className="aspect-square overflow-hidden bg-neutral-100">
                      {item.spirit.primaryImageUrl ? (
                        <img
                          src={item.spirit.primaryImageUrl}
                          alt={isEn ? (item.spirit.nameEn || item.spirit.nameKo) : item.spirit.nameKo}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105
                            transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          🥃
                        </div>
                      )}
                    </div>

                    <div className="p-3 space-y-1">
                      <p className="text-xs font-medium text-neutral-400">
                        {t(`spirit.category.${item.spirit.category}`)}
                      </p>
                      <p className="text-sm font-semibold text-neutral-900 line-clamp-1 leading-snug">
                        {isEn ? (item.spirit.nameEn || item.spirit.nameKo) : item.spirit.nameKo}
                      </p>
                      <p className="text-xs text-neutral-400 line-clamp-1">
                        {isEn ? item.spirit.nameKo : item.spirit.nameEn}
                      </p>
                      {item.spirit.avgScore != null && (
                        <p className="text-xs font-bold text-primary-800 pt-0.5">
                          ★ {item.spirit.avgScore.toFixed(1)}
                        </p>
                      )}
                    </div>
                  </article>
                </Link>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={data.totalPages}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}
    </div>
  )
}
