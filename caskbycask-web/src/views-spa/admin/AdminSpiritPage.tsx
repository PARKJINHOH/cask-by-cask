import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import ImageLightbox from '@/shared/components/ImageLightbox'
import { useAdminSpirits } from '@/domain/admin/hooks/useAdminSpirits'
import type { SpiritCategory, SpiritStatus } from '@/domain/spirit/types/spirit.types'
import { getSpiritListDisplayNames } from '@/domain/spirit/utils/spiritDisplayName'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

// ── 상수 ────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<SpiritCategory, string> = {
  WHISKY: '위스키', COGNAC: '꼬냑', WINE: '와인', OTHER: '기타',
}

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER']

const STATUS_OPTIONS: Array<{ value: SpiritStatus | ''; label: string }> = [
  { value: '',        label: '전체' },
  { value: 'ACTIVE',  label: '공개' },
  { value: 'HIDDEN',  label: '숨김' },
  { value: 'PENDING', label: '대기' },
]

const STYLE_LABELS: Record<SpiritCategory, Record<string, string>> = {
  WHISKY: {
    SINGLE_MALT: '싱글 몰트',
    BLENDED_MALT: '블렌디드 몰트',
    BLENDED_WHISKY: '블렌디드',
    BOURBON: '버번',
    WHEATED_BOURBON: '밀 버번',
    TENNESSEE: '테네시',
    RYE: '라이',
    POT_STILL: '싱글 팟 스틸',
    GRAIN_CORN: '그레인 / 콘',
    OTHER: '기타',
  },
  WINE: {
    RED: '레드',
    WHITE: '화이트',
    ROSE: '로제',
    SPARKLING: '스파클링',
    DESSERT: '디저트',
    ORANGE: '오렌지',
    FORTIFIED: '주정강화',
  },
  COGNAC: {
    VS: 'VS',
    NAPOLEON: 'Napoléon',
    VSOP: 'VSOP',
    XO: 'XO',
    XXO: 'XXO',
    HORS_DAGE: "Hors d'Age",
  },
  OTHER: {
    RUM: '럼',
    GIN: '진',
    VODKA: '보드카',
    TEQUILA: '데킬라',
    MEZCAL: '메스칼',
    BRANDY: '브랜디',
    LIQUEUR: '리큐르',
    SAKE: '사케',
    SOJU: '소주',
    BAIJIU: '바이주',
    ABSINTHE: '압생트',
    BEER: '맥주',
    OTHER: '기타',
  },
}

function getStyleLabel(spirit: { category: SpiritCategory; style?: string | null; styleOther?: string | null }) {
  if (!spirit.style) return null
  if (spirit.category === 'WHISKY' && spirit.style === 'OTHER' && spirit.styleOther) {
    return spirit.styleOther
  }
  return STYLE_LABELS[spirit.category]?.[spirit.style] ?? spirit.style
}

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminSpiritPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const keywordParam = searchParams.get('keyword') ?? ''
  const categoryParam = (searchParams.get('category') ?? '') as SpiritCategory | ''
  const statusParam = (searchParams.get('status') ?? '') as SpiritStatus | ''
  const [keyword, setKeyword]   = useState(keywordParam)
  const debouncedKeyword = useDebouncedValue(keyword)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const detailState = { returnTo: `${location.pathname}${location.search}` }
  const setPage = (p: number) =>
    setSearchParams(
      (prev) => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n },
      { replace: true },
    )
  const setParam = (key: string, value: string | null) =>
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        if (value) n.set(key, value)
        else n.delete(key)
        n.set('page', '0')
        return n
      },
      { replace: true },
    )

  useEffect(() => {
    setKeyword(keywordParam)
  }, [keywordParam])

  useEffect(() => {
    const trimmed = debouncedKeyword.trim()
    if (trimmed === keywordParam.trim()) return
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        if (trimmed) n.set('keyword', trimmed)
        else n.delete('keyword')
        n.set('page', '0')
        return n
      },
      { replace: true },
    )
  }, [debouncedKeyword, keywordParam, setSearchParams])

  const { data, isLoading } = useAdminSpirits({
    keyword: keywordParam.trim() || undefined,
    category: categoryParam || undefined,
    status: statusParam || undefined,
    page,
  })

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">술 관리</h1>
        <Button size="sm" onClick={() => navigate('/admin/spirits/new')}>
          + 술 직접 등록
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl shadow-sm">
        <div className="flex-1 min-w-[180px]">
          <Input
            label="이름 검색"
            placeholder="한글/영문 이름"
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setPage(0) }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">카테고리</label>
          <select
            value={categoryParam}
            onChange={(e) => setParam('category', e.target.value || null)}
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
            value={statusParam}
            onChange={(e) => setParam('status', e.target.value || null)}
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
          <Spinner size="lg" className="text-primary-800" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="hidden md:table-cell text-left px-4 py-3 text-neutral-500 font-medium w-44">ID</th>
                  <th className="text-left px-3 py-3 text-neutral-500 font-medium w-14">사진</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">이름</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">카테고리</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 text-neutral-500 font-medium">평점</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 text-neutral-500 font-medium">조회수</th>
                  <th className="hidden md:table-cell text-right px-4 py-3 text-neutral-500 font-medium">리뷰</th>
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
                  data.content.map((spirit) => {
                    const styleLabel = getStyleLabel(spirit)
                    const displayName = getSpiritListDisplayNames(spirit)
                    return (
                    <tr
                      key={spirit.id}
                      className="group hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/spirits/${spirit.id}`, { state: detailState })}
                    >
                      <td className="hidden md:table-cell px-4 py-3">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-neutral-400 tabular-nums">{spirit.id}</span>
                          {styleLabel && (
                            <span
                              className="inline-flex max-w-28 items-center truncate rounded-md bg-neutral-100 px-1.5 py-0.5
                                text-[11px] font-medium text-neutral-600"
                              title={styleLabel}
                            >
                              {styleLabel}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 썸네일 */}
                      <td className="px-3 py-2">
                        {spirit.primaryImageUrl ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setLightboxUrl(spirit.primaryImageUrl) }}
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
                        <p className="font-medium text-neutral-900 group-hover:text-primary-700">
                          {displayName.nameKo}
                        </p>
                        <p className="text-xs text-neutral-400">{displayName.nameEn}</p>
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
                      <td className="hidden md:table-cell px-4 py-3 text-right font-medium text-primary-800 tabular-nums">
                        {spirit.avgScore != null ? spirit.avgScore.toFixed(1) : '-'}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-right text-neutral-600 tabular-nums">
                        {spirit.viewCount ?? 0}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-right text-neutral-600 tabular-nums">
                        {spirit.reviewCount}
                      </td>
                    </tr>
                    )
                  })
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
