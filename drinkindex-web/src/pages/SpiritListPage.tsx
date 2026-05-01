import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSpirits } from '@/domain/spirit/hooks/useSpirits'
import { useSpiritStore } from '@/domain/spirit/store/spiritStore'
import type { SpiritCategory, SpiritSort } from '@/domain/spirit/types/spirit.types'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import Badge from '@/shared/components/Badge'

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'TEQUILA', 'RUM', 'GIN', 'VODKA']
const SORTS: { value: SpiritSort; labelKey: string }[] = [
  { value: 'LATEST',            labelKey: 'spirit.sort.latest' },
  { value: 'SCORE_DESC',        labelKey: 'spirit.sort.score_desc' },
  { value: 'REVIEW_COUNT_DESC', labelKey: 'spirit.sort.review_count_desc' },
]

export default function SpiritListPage() {
  const { t } = useTranslation()
  const { keyword, category, sort, page, setFilter } = useSpiritStore()
  const { data, isLoading } = useSpirits()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 space-y-4">
        <input
          type="text"
          placeholder={t('spirit.search.placeholder')}
          value={keyword}
          onChange={(e) => setFilter({ keyword: e.target.value, page: 0 })}
          className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm
            focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
        />

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter({ category: '', page: 0 })}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              !category
                ? 'bg-neutral-800 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {t('common.all')}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter({ category: cat === category ? '' : cat, page: 0 })}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t(`spirit.category.${cat.toLowerCase()}`)}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {SORTS.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => setFilter({ sort: value, page: 0 })}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                sort === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      ) : (
        <>
          {data?.empty ? (
            <div className="text-center py-20 text-neutral-400">{t('common.noData')}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {data?.content.map((spirit) => (
                <Link key={spirit.id} to={`/spirits/${spirit.id}`} className="group">
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-neutral-100 overflow-hidden">
                      {spirit.primaryImageUrl ? (
                        <img
                          src={spirit.primaryImageUrl}
                          alt={spirit.nameKo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          🥃
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <Badge variant="primary" size="sm" className="mb-1.5">
                        {t(`spirit.category.${spirit.category.toLowerCase()}`)}
                      </Badge>
                      <h3 className="font-semibold text-sm text-neutral-900 line-clamp-1">
                        {spirit.nameKo}
                      </h3>
                      <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">{spirit.nameEn}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-neutral-400">{spirit.country}</span>
                        {spirit.avgScore != null && (
                          <span className="text-xs font-bold text-primary-600">
                            ★ {spirit.avgScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {data && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={(p) => setFilter({ page: p })}
              className="mt-10"
            />
          )}
        </>
      )}
    </div>
  )
}
