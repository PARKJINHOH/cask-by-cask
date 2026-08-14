import { useEffect, useState, useMemo, lazy, Suspense } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import { useSpiritDetail, useSpiritSeo } from '@/domain/spirit/hooks/useSpiritDetail'
import { spiritSeoApi } from '@/domain/spirit/api/spiritSeoApi'
import { localizeCountry } from '@/shared/utils/countryName'
import WineOriginMap from '@/domain/location/components/WineOriginMap'
import WineTasteBars from '@/domain/spirit/components/WineTasteBars'
import Badge from '@/shared/components/Badge'
import StarScore from '@/shared/components/StarScore'
import Spinner from '@/shared/components/Spinner'
import Modal from '@/shared/components/Modal'
import Button from '@/shared/components/Button'
import ImageLightbox from '@/shared/components/ImageLightbox'
import { scrollToPageTop } from '@/shared/utils/scrollToPageTop'
import ReviewList from '@/domain/review/components/ReviewList'
import { useReviews } from '@/domain/review/hooks/useReviews'
import { buildBreadcrumbSchema, buildReviewSchema } from '@/shared/utils/seoSchema'
import CommentList from '@/domain/comment/components/CommentList'
import WishlistButtons from '@/domain/wishlist/components/WishlistButtons'
import { useRequireLogin } from '@/domain/auth/hooks/useRequireLogin'
import ShareUrlButton from '@/shared/components/ShareUrlButton'
import SeoMeta, { buildCanonical, SITE_URL } from '@/shared/components/SeoMeta'
import { DEFAULT_OG_IMAGE } from '@/shared/config/site'
import type { SpiritDetail, SpiritImage, SpiritSeo, SpiritVariant } from '@/domain/spirit/types/spirit.types'
import StoreDetailPanel from '@/domain/pricetracker/components/StoreDetailPanel'
import PriceAlertInline from '@/domain/pricetracker/components/PriceAlertInline'
import PriceAlertBanner from '@/domain/pricetracker/components/PriceAlertBanner'
import PriceVolumeFilter from '@/domain/pricetracker/components/PriceVolumeFilter'
import { usePriceChart, usePriceChartDetail, usePriceVolumeOptions } from '@/domain/pricetracker/hooks/usePriceChart'
import { usePriceVolumeSelection } from '@/domain/pricetracker/hooks/usePriceVolumeSelection'
import { useState as useStateForPrice } from 'react'
import type { StoreType } from '@/domain/pricetracker/types/pricetracker.types'
import { CATEGORY_TO_PRODUCER_TYPE, PRODUCER_TYPE_LABEL } from '@/domain/producer/types/producer.types'
import { getLocalizedNames } from '@/domain/spirit/utils/spiritDisplayName'

// 가격 차트는 recharts(약 313KB)를 끌어오지만 기본 탭이 '리뷰'라 첫 화면에서는 쓰이지 않는다.
// 가격 탭을 열 때만 내려받도록 지연 로드한다.
const PriceRangeChart = lazy(() => import('@/domain/pricetracker/components/PriceRangeChart'))

type Tab = 'reviews' | 'community' | 'price'

// 숙성 연수(년/월) 표시. 둘 다 없으면 null. short=true → 축약(yr/년) 표기.
function formatAge(
  years: number | null | undefined,
  months: number | null | undefined,
  isEn: boolean,
  short = false,
): string | null {
  if (years == null && !months) return null
  const parts: string[] = []
  if (years != null) {
    parts.push(isEn ? (short ? `${years}yr` : `${years} Year${years === 1 ? '' : 's'}`) : `${years}년`)
  }
  if (months) {
    parts.push(isEn ? (short ? `${months}mo` : `${months} Month${months === 1 ? '' : 's'}`) : `${months}개월`)
  }
  return parts.join(' ')
}

type AgeDisplaySource = {
  isNas?: boolean | null
  ageStatement?: number | null
  ageStatementMonths?: number | null
}

function formatAgeStatement(
  detail: AgeDisplaySource | null | undefined,
  isEn: boolean,
  short = false,
): string | null {
  if (!detail) return null
  if (detail.isNas) return 'NAS'
  return formatAge(detail.ageStatement, detail.ageStatementMonths, isEn, short)
}

function formatAbv(
  abv: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  if (min != null && max != null) return min === max ? `${min}%` : `${min}%~${max}%`
  if (min != null) return `${min}%`
  if (max != null) return `${max}%`
  return abv != null ? `${abv}%` : null
}

function formatVolume(
  volume: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  if (min != null && max != null) return min === max ? `${min}ml` : `${min}ml~${max}ml`
  if (min != null) return `${min}ml`
  if (max != null) return `${max}ml`
  return volume != null ? `${volume}ml` : null
}

function formatPhenolPpm(
  ppm: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  const formatPpmValue = (value: number) => value.toFixed(1)

  if (min != null && max != null) {
    return min === max ? `${formatPpmValue(min)} ppm` : `${formatPpmValue(min)}~${formatPpmValue(max)} ppm`
  }
  if (min != null) return `${formatPpmValue(min)}+ ppm`
  if (max != null) return `~${formatPpmValue(max)} ppm`
  return ppm != null ? `${formatPpmValue(ppm)} ppm` : null
}
// ── 카테고리 상세 섹션 ─────────────────────────────────────

// `tone='neutral'` — 설명(툴팁)은 달되 강조는 하지 않는다.
// 꼬냑 등급·Fine Champagne 처럼 '사실 표기'일 뿐 우열이나 특별함을 뜻하지 않는 값에 쓴다.
//
// `size='row'` — 상세 목록의 값 자리에 놓일 때. 옆 행(`DI`)의 값과 글자 크기를 맞춰
// 같은 목록 안에서 값끼리 크기가 들쭉날쭉해 보이지 않게 한다.
function Badge2({ children, detail, tone = 'amber', size = 'chip' }: {
  children: React.ReactNode; detail?: string; tone?: 'amber' | 'neutral'; size?: 'chip' | 'row'
}) {
  const [open, setOpen] = useState(false)
  const sizeClass = size === 'row' ? 'text-[14px] px-2.5 py-1' : 'text-xs px-2 py-0.5'
  if (!detail) {
    return (
      <span className={`inline-block rounded-full bg-neutral-100 text-neutral-600 font-medium mr-1 mb-1 ${sizeClass}`}>
        {children}
      </span>
    )
  }
  const toneClass = tone === 'neutral'
    ? 'border-neutral-200 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:border-neutral-300'
    : 'border-amber-200 bg-amber-50/60 text-amber-700 hover:bg-amber-100 hover:border-amber-300'
  return (
    <span className="group relative inline-block mr-1 mb-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className={`rounded-full border font-medium
          transition-colors cursor-help ${sizeClass} ${toneClass}`}
      >
        {children}
      </button>
      <span className={`absolute left-0 bottom-full mb-1.5 z-50 w-max max-w-[240px] rounded-lg bg-neutral-800
        text-white text-[11px] px-3 py-2 shadow-xl leading-relaxed pointer-events-none whitespace-normal
        ${open ? 'block' : 'hidden group-hover:block'}`}>
        {detail}
      </span>
    </span>
  )
}

function DetailGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  // 세로 리스트형: 라벨 좌 · 값 우. 데스크톱은 cols열로 나눠 스크롤 길이 절감.
  const gridColsClass = cols === 1 ? '' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
  return <dl className={`grid grid-cols-1 ${gridColsClass} sm:gap-x-12`}>{children}</dl>
}

// `prose` — 한 문장이 아니라 문단인 값(블렌드 설명 등, 최대 300자).
// 다른 값처럼 우측정렬·굵게 두면 줄마다 시작점이 어긋나 읽기 어려워지므로
// 행 골격(라벨 좌 · 값 우)은 그대로 두고 글줄만 좌측정렬·보통 굵기로 흘린다.
function DI({ label, value, prose }: { label: string; value: React.ReactNode; prose?: boolean }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className={`flex justify-between gap-4 py-3 border-b border-neutral-200 ${prose ? 'items-start' : 'items-center'}`}>
      <dt className={`text-[13px] text-neutral-400 flex-shrink-0 ${prose ? 'pt-0.5' : ''}`}>{label}</dt>
      <dd className={prose
        ? 'text-[14px] text-neutral-600 leading-relaxed text-left'
        : 'text-[14px] font-semibold text-neutral-900 text-right'}>{value}</dd>
    </div>
  )
}

// 다중값이지만 칩이 필요 없는 값(오크 산지·특성 등) — 한 줄에 하나씩, 옆 행의 값과 똑같은 글자로.
// 칩은 툴팁이 달리거나(크뤼) 안에 세부 항목이 들어가는(캐스크) 값에만 남긴다.
function RowText({ children }: { children: React.ReactNode }) {
  return <span className="text-[14px] font-semibold text-neutral-900 text-right">{children}</span>
}

// 멀티값 필드(캐스크 등): 콤마 문자열 대신 개별 칩으로 표시 → 이름 중간 줄바꿈 방지
//
// `stack` — 한 줄에 여러 개를 흘리지 않고 **한 항목당 한 줄**로 세운다.
// 캐스크·크뤼처럼 항목 자체가 길고(세부 분류·비율이 붙는다) 각각이 독립된 사실이라
// 가로로 이어 놓으면 어디까지가 한 항목인지 경계가 흐려진다.
// 칩에 박힌 mr/mb 는 세로 나열에서 간격을 어긋나게 하므로 여기서 지운다.
function DIChips({ label, children, className, stack }: {
  label: string; children: React.ReactNode; className?: string; stack?: boolean
}) {
  if (!children) return null
  return (
    // `DI` 와 같은 골격: 라벨 좌 · 값 우. 값이 칩이라는 이유로 정렬이 달라지면
    // 같은 목록인데 행마다 값을 찾는 위치가 바뀐다.
    <div className={`flex items-start justify-between gap-4 py-3 border-b border-neutral-200 ${className ?? ''}`}>
      <dt className="text-[13px] text-neutral-400 flex-shrink-0 pt-1">{label}</dt>
      <dd className={`flex min-w-0 ${stack
        ? 'flex-col items-end gap-1.5 [&>*]:mr-0 [&>*]:mb-0'
        : 'flex-wrap justify-end gap-2 items-center'}`}>
        {children}
      </dd>
    </div>
  )
}

function SpiritDetailSections({
  spirit,
  isEn,
  parentWhiskyDetail,
}: {
  spirit: SpiritDetail
  isEn: boolean
  /** 릴리즈에 스타일이 없을 때만 상위 원본 주류의 공통 위스키 스타일을 사용한다. */
  parentWhiskyDetail?: SpiritDetail['whiskyDetail']
}) {
  const { t } = useTranslation()
  const cd = spirit.commonDetail
  const whisky = spirit.whiskyDetail
  const wine = spirit.wineDetail
  const cognac = spirit.cognacDetail
  // 크뤼 구성이 없던 시절 데이터는 대표 cru 하나만 있으므로 1줄짜리 구성으로 취급한다.
  const cognacCrus = cognac?.cruComposition?.length
    ? cognac.cruComposition
    : cognac?.cru ? [{ cru: cognac.cru, percentage: null }] : []
  const other = spirit.otherDetail
  const whiskyStyle = whisky?.style ?? parentWhiskyDetail?.style ?? null
  const whiskyStyleOther = whisky?.style ? whisky.styleOther : parentWhiskyDetail?.styleOther
  const hasSplitMapLayout = !!(spirit.wineRegion && (whisky || wine || cognac || other))
  const hasWineKeyInfo = !!(wine && (wine.wineType || wine.vintageStatus))
  const hasCommonStyle = !!(whiskyStyle || other?.styleClassification)
  const hasCommonInfo = !!(cd || hasCommonStyle)
  const hasTopDetail = !!(hasCommonInfo || hasWineKeyInfo)

  const hasAny = cd || whisky || wine || cognac || other
  if (!hasAny) return null

  const WHISKY_STYLE_LABEL: Record<string, string> = {
    SINGLE_MALT: isEn ? 'Single Malt' : '싱글 몰트',
    BLENDED_MALT: isEn ? 'Blended Malt' : '블렌디드 몰트',
    BLENDED_WHISKY: isEn ? 'Blended Whisky' : '블렌디드 위스키',
    BOURBON: 'Bourbon', WHEATED_BOURBON: isEn ? 'Wheated Bourbon' : '밀 버번', TENNESSEE: isEn ? 'Tennessee' : '테네시', RYE: 'Rye',
    POT_STILL: isEn ? 'Single Pot Still' : '싱글 팟 스틸',
    GRAIN_CORN: isEn ? 'Grain / Corn' : '그레인 / 콘',
    OTHER: isEn ? 'Other' : '기타',
  }
  const BOTTLING_LABEL: Record<string, string> = {
    OB: isEn ? 'Official Bottling (Distillery)' : 'Official Bottling (증류소)',
    IB: isEn ? 'Independent Bottling' : 'Independent Bottling (독립 병입)',
  }
  // 캐스크 풀네임 (ko/en). KO 모드는 한글, EN 모드는 Full Name 표기.
  const CASK_LABEL: Record<string, { ko: string; en: string }> = {
    EX_BOURBON:        { ko: '버번 캐스크',              en: 'Ex-Bourbon Cask' },
    EX_SHERRY:         { ko: '셰리 캐스크',              en: 'Ex-Sherry Cask' },
    EX_FINO:           { ko: '피노 셰리 캐스크',         en: 'Ex-Fino Sherry Cask' },
    EX_MANZANILLA:     { ko: '만자니야 셰리 캐스크',     en: 'Ex-Manzanilla Sherry Cask' },
    EX_AMONTILLADO:    { ko: '아몬티야도 셰리 캐스크',   en: 'Ex-Amontillado Sherry Cask' },
    EX_OLOROSO:        { ko: '올로로소 셰리 캐스크',     en: 'Ex-Oloroso Sherry Cask' },
    EX_PALO_CORTADO:   { ko: '팔로 코르타도 셰리 캐스크', en: 'Ex-Palo Cortado Sherry Cask' },
    EX_PX:             { ko: 'PX(페드로 히메네스) 셰리 캐스크', en: 'Ex-PX (Pedro Ximénez) Sherry Cask' },
    EX_PORT:           { ko: '포트 와인 캐스크',         en: 'Ex-Port Wine Cask' },
    EX_MADEIRA:        { ko: '마데이라 와인 캐스크',     en: 'Ex-Madeira Wine Cask' },
    EX_SAUTERNES:      { ko: '소테른 와인 캐스크',       en: 'Ex-Sauternes Wine Cask' },
    EX_MARSALA:        { ko: '마르살라 와인 캐스크',     en: 'Ex-Marsala Wine Cask' },
    EX_MALAGA:         { ko: '말라가 와인 캐스크',       en: 'Ex-Málaga Wine Cask' },
    EX_TOKAJI:         { ko: '토카이 와인 캐스크',       en: 'Ex-Tokaji Wine Cask' },
    EX_VERMOUTH:       { ko: '베르무트 캐스크',          en: 'Ex-Vermouth Cask' },
    EX_WINE:           { ko: '와인 캐스크',              en: 'Ex-Wine Cask' },
    VINO_BARRIQUE:     { ko: '비노 바리끄',              en: 'Vino Barrique' },
    EX_RUM:            { ko: '럼 캐스크',                en: 'Ex-Rum Cask' },
    EX_COGNAC:         { ko: '꼬냑 캐스크',              en: 'Ex-Cognac Cask' },
    EX_BRANDY:         { ko: '브랜디 캐스크',            en: 'Ex-Brandy Cask' },
    EX_CALVADOS:       { ko: '칼바도스 캐스크',          en: 'Ex-Calvados Cask' },
    EX_ARMAGNAC:       { ko: '아르마냑 캐스크',          en: 'Ex-Armagnac Cask' },
    EX_MEZCAL_TEQUILA: { ko: '메스칼/데킬라 캐스크',     en: 'Ex-Mezcal/Tequila Cask' },
    EX_BEER:           { ko: '맥주 캐스크',              en: 'Ex-Beer Cask' },
    NEW_OAK:           { ko: '뉴(버진) 오크',            en: 'New (Virgin) Oak' },
    FRENCH_OAK:        { ko: '프렌치 오크',              en: 'French Oak' },
    CHINKAPIN:         { ko: '친카핀 오크',              en: 'Chinkapin Oak' },
    MIZUNARA:          { ko: '미즈나라 (일본 오크)',     en: 'Mizunara (Japanese Oak)' },
    EX_UMESHU:         { ko: '매실주(우메슈) 캐스크',    en: 'Ex-Umeshu Cask' },
    TEAK_WOOD:         { ko: '티크우드',                 en: 'Teak Wood' },
    PEATED_CASK:       { ko: '피티드 캐스크',            en: 'Peated Cask' },
    OTHER:             { ko: '기타',                     en: 'Other' },
  }
  const caskLabel = (c: string) => {
    const l = CASK_LABEL[c]
    return l ? (isEn ? l.en : l.ko) : c
  }
  const OTHER_TYPE_LABEL: Record<string, string> = {
    RUM: isEn ? 'Rum' : '럼', GIN: isEn ? 'Gin' : '진', VODKA: isEn ? 'Vodka' : '보드카',
    TEQUILA: isEn ? 'Tequila' : '데킬라', MEZCAL: isEn ? 'Mezcal' : '메스칼',
    BRANDY: isEn ? 'Brandy' : '브랜디', LIQUEUR: isEn ? 'Liqueur' : '리큐르',
    SAKE: isEn ? 'Sake' : '사케', SOJU: isEn ? 'Soju' : '소주', BAIJIU: isEn ? 'Baijiu' : '바이주',
    ABSINTHE: isEn ? 'Absinthe' : '압생트', BEER: isEn ? 'Beer' : '맥주', OTHER: isEn ? 'Other' : '기타',
  }
  const reportName = isEn ? (spirit.nameEn || spirit.nameKo) : spirit.nameKo
  const reportHref = `/request/feedback/new?type=ETC`
    + `&title=${encodeURIComponent(t('spirit.detail.reportErrorTitle', { name: reportName }))}`
    + `&content=${encodeURIComponent(t('spirit.detail.reportErrorBody', { name: reportName, id: spirit.id }))}`

  return (
    <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(17,24,39,0.12)] ring-1 ring-neutral-100 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-3 pb-4 mb-6 border-b border-neutral-100">
        <h2 className="text-[16px] font-bold text-neutral-900">
          {isEn ? 'Detailed Information' : '상세 정보'}
        </h2>
        <Link
          to={reportHref}
          className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-lg border border-neutral-200
            px-3 py-1.5 text-[12px] font-semibold text-neutral-500 hover:border-red-300
            hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {t('spirit.detail.reportError')}
        </Link>
      </div>

      {/* 공통 정보와 카테고리 상세는 끊긴 블록이 아니라 이어지는 한 목록으로 읽혀야 한다.
          세로 간격을 최소로 두어 공통 마지막 행과 카테고리 첫 행이 같은 리스트처럼 붙는다.
          (가로 간격은 지도 2분할 레이아웃에서만 쓰이므로 따로 유지) */}
      <div className={hasSplitMapLayout
        ? 'grid grid-cols-1 gap-x-8 gap-y-2 items-start lg:grid-cols-2 lg:gap-x-4'
        : 'space-y-2'}>
        {/* 와인 핵심 정보·공통 상세 + 산지 지도 — PC에서는 좌우 2분할, 모바일에서는 세로 배치 */}
        {(hasTopDetail || spirit.wineRegion) && (
          <div className={hasSplitMapLayout
            ? 'contents'
            : `grid grid-cols-1 gap-4 items-start ${cd && spirit.wineRegion ? 'lg:grid-cols-2' : ''}`}>
            {hasTopDetail && (
              <div className={hasSplitMapLayout ? 'order-1 lg:col-start-1 lg:row-start-1' : undefined}>
                {wine && hasWineKeyInfo && (
                  <div className={hasCommonInfo ? 'mb-8' : undefined}>
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Wine</p>
                    <DetailGrid cols={2}>
                      <DI label={isEn ? 'Type' : '종류'} value={wine.wineType ? t(`spirit.wineType.${wine.wineType}`) : null} />
                      <DI
                        label={t('spirit.wineForm.vintage')}
                        value={wine.vintageStatus === 'VINTAGE'
                          ? spirit.vintageYear
                          : wine.vintageStatus
                            ? t(`spirit.wineVintageStatus.${wine.vintageStatus}`)
                            : null}
                      />
                    </DetailGrid>
                  </div>
                )}
                {hasCommonInfo && (
                  <>
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
                      {isEn ? 'Common' : '공통'}
                    </p>
                    <DetailGrid cols={2}>
                      {whisky && (
                        <DI label={isEn ? 'Style' : '스타일'}
                          value={whiskyStyle === 'OTHER'
                            ? (whiskyStyleOther || WHISKY_STYLE_LABEL.OTHER || whiskyStyle)
                            : whiskyStyle ? WHISKY_STYLE_LABEL[whiskyStyle] ?? whiskyStyle : null} />
                      )}
                      {other && (
                        <DI label={isEn ? 'Style' : '세부 스타일'} value={other.styleClassification} />
                      )}
                      {cd && (
                        <>
                          <DI label={isEn ? 'Age Statement' : '숙성 연수'}
                            value={cd.isNas
                              ? <span className="px-2 py-0.5 rounded bg-neutral-800 text-white text-xs font-bold">NAS</span>
                              : formatAgeStatement(cd, isEn)} />
                          <DI label={isEn ? 'Distilled' : '증류 연월'} value={cd.distilledDate} />
                          <DI label={isEn ? 'Bottled' : '병입 연월'} value={cd.bottledDate} />
                          <DI label={isEn ? 'Volume' : '용량'} value={formatVolume(spirit.volumeMl ?? cd.volumeMl, spirit.volumeMlMin, spirit.volumeMlMax)} />
                          <DI label={isEn ? 'ABV' : '도수'} value={formatAbv(spirit.abv ?? cd.abv, spirit.abvMin, spirit.abvMax)} />
                          <DI label={isEn ? 'Bottle No.' : '병 번호'} value={cd.bottleNo} />
                          <DI label={isEn ? 'Total Bottles' : '총 병 수'}
                            value={cd.totalBottles != null ? cd.totalBottles.toLocaleString() : null} />
                        </>
                      )}
                    </DetailGrid>
                  </>
                )}
              </div>
            )}
            {spirit.wineRegion && (
              <WineOriginMap
                key={spirit.id}
                wineRegion={spirit.wineRegion}
                countryLabel={localizeCountry(spirit.country, isEn ? 'en' : 'ko')}
                className={hasSplitMapLayout
                  ? `order-3 lg:col-start-2 lg:row-start-1 ${hasTopDetail ? 'lg:row-span-2' : ''}`
                  : undefined}
              />
            )}
          </div>
        )}

        {/* 위스키 상세 */}
        {whisky && (
          <div className={hasSplitMapLayout
            ? `order-2 lg:col-start-1 ${hasTopDetail ? 'lg:row-start-2' : 'lg:row-start-1'}`
            : undefined}>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Whisky</p>
            <DetailGrid cols={1}>
              <DI label={isEn ? 'Bottling' : '병입'}
                value={whisky.bottlingType ? BOTTLING_LABEL[whisky.bottlingType] ?? whisky.bottlingType : null} />
              <DIChips label={isEn ? 'Cask' : '캐스크'} stack>
                {(whisky.caskTypes ?? []).map((c) => {
                  const label = caskLabel(c)
                  const details = whisky.caskDetails?.[c] || []
                  let smallCats = details.filter(Boolean)
                  if (smallCats.length === 0 && c === 'OTHER' && whisky.caskTypeOther) {
                    smallCats = [whisky.caskTypeOther]
                  }
                  const isFinish = whisky.caskFinishes?.includes(c) ?? false
                  // 세부 분류도 같은 목록의 값이라 글자 크기를 옆 행과 맞춘다
                  const colorClass = 'bg-indigo-50/70 text-indigo-700 border border-indigo-200/50 rounded px-1.5 py-0 text-[14px] font-semibold break-keep'

                  return (
                    <div key={c} className={`inline-flex items-center justify-end gap-1.5 rounded-md px-2.5 py-1 text-[14px] font-medium break-keep flex-wrap ${
                      isFinish
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      <span>{label} {isFinish && (isEn ? '(Finish)' : '(피니시)')}</span>
                      {smallCats.length > 0 && (
                        // 줄이 넘어가도 값은 계속 오른쪽에 붙어 있어야 한다
                        <div className="flex items-center justify-end gap-1 flex-wrap pl-1">
                          {smallCats.map((sc, idx) => {
                            return (
                              <span key={idx} className="flex items-center gap-1">
                                <span className={colorClass}>
                                  {sc}
                                </span>
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </DIChips>
              <DI label={isEn ? 'Phenol (ppm)' : '피트 강도'}
                value={formatPhenolPpm(whisky.phenolPpm, whisky.phenolPpmMin, whisky.phenolPpmMax)} />
              {/* 표기 플래그도 결국 값이다 — 목록 밖에 따로 떠 있으면 이 줄만 정렬 규칙에서 벗어난다.
                  뱃지를 빼면서 툴팁에만 있던 한국어 뜻을 본문으로 끌어올린다 — 설명이 사라지면 안 된다. */}
              <DIChips label={isEn ? 'Attributes' : '특성'} stack>
                {(() => {
                  const flags: [unknown, string, string][] = [
                    [whisky.isNonChillFiltered, 'Non-Chill Filtered', '저온 여과 생략'],
                    [whisky.isNaturalColour, 'Natural Colour', '캐러멜 색소 무첨가'],
                    [whisky.isSingleCask, 'Single Cask', '단일 캐스크'],
                    [whisky.isCaskStrength, 'Cask Strength', '원액 그대로'],
                    [whisky.isPeated, 'Peated', '피트 사용'],
                  ]
                  const on = flags.filter(([v]) => v)
                  // 빈 배열은 truthy 라 DIChips 가 숨기지 못한다 — 없으면 명시적으로 null
                  return on.length
                    ? on.map(([, label, ko]) => (
                      <RowText key={label}>{isEn ? label : `${label} (${ko})`}</RowText>
                    ))
                    : null
                })()}
              </DIChips>
            </DetailGrid>
          </div>
        )}

        {/* 와인 상세 */}
        {wine && (
          <div className={hasSplitMapLayout
            ? `order-2 lg:col-start-1 ${hasTopDetail ? 'lg:row-start-2' : 'lg:row-start-1'}`
            : undefined}>
            {/* 맛 지표는 공통 정보 + 산지 지도 아래에서 독립적으로 표시한다 */}
            <div className="mb-4">
              <div className="rounded-2xl ring-1 ring-neutral-100 bg-white p-4 sm:p-5">
                <h3 className="text-sm font-bold text-neutral-900 mb-3">{t('spirit.taste.title')}</h3>
                <WineTasteBars
                  values={{
                    sweetness: wine.sweetness, body: wine.body,
                    acidity: wine.acidity, tannin: wine.tannin,
                  }}
                />
              </div>
            </div>

            {/* ── 그 아래 나머지 와인 정보 ──────────────────────────── */}
            <DetailGrid cols={1}>
              <DI label={isEn ? 'Appellation' : '원산지 명칭'} value={wine.appellationDesignation} />
              <DI label={isEn ? 'Soil' : '토양'} value={wine.soilType} />
              <DI label={isEn ? 'Altitude' : '고도'} value={wine.altitudeM != null ? `${wine.altitudeM}m` : null} />
              <DI label={isEn ? 'Harvest' : '수확 방법'} value={wine.harvestMethod} />
              <DI label={isEn ? 'Fermentation' : '발효 용기'} value={wine.fermentationVessel} />
              <DI label={isEn ? 'Certification' : '인증'} value={wine.certification && wine.certification !== 'NONE' ? t(`spirit.wineCertification.${wine.certification}`) : null} />
              <DI label={isEn ? 'Oak Aged' : '오크 숙성'}
                value={wine.isOakAged != null ? (wine.isOakAged ? (isEn ? 'Yes' : '예') : (isEn ? 'No' : '아니요')) : null} />
              {wine.oakType && <DI label={isEn ? 'Oak' : '오크'} value={wine.oakType} />}
              {wine.oakAgedMonths && (
                <DI label={isEn ? 'Oak Months' : '오크 숙성'} value={`${wine.oakAgedMonths}${isEn ? ' mo.' : '개월'}`} />
              )}
              <DI label={t('spirit.wineForm.naturalClaim')}
                value={wine.isNaturalWine != null
                  ? t(wine.isNaturalWine ? 'spirit.wineForm.yes' : 'spirit.wineForm.no')
                  : null} />
              {/* 당도·바디·산도·타닌은 상단 5단계 바로 표시하므로 여기서는 중복 표기하지 않는다 */}
              {/* 품종도 크뤼·캐스크와 같은 다중값이라 같은 규칙(라벨 좌·값 우, 한 줄에 하나)으로 둔다 */}
              <DIChips label={isEn ? 'Grape Varieties' : '포도 품종'} stack>
                {wine.grapeVarieties?.length
                  ? wine.grapeVarieties.map((g, i) => (
                    <Badge2 size="row" key={i}>{g.name}{g.percentage ? ` ${g.percentage}%` : ''}</Badge2>
                  ))
                  : null}
              </DIChips>
            </DetailGrid>
          </div>
        )}

        {/* 꼬냑 상세 */}
        {cognac && (
          <div className={hasSplitMapLayout
            ? `order-2 lg:col-start-1 ${hasTopDetail ? 'lg:row-start-2' : 'lg:row-start-1'}`
            : undefined}>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Cognac</p>

            <div className="mt-1">
              <DetailGrid cols={1}>
                {/* 등급도 다른 값과 같은 한 행이다. 큰 배지로 띄우면 이 값만 목록에서 벗어난다.
                    'NO_STATEMENT' 는 등급이 아니라 "등급이 없다"는 사실이라 흐리게 둔다. */}
                <DI label={isEn ? 'Grade' : '등급'}
                  value={!cognac.grade ? null : cognac.grade === 'NO_STATEMENT'
                    ? <span className="text-neutral-400">{t('spirit.cognacGrade.NO_STATEMENT')}</span>
                    : t(`spirit.cognacGrade.${cognac.grade}`)} />
                {/* Fine Champagne 은 위스키 '특성' 과 같은 성격의 표기 플래그다.
                    툴팁을 없앤 대신 뜻을 괄호로 붙인다 — 처음 보는 사람에게 용어만 남기면 의미가 없다. */}
                <DIChips label={isEn ? 'Attributes' : '특성'} stack>
                  {cognac.isFineChampagne
                    ? <RowText>Fine Champagne ({t('spirit.cognacFineChampagneNote')})</RowText>
                    : null}
                </DIChips>
                {/* 크뤼는 개수·비율이 붙어 길어지므로 칩 + 전체 폭. 콤마 문자열이면 이름 중간에서 줄이 바뀐다 */}
                {/* '크뤼'만 쓰면 일반 이용자에게는 전달되지 않는다 — 무엇의 산지인지 라벨로 밝히고 용어는 괄호로 남긴다 */}
                <DIChips label={isEn ? 'Cru (Growing Area)' : '포도 산지 (크뤼)'} stack>
                  {cognacCrus.length > 0 ? (
                    <>
                      {/* 꼬냑은 여러 크뤼를 섞는 것이 기본이라 '블렌드'를 별도 필드로 두지 않고
                          구성 개수에서 파생한다 — 변별력은 그 반대편(싱글 크뤼)에 있다. */}
                      <Badge2 size="row" detail={t(cognacCrus.length === 1
                        ? 'spirit.cognacBlend.singleCruHelp'
                        : 'spirit.cognacBlend.multiCruHelp')}>
                        {t(cognacCrus.length === 1
                          ? 'spirit.cognacBlend.singleCru'
                          : 'spirit.cognacBlend.multiCru')}
                      </Badge2>
                      {cognacCrus.map((c) => (
                        <Badge2 size="row" key={c.cru}>
                          {t(`spirit.cognacCru.${c.cru}`)}{c.percentage != null ? ` ${c.percentage}%` : ''}
                        </Badge2>
                      ))}
                    </>
                  ) : null}
                </DIChips>
                {/* '오크 산지'는 오크통을 만든 나무가 자란 곳이다 — 통 이야기임이 드러나게 쓴다 */}
                <DIChips label={isEn ? 'Oak Origin' : '오크통 산지'} stack>
                  {cognac.oakTypes?.length
                    ? cognac.oakTypes.map((o) => (
                      <RowText key={o}>{t(`spirit.cognacOak.${o}`)}</RowText>
                    ))
                    : null}
                </DIChips>
                <DI label={isEn ? 'Vintage' : '빈티지'} value={cognac.vintageYear} />
                <DI label={isEn ? 'Age' : '숙성연수'} value={cognac.ageYears != null ? `${cognac.ageYears}${isEn ? ' yr' : '년'}` : null} />
                <DI label={isEn ? 'Cask Finish' : '캐스크 피니시'} value={cognac.caskFinish} />
                {/* 서술형이지만 따로 떼면 이 값만 정렬·크기가 달라진다 — 같은 행 규칙 안에 둔다 */}
                <DI label={isEn ? 'Blend' : '블렌드'} value={cognac.blendDetail} prose />
              </DetailGrid>
            </div>
          </div>
        )}

        {/* 기타 상세 */}
        {other && (
          <div className={hasSplitMapLayout
            ? `order-2 lg:col-start-1 ${hasTopDetail ? 'lg:row-start-2' : 'lg:row-start-1'}`
            : undefined}>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
              {isEn ? 'Other' : '기타'}
            </p>
            <DetailGrid cols={1}>
              <DI label={isEn ? 'Type' : '주종'}
                value={other.otherType ? OTHER_TYPE_LABEL[other.otherType] ?? other.otherType : null} />
              <DI label={isEn ? 'Cask' : '캐스크'} value={other.caskType} />
              <DI label={isEn ? 'Origin' : '원산지'} value={other.originDesignation} />
              <DI label={isEn ? 'Main Ingredient' : '주원료'} value={other.mainIngredient} />
              <DI label={isEn ? 'Production' : '제조 방식'} value={other.productionMethod} />
            </DetailGrid>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────

function Gallery({
  images, nameKo, selectedIdx, onSelect, onImageClick,
}: {
  images: SpiritImage[]
  nameKo: string
  selectedIdx: number
  onSelect: (i: number) => void
  onImageClick: (i: number) => void
}) {
  const current = images[selectedIdx]
  return (
    <div className="space-y-3">
      <div
        onClick={() => current && onImageClick(selectedIdx)}
        className={`aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-neutral-100 bg-white relative group ${
          current ? 'cursor-zoom-in' : ''
        }`}
      >
        {current ? (
          <>
            <img key={current.id} src={current.imageUrl} alt={nameKo}
              className="absolute inset-0 w-full h-full object-contain p-4"
              loading="eager" fetchPriority="high" decoding="async" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors
              flex items-center justify-center">
              <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            {images.length > 1 && (
              <span className="absolute bottom-3 right-3 text-[11px] font-medium text-neutral-500
                bg-white/85 backdrop-blur rounded-full px-2 py-0.5 ring-1 ring-black/5">
                {selectedIdx + 1} / {images.length}
              </span>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🥃</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, i) => (
            <button key={img.id} onClick={() => onSelect(i)}
              className={`aspect-square rounded-xl overflow-hidden bg-white ring-2 transition-all ${
                i === selectedIdx ? 'ring-primary-500' : 'ring-neutral-200 hover:ring-neutral-300'
              }`}>
              <img src={img.imageUrl} alt={`${nameKo} ${i + 1}`}
                loading="lazy" decoding="async" className="w-full h-full object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatVariantSelectLabel(variant: SpiritVariant, isEn: boolean) {
  const valText = isEn ? (variant.variantValueEn || variant.variantValue) : variant.variantValue
  const bottledText = variant.bottledDate
  const main = valText || bottledText || String(variant.id)
  const specs = [
    variant.abv != null ? `${variant.abv}%` : null,
    variant.volumeMl != null ? `${variant.volumeMl}ml` : null,
  ].filter(Boolean)
  return specs.length > 0 ? `${main} (${specs.join(', ')})` : main
}

function toVariantOption(spirit: SpiritDetail): SpiritVariant {
  return {
    id: spirit.id,
    nameKo: spirit.nameKo,
    nameEn: spirit.nameEn,
    category: spirit.category,
    vintageYear: spirit.vintageYear,
    vintageStatus: spirit.wineDetail?.vintageStatus ?? null,
    abv: spirit.abv,
    volumeMl: spirit.volumeMl,
    bottleNo: spirit.commonDetail?.bottleNo ?? null,
    bottledDate: spirit.commonDetail?.bottledDate ?? null,
    avgScore: spirit.avgScore,
    reviewCount: spirit.reviewCount,
    primaryImageUrl: spirit.primaryImageUrl,
    variantType: spirit.variantType,
    variantValue: spirit.variantValue,
    variantValueEn: spirit.variantValueEn,
    seriesIdentifier: spirit.seriesIdentifier,
    seriesIdentifierEn: spirit.seriesIdentifierEn,
    displayOrder: spirit.displayOrder,
  }
}

function compareVariantDisplayOrder(a: SpiritVariant, b: SpiritVariant) {
  const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER
  const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER
  if (orderA !== orderB) return orderA - orderB
  return a.id - b.id
}

function stripLangPrefix(path: string) {
  return path.replace(/^\/(ko|en)(?=\/)/, '') || '/'
}

function localizedSeoPath(seo: SpiritSeo | undefined, isEn: boolean) {
  if (!seo) return null
  return stripLangPrefix(isEn ? seo.canonicalPathEn : seo.canonicalPathKo)
}

function currentRoutePath(pathname: string) {
  return stripLangPrefix(pathname).replace(/\/+$/, '') || '/'
}

function PriceTabContent({
  spiritId,
  selectedVariantId,
  variants,
}: {
  spiritId: number
  selectedVariantId: number | null
  variants: SpiritVariant[]
}) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const [storeType, setStoreType] = useStateForPrice<StoreType>('DOMESTIC')
  const [period, setPeriod] = useStateForPrice('3M')
  const [selectedDate, setSelectedDate] = useStateForPrice<string | null>(null)

  const variantLabelMap = useMemo(() => {
    const labels = variants.reduce<Record<number, string>>((acc, variant) => {
      acc[variant.id] = formatVariantSelectLabel(variant, isEn)
      return acc
    }, {})
    labels[spiritId] = t('spirit.detail.masterProduct', '대표/통합')
    return labels
  }, [variants, isEn, spiritId, t])

  const integratedVariantIds = variants.length > 0 ? Array.from(new Set(variants.map((variant) => variant.id))) : []
  const isIntegratedVariantChart = selectedVariantId == null && integratedVariantIds.length > 0
  const chartSpiritIds = isIntegratedVariantChart
    ? integratedVariantIds
    : [selectedVariantId ?? spiritId]
  const primaryChartSpiritId = chartSpiritIds[0] ?? spiritId
  const actionSpiritId = selectedVariantId ?? spiritId
  const preferredVolumeMl = variants.find((variant) => variant.id === actionSpiritId)?.volumeMl ?? null
  const { data: volumeOptions, isLoading: volumeOptionsLoading } = usePriceVolumeOptions(
    primaryChartSpiritId,
    storeType,
    isIntegratedVariantChart ? chartSpiritIds : undefined,
  )
  const selectableVolumeOptions = useMemo(() => {
    if (!volumeOptions) return undefined
    if (preferredVolumeMl == null || volumeOptions.some((option) => option.volumeMl === preferredVolumeMl)) {
      return volumeOptions
    }
    return [{ volumeMl: preferredVolumeMl, count: 0 }, ...volumeOptions]
  }, [volumeOptions, preferredVolumeMl])
  const [selectedVolume, setSelectedVolume] = usePriceVolumeSelection(selectableVolumeOptions, preferredVolumeMl)
  const volumeReady = selectableVolumeOptions !== undefined
    && (selectableVolumeOptions.length === 0 || selectedVolume !== null)
  const selectedKnownVolume = typeof selectedVolume === 'number' ? selectedVolume : null
  const registerHref = `/price-tracker/register?spiritId=${actionSpiritId}${
    selectedKnownVolume ? `&volumeMl=${selectedKnownVolume}` : ''
  }`

  useEffect(() => {
    setSelectedDate(null)
  }, [storeType, period, selectedVariantId, selectedVolume])

  const { data: chartData, isLoading: chartLoading } = usePriceChart(
    primaryChartSpiritId,
    storeType,
    period,
    undefined,
    isIntegratedVariantChart ? chartSpiritIds : undefined,
    selectedVolume,
    volumeReady,
  )
  const { data: rawDetails, isLoading: detailLoading } = usePriceChartDetail(
    primaryChartSpiritId,
    selectedDate,
    storeType,
    chartData?.bucketType,
    isIntegratedVariantChart ? chartSpiritIds : undefined,
    selectedVolume,
  )
  const details = rawDetails?.map((detail) => ({
    ...detail,
    variantLabel: detail.spiritId != null ? variantLabelMap[detail.spiritId] : undefined,
  }))

  return (
    <div className="space-y-4">
      {/* PRICE_ALERT 발동 배너 + 목표가 알림 인라인 */}
      <PriceAlertBanner spiritId={actionSpiritId} volume={selectedVolume} />
      <PriceVolumeFilter
        options={selectableVolumeOptions}
        value={selectedVolume}
        onChange={setSelectedVolume}
        isLoading={volumeOptionsLoading}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[240px]">
          <PriceAlertInline spiritId={actionSpiritId} volumeMl={selectedKnownVolume} />
        </div>
        <Link
          to={registerHref}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-primary-700 text-white text-xs font-medium hover:bg-primary-800 transition-colors"
        >
          + {t('price.registerBtn')}
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-neutral-200 p-4">
          {/* 지연 로드 중에도 차트 영역 높이를 유지해 레이아웃이 밀리지 않게 한다. */}
          <Suspense
            fallback={(
              <div className="flex min-h-[300px] items-center justify-center">
                <Spinner />
              </div>
            )}
          >
            <PriceRangeChart
              data={chartData ?? undefined} isLoading={chartLoading || !volumeReady}
              period={period} onPeriodChange={setPeriod}
              storeType={storeType} onStoreTypeChange={setStoreType}
              onPointClick={(date) => setSelectedDate(date)}
              selectedDate={selectedDate}
              seriesLabels={variantLabelMap}
            />
          </Suspense>
        </div>
        <div className="lg:w-72 bg-white rounded-2xl border border-neutral-200 min-h-[300px]">
          <StoreDetailPanel details={details ?? undefined} isLoading={detailLoading} selectedDate={selectedDate} />
        </div>
      </div>
    </div>
  )
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const { t } = useTranslation()
  const tabs: { id: Tab; label: string }[] = [
    { id: 'reviews',   label: t('review.tab') },
    { id: 'community', label: t('comment.tab') },
    { id: 'price',     label: t('price.tab') },
  ]
  return (
    <div role="tablist" className="flex border-b border-neutral-200 gap-6">
      {tabs.map(({ id, label }) => (
        <button key={id} role="tab" aria-selected={active === id} onClick={() => onChange(id)}
          className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === id
              ? 'border-primary-800 text-primary-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}>
          {label}
        </button>
      ))}
    </div>
  )
}


// ── Variant Selector ──────────────────────────────────────
function VariantSelector({
  variants,
  selectedValue,
  onChange,
}: {
  variants: SpiritVariant[]
  selectedValue: number | null
  onChange: (id: number | null) => void
}) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  if (variants.length === 0) return null
  const isWine = variants.some((variant) => variant.category === 'WINE')

  return (
    <div className="flex items-center gap-2 mb-2 bg-neutral-50 border border-neutral-200/60 rounded-2xl p-3 w-fit text-left">
      <label htmlFor="variant-filter-select" className="text-xs font-bold text-neutral-500 shrink-0">
        {t(isWine ? 'spirit.detail.vintageFilter' : 'spirit.detail.variantFilter')}
      </label>
      <select
        id="variant-filter-select"
        value={selectedValue ?? ''}
        onChange={(e) => {
          const val = e.target.value
          onChange(val === '' ? null : Number(val))
        }}
        className="text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer min-w-[180px]"
      >
        <option value="">{t(isWine ? 'spirit.detail.vintageAll' : 'spirit.detail.variantAll')}</option>
        {variants.map((v) => {
          const label = formatVariantSelectLabel(v, isEn)
          return (
            <option key={v.id} value={v.id}>
              {label}
            </option>
          )
        })}
      </select>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────

export default function SpiritDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const requireLogin = useRequireLogin()
  const spiritId = parseInt(id || '', 10)
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const [selectedImg, setSelectedImg]   = useState(0)
  const [activeTab, setActiveTab]       = useState<Tab>('reviews')
  const [loginModal, setLoginModal]     = useState(false)
  const [lightboxIdx, setLightboxIdx]   = useState(-1)
  const [reviewVariantFilterId, setReviewVariantFilterId] = useState<number | null>(null)
  const [priceVariantId, setPriceVariantId] = useState<number | null>(null)

  const { data: spirit, isLoading } = useSpiritDetail(spiritId)
  // 릴리즈에 누락된 공통 위스키 스타일은 상위 원본 주류에서만 보완한다.
  // React Query 캐시를 공유하므로 상위 주류를 이미 본 경우 추가 요청은 발생하지 않는다.
  const { data: parentSpirit } = useSpiritDetail(spirit?.parentId ?? 0)
  const { data: spiritSeo } = useSpiritSeo(spiritId)

  // SEO Review 스키마용 — 첫 페이지 (ReviewList 와 동일 queryKey 라 캐시 공유)
  const { data: reviewsPage } = useReviews(spiritId, 0)

  const isVariantSplitGroup = spirit ? (spirit.parentId != null || (spirit.variants && spirit.variants.length > 0)) : false
  const hasVariants = isVariantSplitGroup
  const masterSpiritId = spirit?.parentId ?? spirit?.id ?? spiritId

  const variantsList = useMemo(() => {
    if (!spirit) return []
    const byId = new Map<number, SpiritVariant>()
    if (spirit.parentId != null || (spirit.variants && spirit.variants.length > 0)) {
      byId.set(spirit.id, toVariantOption(spirit))
      ;(spirit.variants ?? []).forEach((variant) => byId.set(variant.id, variant))
    }
    return Array.from(byId.values()).sort(compareVariantDisplayOrder)
  }, [spirit])

  const variantSeoQueries = useQueries({
    queries: variantsList.map((variant) => ({
      queryKey: ['spiritSeo', variant.id],
      queryFn: () => spiritSeoApi.getSeo(variant.id).then((res) => res.data.data!),
      enabled: !!variant.id,
      staleTime: 1000 * 60 * 30,
    })),
  })

  const variantSeoById = useMemo(() => {
    const map = new Map<number, SpiritSeo>()
    variantSeoQueries.forEach((query, index) => {
      const id = variantsList[index]?.id
      if (id && query.data) {
        map.set(id, query.data as SpiritSeo)
      }
    })
    return map
  }, [variantSeoQueries, variantsList])

  const groupOptions = useMemo(() => {
    return variantsList.map((v) => {
      return {
        id: v.id,
        label: formatVariantSelectLabel(v, isEn),
      }
    })
  }, [variantsList, isEn])

  const reviewVariantLabelMap = useMemo(() => {
    if (!isVariantSplitGroup) return {}
    return variantsList.reduce<Record<number, string>>((acc, variant) => {
      acc[variant.id] = formatVariantSelectLabel(variant, isEn)
      return acc
    }, {})
  }, [isVariantSplitGroup, variantsList, isEn])

  useEffect(() => {
    const targetPath = localizedSeoPath(spiritSeo, isEn)
    if (!targetPath) return
    if (currentRoutePath(location.pathname) !== targetPath.replace(/\/+$/, '')) {
      navigate(targetPath, { replace: true })
    }
  }, [spiritSeo, isEn, location.pathname, navigate])

  // 변형(다른 배치) 간 이동 시 갤러리·탭 상태 초기화
  // 리뷰 배치/병입 필터는 항상 "전체"로 초기화한다.
  // 에디션이 바뀌면 내용 전체가 교체되므로 페이지 최상단으로 스크롤한다.
  useEffect(() => {
    setSelectedImg(0)
    setActiveTab('reviews')
    setLightboxIdx(-1)
    setReviewVariantFilterId(null)
    setPriceVariantId(null)
    scrollToPageTop(null)
  }, [spiritId])

  if (isLoading) return <Spinner fullscreen />

  if (!spirit) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-500">{t('spirit.detail.notFound')}</p>
      </div>
    )
  }

  const { primaryName, secondaryName } = getLocalizedNames(spirit.nameKo, spirit.nameEn, i18n.language)
  const primaryProducer   = isEn ? (spirit.producerNameEn || spirit.producerNameKo) : spirit.producerNameKo
  const secondaryProducer = isEn ? spirit.producerNameKo : spirit.producerNameEn
  const brandName = spirit.whiskyDetail?.brandName || null
  const countryLabel = localizeCountry(spirit.country, i18n.language)
  // 카테고리별 서술형 추가 정보 — 상세 카드 대신 이미지 오른쪽 상단 정보 영역에 표시한다.
  const headerAdditionalInfo = (
    spirit.whiskyDetail?.notes
    ?? spirit.wineDetail?.notes
    ?? spirit.cognacDetail?.notes
    ?? spirit.otherDetail?.notes
  )?.trim()

  // 에디션(자식 variant)은 자체 이미지가 없고 이미지는 마스터(부모)에만 저장된다.
  // 표시용 갤러리 이미지는 본인 것을 우선하되, 없으면 마스터 이미지로 폴백한다.
  const galleryImages = (spirit.images && spirit.images.length > 0)
    ? spirit.images
    : spirit.sourceImageUrl
      ? [{ id: -1, imageUrl: spirit.sourceImageUrl, isPrimary: true, sortOrder: 0 }]
      : []

  const canonicalUrl = isEn
    ? (spiritSeo?.canonicalUrlEn ?? buildCanonical(`/en/spirits/${spirit.id}`))
    : (spiritSeo?.canonicalUrlKo ?? buildCanonical(`/ko/spirits/${spirit.id}`))
  const rawImage = spiritSeo?.primaryImageUrl || spirit.primaryImageUrl || galleryImages[0]?.imageUrl
  const heroImage = rawImage
    ? (rawImage.startsWith('http') ? rawImage : `${SITE_URL}${rawImage}`)
    : DEFAULT_OG_IMAGE

  // 개별 리뷰 (rich snippet 신뢰도 향상) — 최대 5건
  const reviewSchemas = (reviewsPage?.content ?? []).slice(0, 5).map((r) =>
    buildReviewSchema({
      authorName: r.nickname,
      ratingValue: r.totalScore,
      bestRating: 100,
      worstRating: 0,
      datePublished: r.createdAt,
      reviewBody: r.comment ?? r.tasteNote ?? r.noseNote ?? r.finishNote,
    }),
  )

  const langPrefix = isEn ? '/en' : '/ko'
  const hasProductSnippetData = (spirit.avgScore != null && spirit.reviewCount > 0) || reviewSchemas.length > 0

  const spiritJsonLd = hasProductSnippetData ? {
    '@type': 'Product',
    name: primaryName,
    alternateName: secondaryName || undefined,
    description: isEn
      ? `${primaryName} — ${primaryProducer || ''} ${countryLabel ? `· ${countryLabel}` : ''} · Liquor specifications, tasting notes & user reviews on CaskByCask.`
      : `${primaryName} — ${primaryProducer || ''} ${countryLabel ? `· ${countryLabel}` : ''} · 원산지, 도수 등 상세 주류 정보와 테이스팅 노트 및 사용자 리뷰.`,
    url: canonicalUrl,
    image: heroImage,
    brand: primaryProducer ? {
      '@type': 'Brand',
      name: primaryProducer,
      ...(secondaryProducer ? { alternateName: secondaryProducer } : {}),
    } : undefined,
    manufacturer: primaryProducer ? {
      '@type': 'Organization',
      name: primaryProducer,
      ...(secondaryProducer ? { alternateName: secondaryProducer } : {}),
      address: spirit.country ? {
        '@type': 'PostalAddress',
        addressCountry: spirit.country,
      } : undefined,
    } : undefined,
    countryOfOrigin: countryLabel || undefined,
    category: spirit.category,
    aggregateRating: (spirit.avgScore != null && spirit.reviewCount > 0) ? {
      '@type': 'AggregateRating',
      ratingValue: spirit.avgScore,
      reviewCount: spirit.reviewCount,
      bestRating: 100,
      worstRating: 0,
    } : undefined,
    ...(reviewSchemas.length > 0 ? { review: reviewSchemas } : {}),
  } : {
    '@type': 'WebPage',
    name: primaryName,
    alternateName: secondaryName || undefined,
    description: isEn
      ? `${primaryName} specs, tasting notes, and detailed liquor information on CaskByCask.`
      : `${primaryName} 상세 주류 정보와 시음 노트를 CaskByCask에서 확인하세요.`,
    url: canonicalUrl,
    image: heroImage,
    about: {
      '@type': 'Thing',
      name: primaryName,
      alternateName: secondaryName || undefined,
      additionalType: spirit.category || undefined,
    },
  }

  // BreadcrumbList — 홈 / 카탈로그 / 카테고리 / 현재 spirit
  const breadcrumbJsonLd = buildBreadcrumbSchema([
    { name: isEn ? 'Home' : '홈', path: langPrefix },
    { name: isEn ? 'Spirits' : '주류 카탈로그', path: `${langPrefix}/spirits` },
    { name: t(`spirit.category.${spirit.category}`), path: `${langPrefix}/spirits?category=${spirit.category}` },
    { name: primaryName ?? '', path: canonicalUrl },
  ])
  const seoTitle = isEn ? spiritSeo?.titleEn : spiritSeo?.titleKo
  const seoDescription = isEn ? spiritSeo?.descriptionEn : spiritSeo?.descriptionKo

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <SeoMeta
        title={seoTitle ?? primaryName}
        description={seoDescription ?? (isEn
          ? `${primaryName} specs, tasting notes, ratings and reviews. ${primaryProducer || ''} ${countryLabel || ''}`.trim()
          : `${primaryName} 상세 주류 정보, 테이스팅 노트 및 평점 리뷰. ${primaryProducer || ''} ${countryLabel || ''}`.trim())}
        canonical={canonicalUrl}
        ogType="product"
        ogImage={heroImage}
        ogImageAlt={primaryName}
        locale={isEn ? 'en_US' : 'ko_KR'}
        alternateKo={spiritSeo?.canonicalUrlKo}
        alternateEn={spiritSeo?.canonicalUrlEn}
        alternateDefault={spiritSeo?.canonicalUrlKo}
        jsonLd={[spiritJsonLd, breadcrumbJsonLd]}
      />

      {/* Back */}
      <div className={hasVariants ? 'lg:flex lg:items-start lg:gap-6' : ''}>
      <div className="flex-1 min-w-0">
      {/* Header card */}
      <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(17,24,39,0.12)] ring-1 ring-neutral-100 mb-6 overflow-hidden">
        <div className="md:flex">
          {/* Gallery */}
          <div className="md:w-80 flex-shrink-0 p-5 md:border-r border-neutral-100 relative">
            <Gallery
              images={galleryImages}
              nameKo={primaryName}
              selectedIdx={selectedImg}
              onSelect={setSelectedImg}
              onImageClick={setLightboxIdx}
            />
            {spirit.sourceProvider === 'VIVINO' && spirit.sourceRating != null && (
              <a
                href={spirit.sourceUrl || undefined}
                target={spirit.sourceUrl ? '_blank' : undefined}
                rel={spirit.sourceUrl ? 'noopener noreferrer nofollow' : undefined}
                onClick={(event) => {
                  if (!spirit.sourceUrl) event.preventDefault()
                  event.stopPropagation()
                }}
                className="absolute bottom-7 right-7 rounded-xl bg-[#8b1d41]/95 px-3 py-2 text-white shadow-lg ring-1 ring-white/40"
                aria-label={`VIVINO ${spirit.sourceRating.toFixed(1)}`}
              >
                <span className="block text-[10px] font-black tracking-[0.14em] leading-none">
                  VIVINO{spirit.sourceUrl?.includes('/fixture-') ? ' · SAMPLE' : ''}
                </span>
                <span className="mt-1 block text-lg font-black leading-none">
                  {spirit.sourceRating.toFixed(1)}
                  {spirit.sourceRatingCount != null && (
                    <span className="ml-1 text-[10px] font-medium opacity-80">({spirit.sourceRatingCount.toLocaleString()})</span>
                  )}
                </span>
              </a>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-5 md:p-6 flex flex-col gap-4 min-w-0 relative">
            {/* Favorites button — top right */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <WishlistButtons spiritId={spiritId} onNeedLogin={() => setLoginModal(true)} />
              <ShareUrlButton />
            </div>

            <div className="pr-24">
              <Badge variant={spirit.category} size="sm" className="mb-2">
                {t(`spirit.category.${spirit.category}`)}
              </Badge>
              <h1 className="text-[26px] md:text-[30px] font-bold text-neutral-900 leading-tight tracking-tight">
                {primaryName}
              </h1>
              {secondaryName && (
                <p className="text-[15px] text-neutral-400 mt-1">{secondaryName}</p>
              )}
              {(primaryProducer || brandName) && (
                <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 20h20M4 20V8l6 4V8l6 4V8l4 3v9" />
                  </svg>
                  {spirit.producerId ? (
                    <Link to={`/producers/${spirit.producerId}`}
                      className="text-neutral-500 hover:text-primary-800 hover:underline transition-colors">
                      {brandName
                        ? (primaryProducer
                          ? `${brandName} (${primaryProducer}${secondaryProducer ? ` · ${secondaryProducer}` : ''})`
                          : brandName)
                        : `${primaryProducer}${secondaryProducer ? ` · ${secondaryProducer}` : ''}`}
                    </Link>
                  ) : (
                    <span>
                      {brandName
                        ? (primaryProducer
                          ? `${brandName} (${primaryProducer}${secondaryProducer ? ` · ${secondaryProducer}` : ''})`
                          : brandName)
                        : `${primaryProducer}${secondaryProducer ? ` · ${secondaryProducer}` : ''}`}
                    </span>
                  )}
                  {primaryProducer && (
                    <span className="inline-flex items-center text-[11px] font-medium text-amber-700
                      bg-amber-50 border border-amber-100 rounded-full px-1.5 py-0.5">
                      {isEn
                        ? PRODUCER_TYPE_LABEL[CATEGORY_TO_PRODUCER_TYPE[spirit.category]].en
                        : PRODUCER_TYPE_LABEL[CATEGORY_TO_PRODUCER_TYPE[spirit.category]].ko}
                    </span>
                  )}
                </p>
              )}
            </div>

            <StarScore score={spirit.avgScore} reviewCount={spirit.reviewCount} size="lg" showBar />

            {/* 배치/병입 페이지 이동 셀렉터 */}
            {isVariantSplitGroup && groupOptions.length > 0 && (
              <div className="flex items-center justify-between bg-neutral-50/50 border border-neutral-200/50 rounded-2xl px-3.5 py-2.5 -mb-1">
                <span className="text-xs font-bold text-neutral-500 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {t(spirit.category === 'WINE' ? 'spirit.detail.vintagePageSelect' : 'spirit.detail.variantPageSelect')}
                </span>
                <select
                  value={spirit.id}
                  onChange={(e) => {
                    const targetId = Number(e.target.value)
                    const targetPath = localizedSeoPath(variantSeoById.get(targetId), isEn)
                    navigate(targetPath ?? `/spirits/${targetId}`)
                  }}
                  className="text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer min-w-[200px] shadow-sm hover:border-neutral-300 transition-colors"
                >
                  {groupOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 카테고리별 서술형 추가 정보 — 별도 제목 없이 기존 핵심 스펙 위치를 사용한다 */}
            {headerAdditionalInfo && (
              <p className="border-t border-neutral-200 pt-4 text-[14px] text-neutral-700 whitespace-pre-wrap leading-relaxed">
                {headerAdditionalInfo}
              </p>
            )}

          </div>
        </div>
      </div>



      {/* 카테고리 상세 정보 + Tabs */}
      <div className="space-y-6">
        <SpiritDetailSections
          spirit={spirit}
          isEn={isEn}
          parentWhiskyDetail={parentSpirit?.whiskyDetail}
        />

        {/* Tabs */}
        <div className="space-y-5">
        <TabBar active={activeTab} onChange={setActiveTab} />
        
        {activeTab === 'reviews' && (
          <VariantSelector
            variants={variantsList}
            selectedValue={reviewVariantFilterId}
            onChange={setReviewVariantFilterId}
          />
        )}

        {activeTab === 'price' && (
          <VariantSelector
            variants={variantsList}
            selectedValue={priceVariantId}
            onChange={setPriceVariantId}
          />
        )}

        <div role="tabpanel">
          {activeTab === 'reviews' ? (
            <ReviewList
              spiritId={reviewVariantFilterId ?? masterSpiritId}
              writeSpiritId={spirit.id}
              reviewVariantLabels={reviewVariantLabelMap}
              onNeedLogin={() => setLoginModal(true)}
            />
          ) : activeTab === 'community' ? (
            <CommentList spiritId={spiritId} onNeedLogin={() => setLoginModal(true)} />
          ) : (
            <PriceTabContent
              spiritId={spiritId}
              selectedVariantId={priceVariantId}
              variants={variantsList}
            />
          )}
        </div>
        </div>
      </div>
      </div>


      </div>

      <ImageLightbox
        images={galleryImages.map((img) => img.imageUrl)}
        initialIndex={lightboxIdx >= 0 ? lightboxIdx : 0}
        open={lightboxIdx >= 0}
        onClose={() => setLightboxIdx(-1)}
      />

      {/* Login modal */}
      <Modal
        open={loginModal}
        onClose={() => setLoginModal(false)}
        title={t('auth.loginRequired')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setLoginModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={() => { setLoginModal(false); requireLogin() }}>
              {t('auth.goToLogin')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
          {t('auth.loginRequiredDesc')}
        </p>
      </Modal>
    </div>
  )
}
