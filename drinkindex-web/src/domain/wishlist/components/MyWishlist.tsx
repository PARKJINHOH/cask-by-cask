import { useState } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import Pagination from '@/shared/components/Pagination'
import { useMyWishlist, useRemoveWishlist } from '../hooks/useWishlist'
import type { WishlistType } from '../types/wishlist.types'

const CATEGORY_LABEL: Record<string, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', TEQUILA: '데낄라',
  RUM: '럼', GIN: '진', VODKA: '보드카', OTHER: '기타',
}

const SUB_TABS: { value: WishlistType; label: string }[] = [
  { value: 'TRIED',      label: '마셔봤어요' },
  { value: 'WISHLIST',   label: '마시고 싶어요' },
  { value: 'COLLECTION', label: '컬렉션' },
]

export default function MyWishlist() {
  const [activeType, setActiveType] = useState<WishlistType>('TRIED')
  const [page, setPage]             = useState(0)

  const { data, isLoading } = useMyWishlist(activeType, page)
  const removeMutation      = useRemoveWishlist()

  const handleTabChange = (type: WishlistType) => {
    setActiveType(type)
    setPage(0)
  }

  const handleRemove = async (id: number, name: string) => {
    if (!confirm(`"${name}"을(를) 위시리스트에서 제거하시겠습니까?`)) return
    await removeMutation.mutateAsync(id)
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-neutral-100 -mx-0.5">
        {SUB_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleTabChange(value)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeType === value
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="text-primary-600" />
        </div>
      ) : !data || data.empty ? (
        <EmptyState
          title="아직 항목이 없습니다."
          description="술 상세 페이지에서 위시리스트에 추가해보세요!"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.content.map((item) => (
              <div key={item.id} className="relative group">
                {/* Remove button — appears on hover */}
                <button
                  onClick={() => handleRemove(item.id, item.spirit.nameKo)}
                  aria-label={`${item.spirit.nameKo} 위시리스트에서 제거`}
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
                    {/* Image */}
                    <div className="aspect-square overflow-hidden bg-neutral-100">
                      {item.spirit.primaryImageUrl ? (
                        <img
                          src={item.spirit.primaryImageUrl}
                          alt={item.spirit.nameKo}
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

                    {/* Info */}
                    <div className="p-3 space-y-1">
                      <p className="text-xs font-medium text-neutral-400">
                        {CATEGORY_LABEL[item.spirit.category] ?? item.spirit.category}
                      </p>
                      <p className="text-sm font-semibold text-neutral-900 line-clamp-1 leading-snug">
                        {item.spirit.nameKo}
                      </p>
                      <p className="text-xs text-neutral-400 line-clamp-1">{item.spirit.nameEn}</p>
                      {item.spirit.avgScore != null && (
                        <p className="text-xs font-bold text-primary-600 pt-0.5">
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
