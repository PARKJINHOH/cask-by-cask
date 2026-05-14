import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '@/shared/components/Badge'
import Input from '@/shared/components/Input'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import ImageLightbox from '@/shared/components/ImageLightbox'
import { useAdminSpirits } from '@/domain/admin/hooks/useAdminSpirits'
import type { SpiritCategory, SpiritStatus } from '@/domain/spirit/types/spirit.types'

// ── 상수 ────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<SpiritCategory, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', OTHER: '기타',
}

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER']

const STATUS_OPTIONS: Array<{ value: SpiritStatus; label: string }> = [
  { value: 'ACTIVE',  label: '공개' },
  { value: 'HIDDEN',  label: '숨김' },
  { value: 'PENDING', label: '대기' },
]

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminSpiritPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword]   = useState('')
  const [category, setCategory] = useState<SpiritCategory | ''>('')
  const [status, setStatus]     = useState<SpiritStatus>('ACTIVE')
  const [page, setPage]         = useState(0)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const { data, isLoading } = useAdminSpirits({
    keyword: keyword.trim() || undefined,
    category: category || undefined,
    status,
    page,
  })

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">술 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl shadow-sm">
        <div className="flex-1 min-w-[180px]">
          <Input
            label="이름 검색"
            placeholder="한글/영문 이름"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setPage(0) }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">카테고리</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value as SpiritCategory | ''); setPage(0) }}
            className="h-9 px-3 text-sm border border-neutral-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">전체</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">상태</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as SpiritStatus); setPage(0) }}
            className="h-9 px-3 text-sm border border-neutral-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            {STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 테이블 */}
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
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-16">ID</th>
                  <th className="text-left px-3 py-3 text-neutral-500 font-medium w-14">사진</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">이름</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">카테고리</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">평점</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">리뷰</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-neutral-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((spirit) => (
                    <tr key={spirit.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{spirit.id}</td>

                      {/* 썸네일 */}
                      <td className="px-3 py-2">
                        {spirit.primaryImageUrl ? (
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(spirit.primaryImageUrl)}
                            aria-label={`${spirit.nameKo} 이미지 확대`}
                            className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100
                              cursor-zoom-in hover:ring-2 hover:ring-primary-400 transition-all
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          >
                            <img
                              src={spirit.primaryImageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center
                            text-neutral-300 text-lg">
                            🥃
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{spirit.nameKo}</p>
                        <p className="text-xs text-neutral-400">{spirit.nameEn}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={spirit.category} size="sm">
                          {CATEGORY_LABEL[spirit.category]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={spirit.status} size="sm">
                          {STATUS_OPTIONS.find((s) => s.value === spirit.status)?.label ?? spirit.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-primary-600 tabular-nums">
                        {spirit.avgScore != null ? spirit.avgScore.toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-600 tabular-nums">
                        {spirit.reviewCount}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => navigate(`/admin/spirits/${spirit.id}`)}
                            className="text-xs text-primary-600 hover:text-primary-800 font-medium
                              transition-colors"
                          >
                            상세보기
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <ImageLightbox
        images={lightboxUrl ? [lightboxUrl] : []}
        open={lightboxUrl !== null}
        onClose={() => setLightboxUrl(null)}
      />
    </div>
  )
}
