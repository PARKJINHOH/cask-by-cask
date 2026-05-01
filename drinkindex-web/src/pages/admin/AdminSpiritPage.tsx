import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'
import Badge from '@/shared/components/Badge'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'

export default function AdminSpiritPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-spirits', page],
    queryFn: () =>
      axiosInstance
        .get<ApiResponse<PageResponse<SpiritListItem>>>('/api/spirits', {
          params: { page, size: 20 },
        })
        .then((res) => res.data.data!),
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-neutral-900">{t('admin.nav.spirits')}</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">이름</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">카테고리</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">국가</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">평점</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">리뷰</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data?.content.map((spirit) => (
                  <tr key={spirit.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 text-neutral-400">{spirit.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{spirit.nameKo}</p>
                      <p className="text-xs text-neutral-400">{spirit.nameEn}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="primary" size="sm">
                        {t(`spirit.category.${spirit.category.toLowerCase()}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{spirit.country ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-primary-600">
                      {spirit.avgScore != null ? spirit.avgScore.toFixed(1) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-600">
                      {spirit.reviewCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              className="mt-6"
            />
          )}
        </>
      )}
    </div>
  )
}
