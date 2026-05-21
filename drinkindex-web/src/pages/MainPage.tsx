import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import { useBanners } from '@/domain/banner/hooks/useBanners'
import { usePopups } from '@/domain/popup/hooks/usePopups'
import { useNotices } from '@/domain/notice/hooks/useNotices'
import { PopupViewer } from '@/domain/popup/components/PopupViewer'
import BannerSlider from '@/domain/banner/components/BannerSlider'
import SpiritCard from '@/shared/components/SpiritCard'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'
import type { NoticeListItem } from '@/domain/notice/types/notice.types'

// ── 카테고리 메뉴 데이터 ─────────────────────────────────────────
const CATEGORY_MENU = [
  { key: 'WHISKY', icon: '🥃' },
  { key: 'COGNAC', icon: '🍾' },
  { key: 'WINE',   icon: '🍷' },
  { key: 'OTHER',  icon: '🫗' },
] as const

// ── 섹션 헤더 ────────────────────────────────────────────────────
function SectionHeader({
  title,
  link,
  linkLabel,
}: {
  title: string
  link: string
  linkLabel: string
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-bold text-neutral-900 tracking-tight">{title}</h2>
      <Link
        to={link}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium
          flex items-center gap-0.5 transition-colors"
      >
        {linkLabel}
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  )
}

// ── 술 카드 가로 스크롤 행 ────────────────────────────────────────
function SpiritCardRow({ spirits }: { spirits: SpiritListItem[] }) {
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4
        lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0"
      style={{ scrollbarWidth: 'none' }}
    >
      {spirits.slice(0, 8).map((spirit) => (
        <div key={spirit.id} className="flex-shrink-0 w-36 sm:w-40 lg:w-auto">
          <SpiritCard spirit={spirit} />
        </div>
      ))}
    </div>
  )
}

// ── 공지사항 아이템 ──────────────────────────────────────────────
function NoticeRow({ notice }: { notice: NoticeListItem }) {
  return (
    <Link
      to={`/notices/${notice.id}`}
      className="flex items-center justify-between py-3.5 border-b border-neutral-100
        last:border-b-0 hover:text-primary-600 transition-colors group"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {notice.isPinned && (
          <span className="flex-shrink-0 text-xs font-semibold text-amber-600 bg-amber-50
            px-1.5 py-0.5 rounded">
            공지
          </span>
        )}
        <span className="text-sm text-neutral-700 group-hover:text-primary-600
          line-clamp-1 transition-colors">
          {notice.title}
        </span>
      </div>
      <span className="text-xs text-neutral-400 ml-3 flex-shrink-0">
        {new Date(notice.createdAt).toLocaleDateString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
        })}
      </span>
    </Link>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function MainPage() {
  const { t, i18n } = useTranslation()

  const bannerLanguage = (i18n.language.toUpperCase() === 'EN' ? 'EN' : 'KO') as 'KO' | 'EN'
  const { data: banners = [] } = useBanners(bannerLanguage)

  const { data: popups = [] } = usePopups(bannerLanguage)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  useEffect(() => {
    if (popups.length > 0) setIsPopupOpen(true)
  }, [popups.length])

  const { data: recentData } = useQuery({
    queryKey: ['home', 'recent'],
    queryFn: () => spiritApi.search({ sort: 'LATEST', size: 8 }).then((r) => r.data.data!),
    staleTime: 60_000,
  })

  const { data: topRatedData } = useQuery({
    queryKey: ['home', 'topRated'],
    queryFn: () => spiritApi.search({ sort: 'SCORE_DESC', size: 8 }).then((r) => r.data.data!),
    staleTime: 60_000,
  })

  const { data: popularData } = useQuery({
    queryKey: ['home', 'popular'],
    queryFn: () =>
      spiritApi.search({ sort: 'REVIEW_COUNT_DESC', size: 8 }).then((r) => r.data.data!),
    staleTime: 60_000,
  })

  const { data: noticesData } = useNotices({ page: 0, size: 5 })

  const recentSpirits  = recentData?.content   ?? []
  const topRated       = topRatedData?.content ?? []
  const popular        = popularData?.content  ?? []
  const notices        = noticesData?.content  ?? []

  const isEn = i18n.language === 'en'

  return (
    <div>
      <SeoMeta
        title={isEn
          ? 'DrinkIndex — Whisky, Wine & Cognac Review Community'
          : 'DrinkIndex — 위스키 · 와인 · 꼬냑 리뷰 커뮤니티'}
        description={isEn
          ? 'Explore whisky, wine, cognac, rum and tequila. Read user reviews, distillery profiles and ratings.'
          : '위스키, 와인, 꼬냑 등 다양한 주류 정보를 탐색하고 리뷰를 공유하세요. 증류소·와이너리 정보와 사용자 평점을 한 곳에서.'}
        canonical={buildCanonical('/')}
        locale={isEn ? 'en_US' : 'ko_KR'}
      />

      {/* ── 메인 배너 슬라이더 ─────────────────────────────────── */}
      {banners.length > 0 && <BannerSlider banners={banners} />}

      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-10 space-y-14">

        {/* ── 주류 카테고리 메뉴 (버튼형) ─────────────────────────── */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl lg:text-2xl font-bold text-neutral-900 tracking-tight">
              {t('home.menu.title')}
            </h2>
            <p className="text-sm text-neutral-500 mt-1.5">{t('home.menu.subtitle')}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3">
            {CATEGORY_MENU.map((cat) => (
              <Link
                key={cat.key}
                to={`/spirits?category=${cat.key}`}
                className="group flex items-center gap-3 px-4 py-3.5 lg:px-5 lg:py-4
                  bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                  text-white rounded-xl transition-all duration-200
                  hover:shadow-md hover:-translate-y-px"
              >
                <span className="text-2xl lg:text-3xl flex-shrink-0">{cat.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm lg:text-base font-bold leading-tight truncate">
                    {t(`spirit.category.${cat.key}`)}
                  </p>
                  <p className="text-xs text-white/70 leading-tight mt-0.5 truncate">
                    {cat.key === 'WHISKY' ? 'Whisky'
                      : cat.key === 'COGNAC' ? 'Cognac'
                      : cat.key === 'WINE' ? 'Wine'
                      : 'Other'}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 ml-auto flex-shrink-0 text-white/60
                    group-hover:text-white group-hover:translate-x-0.5 transition-all"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 최근 등록된 술 ────────────────────────────────────── */}
        {recentSpirits.length > 0 && (
          <section>
            <SectionHeader
              title={t('home.sections.recent')}
              link="/spirits?sort=LATEST"
              linkLabel={t('home.sections.viewAll')}
            />
            <SpiritCardRow spirits={recentSpirits} />
          </section>
        )}

        {/* ── 평점 높은 술 ──────────────────────────────────────── */}
        {topRated.length > 0 && (
          <section>
            <SectionHeader
              title={t('home.sections.topRated')}
              link="/spirits?sort=SCORE_DESC"
              linkLabel={t('home.sections.viewAll')}
            />
            <SpiritCardRow spirits={topRated} />
          </section>
        )}

        {/* ── 인기 술 ────────────────────────────────────────────── */}
        {popular.length > 0 && (
          <section>
            <SectionHeader
              title={t('home.sections.popular')}
              link="/spirits?sort=REVIEW_COUNT_DESC"
              linkLabel={t('home.sections.viewAll')}
            />
            <SpiritCardRow spirits={popular} />
          </section>
        )}

        {/* ── 공지사항 미리보기 ──────────────────────────────────── */}
        {notices.length > 0 && (
          <section>
            <SectionHeader
              title={t('home.sections.notices')}
              link="/notices"
              linkLabel={t('home.sections.viewAll')}
            />
            <div className="bg-white rounded-2xl border border-neutral-100 px-4 lg:px-5">
              {notices.map((notice) => (
                <NoticeRow key={notice.id} notice={notice} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── 팝업 뷰어 ──────────────────────────────────────────── */}
      {isPopupOpen && popups.length > 0 && (
        <PopupViewer popups={popups} onClose={() => setIsPopupOpen(false)} />
      )}
    </div>
  )
}
