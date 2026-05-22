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
  {
    key: 'WHISKY',
    icon: '🥃',
    image: '/images/whisky-category.png',
    imageWebp: '/images/whisky-category.webp',
    subtitle: 'Single Malt · Blended · Bourbon',
    accent: 'from-amber-950/80 via-amber-900/50 to-transparent',
  },
  {
    key: 'COGNAC',
    icon: '🍾',
    image: '/images/cognac-category.png',
    imageWebp: '/images/cognac-category.webp',
    subtitle: 'VS · VSOP · XO · Hors d\'Âge',
    accent: 'from-stone-950/80 via-amber-900/50 to-transparent',
  },
  {
    key: 'WINE',
    icon: '🍷',
    image: '/images/wine-category.png',
    imageWebp: '/images/wine-category.webp',
    subtitle: 'Red · White · Rosé · Sparkling',
    accent: 'from-rose-950/85 via-rose-900/60 to-transparent',
  },
  {
    key: 'OTHER',
    icon: '🫗',
    image: '/images/etc-category.png',
    imageWebp: '/images/etc-category.webp',
    subtitle: 'Rum · Gin · Tequila · Vodka',
    accent: 'from-neutral-950/85 via-neutral-800/60 to-transparent',
  },
] as const

// ── 카테고리 카드 내부 (모바일/데스크탑 공용) ────────────────────
type CatItem = typeof CATEGORY_MENU[number]
function CategoryCardInner({
  cat,
  idx,
  t,
  expanded,
}: {
  cat: CatItem
  idx: number
  t: (key: string) => string
  expanded: boolean
}) {
  return (
    <>
      {cat.image ? (
        <picture>
          <source srcSet={cat.imageWebp} type="image/webp" />
          <img
            src={cat.image}
            alt={t(`spirit.category.${cat.key}`)}
            className="absolute inset-0 w-full h-full object-cover
              transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </picture>
      ) : (
        <div
          className={[
            'absolute inset-0',
            idx === 2
              ? 'bg-gradient-to-br from-rose-950 via-red-900 to-rose-950'
              : 'bg-gradient-to-br from-neutral-800 via-slate-700 to-neutral-900',
          ].join(' ')}
        />
      )}

      <div className={`absolute inset-0 bg-gradient-to-t ${cat.accent}`} />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />

      <div className="absolute inset-0 flex flex-col justify-between p-4 lg:p-5">
        <span className="text-white/90 text-sm lg:text-base font-bold tracking-wide drop-shadow-lg">
          {t(`spirit.category.${cat.key}`)}
        </span>
        <div>
          {cat.subtitle && (
            <p className={`text-white/60 text-xs lg:text-sm mb-1 drop-shadow
              transition-opacity duration-300
              ${expanded ? 'opacity-100' : 'opacity-0'}`}>
              {cat.subtitle}
            </p>
          )}
          <div className="flex items-center gap-1.5">
            {!cat.image && <span className="text-lg">{(cat as { icon: string }).icon}</span>}
            <span className="text-white/80 text-xs font-medium group-hover:text-white
              transition-colors drop-shadow">
              {t('home.menu.explore')} →
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

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
        className="text-sm text-primary-800 hover:text-primary-900 font-medium
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
        last:border-b-0 hover:text-primary-800 transition-colors group"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {notice.isPinned && (
          <span className="flex-shrink-0 text-xs font-semibold text-amber-600 bg-amber-50
            px-1.5 py-0.5 rounded">
            공지
          </span>
        )}
        <span className="text-sm text-neutral-700 group-hover:text-primary-800
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
  const [hoveredCat, setHoveredCat] = useState<string | null>(null)

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

        {/* ── 주류 아카이브 카테고리 ────────────────────────────────── */}
        <section>
          <div className="mb-5">
            <h2 className="text-xl lg:text-2xl font-bold text-neutral-900 tracking-tight">
              {t('home.menu.title')}
            </h2>
            <p className="text-sm text-neutral-500 mt-1.5">{t('home.menu.subtitle')}</p>
          </div>

          {/* ── 모바일: 2×2 균등 그리드 ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:hidden">
            {CATEGORY_MENU.map((cat, idx) => (
              <Link
                key={cat.key}
                to={`/spirits?category=${cat.key}`}
                className="group relative overflow-hidden rounded-2xl h-40"
              >
                <CategoryCardInner cat={cat} idx={idx} t={t} expanded={false} />
              </Link>
            ))}
          </div>

          {/* ── 데스크탑: flex hover 확장 ──────────────────────────────── */}
          <div className="hidden lg:flex gap-4 h-80">
            {CATEGORY_MENU.map((cat, idx) => (
              <Link
                key={cat.key}
                to={`/spirits?category=${cat.key}`}
                onMouseEnter={() => setHoveredCat(cat.key)}
                onMouseLeave={() => setHoveredCat(null)}
                style={{
                  flex: hoveredCat === cat.key ? '2 1 0%' : '1 1 0%',
                  transition: 'flex 0.4s cubic-bezier(0.4,0,0.2,1)',
                }}
                className="group relative overflow-hidden rounded-2xl"
              >
                <CategoryCardInner
                  cat={cat}
                  idx={idx}
                  t={t}
                  expanded={hoveredCat === cat.key}
                />
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
