import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSpiritDetail, useSpiritVariants } from '@/domain/spirit/hooks/useSpiritDetail'
import { localizeCountry } from '@/shared/utils/countryName'
import { localizeRegion } from '@/shared/utils/regionName'
import Badge from '@/shared/components/Badge'
import StarScore from '@/shared/components/StarScore'
import Spinner from '@/shared/components/Spinner'
import Modal from '@/shared/components/Modal'
import Button from '@/shared/components/Button'
import ImageLightbox from '@/shared/components/ImageLightbox'
import ReviewList from '@/domain/review/components/ReviewList'
import { useReviews } from '@/domain/review/hooks/useReviews'
import { buildBreadcrumbSchema, buildReviewSchema } from '@/shared/utils/seoSchema'
import CommentList from '@/domain/comment/components/CommentList'
import WishlistButtons from '@/domain/wishlist/components/WishlistButtons'
import SeoMeta, { buildCanonical, SITE_URL } from '@/shared/components/SeoMeta'
import { DEFAULT_OG_IMAGE } from '@/shared/config/site'
import type { SpiritDetail, SpiritImage, SpiritVariant } from '@/domain/spirit/types/spirit.types'
import PriceRangeChart from '@/domain/pricetracker/components/PriceRangeChart'
import StoreDetailPanel from '@/domain/pricetracker/components/StoreDetailPanel'
import PriceAlertInline from '@/domain/pricetracker/components/PriceAlertInline'
import PriceAlertBanner from '@/domain/pricetracker/components/PriceAlertBanner'
import { usePriceChart, usePriceChartDetail } from '@/domain/pricetracker/hooks/usePriceChart'
import { useState as useStateForPrice } from 'react'
import type { StoreType } from '@/domain/pricetracker/types/pricetracker.types'
import { CATEGORY_TO_PRODUCER_TYPE, PRODUCER_TYPE_LABEL } from '@/domain/producer/types/producer.types'

type Tab = 'reviews' | 'community' | 'price'

// ── 카테고리 상세 섹션 ─────────────────────────────────────

function Badge2({ children, detail }: { children: React.ReactNode; detail?: string }) {
  const [open, setOpen] = useState(false)
  if (!detail) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium mr-1 mb-1">
        {children}
      </span>
    )
  }
  return (
    <span className="group relative inline-block mr-1 mb-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className="px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50/60 text-amber-700 text-xs font-medium
          hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-help"
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

function DetailGrid({ children }: { children: React.ReactNode }) {
  // 세로 리스트형: 라벨 좌 · 값 우. 데스크톱은 2열로 나눠 스크롤 길이 절감.
  return <dl className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-12">{children}</dl>
}

function DI({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-neutral-100">
      <dt className="text-[13px] text-neutral-400 flex-shrink-0">{label}</dt>
      <dd className="text-[14px] font-semibold text-neutral-900 text-right">{value}</dd>
    </div>
  )
}

// 멀티값 필드(캐스크 등): 콤마 문자열 대신 개별 칩으로 표시 → 이름 중간 줄바꿈 방지
function DIChips({ label, items }: { label: string; items: { text: string; accent?: boolean }[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-neutral-100">
      <dt className="text-[13px] text-neutral-400 flex-shrink-0 pt-1">{label}</dt>
      <dd className="flex flex-wrap justify-end gap-1.5">
        {items.map((it, i) => (
          <span
            key={i}
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12.5px] font-medium break-keep ${
              it.accent
                ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {it.text}
          </span>
        ))}
      </dd>
    </div>
  )
}

function SpiritDetailSections({ spirit, isEn }: { spirit: SpiritDetail; isEn: boolean }) {
  const { t } = useTranslation()
  const cd = spirit.commonDetail
  const whisky = spirit.whiskyDetail
  const wine = spirit.wineDetail
  const cognac = spirit.cognacDetail
  const other = spirit.otherDetail

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
  const GRADE_LABEL: Record<string, string> = {
    VS: 'VS', NAPOLEON: 'Napoléon', VSOP: 'VSOP', XO: 'XO', XXO: 'XXO', HORS_DAGE: "Hors d'Age",
  }
  const CRU_LABEL: Record<string, string> = {
    GRANDE_CHAMPAGNE: 'Grande Champagne', PETITE_CHAMPAGNE: 'Petite Champagne',
    BORDERIES: 'Borderies', FINS_BOIS: 'Fins Bois', BONS_BOIS: 'Bons Bois',
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

      <div className="space-y-8">
        {/* 공통 상세 */}
        {cd && (
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
              {isEn ? 'Common' : '공통'}
            </p>
            <DetailGrid>
              <DI label={isEn ? 'Age Statement' : '숙성 연수'}
                value={cd.isNas
                  ? <span className="px-2 py-0.5 rounded bg-neutral-800 text-white text-xs font-bold">NAS</span>
                  : (cd.ageStatement != null
                    ? (isEn ? `${cd.ageStatement} Year${cd.ageStatement === 1 ? '' : 's'}` : `${cd.ageStatement}년`)
                    : null)} />
              <DI label={isEn ? 'Distilled' : '증류 연월'} value={cd.distilledDate} />
              <DI label={isEn ? 'Bottled' : '병입 연월'} value={cd.bottledDate} />
              <DI label={isEn ? 'Release Date' : '출시일'} value={cd.releaseDate} />
              <DI label={isEn ? 'Volume' : '용량'} value={cd.volumeMl ? `${cd.volumeMl}ml` : null} />
              <DI label={isEn ? 'ABV' : '도수'} value={cd.abv != null ? `${cd.abv}%` : null} />
              <DI label={isEn ? 'Bottle No.' : '병 번호'} value={cd.bottleNo} />
              <DI label={isEn ? 'Batch No.' : '배치 번호'} value={cd.batchNo} />
              <DI label={isEn ? 'Total Bottles' : '총 병 수'}
                value={cd.totalBottles != null ? cd.totalBottles.toLocaleString() : null} />
            </DetailGrid>
          </div>
        )}

        {/* 위스키 상세 */}
        {whisky && (
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Whisky</p>
            <DetailGrid>
              <DI label={isEn ? 'Style' : '스타일'}
                value={whisky.style === 'OTHER'
                  ? (whisky.styleOther || WHISKY_STYLE_LABEL.OTHER || whisky.style)
                  : whisky.style ? WHISKY_STYLE_LABEL[whisky.style] ?? whisky.style : null} />
              <DI label={isEn ? 'Bottling' : '병입'}
                value={whisky.bottlingType ? BOTTLING_LABEL[whisky.bottlingType] ?? whisky.bottlingType : null} />
              <DIChips label={isEn ? 'Cask' : '캐스크'}
                items={(whisky.caskTypes ?? []).map((c) => {
                  const base = c === 'OTHER' ? (whisky.caskTypeOther || caskLabel('OTHER')) : caskLabel(c)
                  // 피니시(추가 숙성) 캐스크는 색으로 구분 + 끝에 표시
                  const isFinish = whisky.caskFinishes?.includes(c) ?? false
                  return { text: isFinish ? `${base} ${isEn ? '(Finish)' : '(피니시)'}` : base, accent: isFinish }
                })} />
              <DI label={isEn ? 'Phenol (ppm)' : '피트 강도'}
                value={whisky.phenolPpm != null ? `${whisky.phenolPpm} ppm` : null} />
              <DI label={isEn ? 'Single Cask No.' : '싱글 캐스크 번호'} value={whisky.caskNo} />
            </DetailGrid>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {whisky.isNonChillFiltered && (
                <Badge2 detail="Non-Chill Filtered (저온 여과 생략)">NCF</Badge2>
              )}
              {whisky.isNaturalColour && (
                <Badge2 detail="Natural Colour (캐러멜 색소 무첨가)">Natural Colour</Badge2>
              )}
              {whisky.isSingleCask && (
                <Badge2 detail="Single Cask (단일 캐스크)">Single Cask</Badge2>
              )}
              {whisky.isCaskStrength && (
                <Badge2 detail="Cask Strength (원액 그대로)">Cask Strength</Badge2>
              )}
              {whisky.isPeated && (
                <Badge2 detail="Peated (피트 사용)">Peated</Badge2>
              )}
            </div>
            {whisky.notes && (
              <div className="mt-4">
                <p className="text-[13px] text-neutral-400 mb-1">{isEn ? 'Notes' : '기타 정보'}</p>
                <p className="text-[14px] text-neutral-800 whitespace-pre-wrap leading-relaxed">{whisky.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* 와인 상세 */}
        {wine && (
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Wine</p>
            <DetailGrid>
              <DI label={isEn ? 'Type' : '종류'} value={wine.wineType} />
              <DI label={isEn ? 'Vintage' : '빈티지'} value={wine.vintage} />
              <DI label={isEn ? 'Appellation' : '원산지 명칭'} value={wine.appellationDesignation} />
              <DI label={isEn ? 'Soil' : '토양'} value={wine.soilType} />
              <DI label={isEn ? 'Altitude' : '고도'} value={wine.altitudeM != null ? `${wine.altitudeM}m` : null} />
              <DI label={isEn ? 'Harvest' : '수확 방법'} value={wine.harvestMethod} />
              <DI label={isEn ? 'Fermentation' : '발효 용기'} value={wine.fermentationVessel} />
              <DI label={isEn ? 'Certification' : '인증'} value={wine.certification !== 'NONE' ? wine.certification : null} />
              <DI label={isEn ? 'Oak Aged' : '오크 숙성'}
                value={wine.isOakAged != null ? (wine.isOakAged ? (isEn ? 'Yes' : '예') : (isEn ? 'No' : '아니요')) : null} />
              {wine.oakType && <DI label={isEn ? 'Oak' : '오크'} value={wine.oakType} />}
              {wine.oakAgedMonths && (
                <DI label={isEn ? 'Oak Months' : '오크 숙성'} value={`${wine.oakAgedMonths}${isEn ? ' mo.' : '개월'}`} />
              )}
              <DI label={isEn ? 'Natural Wine' : '내추럴 와인'}
                value={wine.isNaturalWine ? (isEn ? 'Yes' : '예') : null} />
            </DetailGrid>
            {wine.grapeVarieties && wine.grapeVarieties.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] text-neutral-400 mb-1.5">{isEn ? 'Grape Varieties' : '포도 품종'}</p>
                <div className="flex flex-wrap">
                  {wine.grapeVarieties.map((g, i) => (
                    <Badge2 key={i}>{g.name}{g.percentage ? ` ${g.percentage}%` : ''}</Badge2>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 꼬냑 상세 */}
        {cognac && (
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Cognac</p>
            <div className="flex items-center gap-4 flex-wrap">
              {cognac.grade && (
                <span className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-lg font-bold">
                  {GRADE_LABEL[cognac.grade] ?? cognac.grade}
                </span>
              )}
              {cognac.cru && (
                <div>
                  <p className="text-xs text-neutral-400">{isEn ? 'Cru' : '크뤼'}</p>
                  <p className="text-sm font-medium text-neutral-900">{CRU_LABEL[cognac.cru] ?? cognac.cru}</p>
                </div>
              )}
              {cognac.isFineChampagne && (
                <Badge2 detail="Fine Champagne (Grande + Petite Champagne 블렌드, Grande 50% 이상)">
                  Fine Champagne
                </Badge2>
              )}
            </div>
            {cognac.blendDetail && (
              <p className="text-sm text-neutral-600 leading-relaxed mt-3">{cognac.blendDetail}</p>
            )}
          </div>
        )}

        {/* 기타 상세 */}
        {other && (
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
              {isEn ? 'Other' : '기타'}
            </p>
            <DetailGrid>
              <DI label={isEn ? 'Type' : '주종'}
                value={other.otherType ? OTHER_TYPE_LABEL[other.otherType] ?? other.otherType : null} />
              <DI label={isEn ? 'Main Ingredient' : '주원료'} value={other.mainIngredient} />
              <DI label={isEn ? 'Production' : '제조 방식'} value={other.productionMethod} />
            </DetailGrid>
            {other.notes && (
              <p className="text-sm text-neutral-600 leading-relaxed mt-3">{other.notes}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────

// ── 핵심 스펙 strip (도수·용량·국가/지역·숙성연수) ──────────────
const SPEC_ICON = {
  abv: (
    <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round">
      <circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" />
      <line x1="18.5" y1="5.5" x2="5.5" y2="18.5" />
    </svg>
  ),
  volume: (
    <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.7l5.2 5.7a7.4 7.4 0 11-10.4 0z" />
    </svg>
  ),
  origin: (
    <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21.5S5 16 5 10.2A7 7 0 0119 10.2C19 16 12 21.5 12 21.5z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
  age: (
    <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.2" /><path d="M12 7.5V12l3 2" />
    </svg>
  ),
}

function SpecCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-neutral-50 ring-1 ring-neutral-100 px-3 py-2.5">
      <div className="w-7 h-7 rounded-lg bg-white ring-1 ring-neutral-200 flex items-center justify-center
        text-primary-600 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-neutral-400 leading-none">{label}</p>
        <p className="text-[13px] sm:text-[14px] font-bold text-neutral-900 mt-1 leading-snug break-keep">{value}</p>
      </div>
    </div>
  )
}

function CoreSpecStrip({
  spirit, countryLabel, regionLabel, isEn,
}: {
  spirit: SpiritDetail
  countryLabel: string
  regionLabel: string
  isEn: boolean
}) {
  const { t } = useTranslation()
  const cd = spirit.commonDetail
  const ageValue = cd?.isNas
    ? 'NAS'
    : (cd?.ageStatement != null ? (isEn ? `${cd.ageStatement}yr` : `${cd.ageStatement}년`) : null)
  const originValue: React.ReactNode = spirit.country
    ? (
      <>
        {countryLabel}
        {regionLabel && (
          <span className="block text-[11px] sm:text-[12px] font-medium text-neutral-500 leading-snug">
            {regionLabel}
          </span>
        )}
      </>
    )
    : null

  const specs = [
    spirit.abv != null ? { k: 'abv',    icon: SPEC_ICON.abv,    label: t('spirit.detail.abv'),    value: `${spirit.abv}%` } : null,
    spirit.volumeMl    ? { k: 'volume', icon: SPEC_ICON.volume, label: t('spirit.detail.volume'), value: `${spirit.volumeMl}ml` } : null,
    originValue        ? { k: 'origin', icon: SPEC_ICON.origin, label: isEn ? 'Origin' : '국가 · 지역', value: originValue } : null,
    ageValue           ? { k: 'age',    icon: SPEC_ICON.age,    label: isEn ? 'Age' : '숙성 연수', value: ageValue } : null,
  ].filter(Boolean) as { k: string; icon: React.ReactNode; label: string; value: React.ReactNode }[]

  if (specs.length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {specs.map((s) => (
        <SpecCard key={s.k} icon={s.icon} label={s.label} value={s.value} />
      ))}
    </div>
  )
}

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

function PriceTabContent({ spiritId }: { spiritId: number }) {
  const { t } = useTranslation()
  const [storeType, setStoreType] = useStateForPrice<StoreType>('DOMESTIC')
  const [period, setPeriod] = useStateForPrice('3M')
  const [selectedDate, setSelectedDate] = useStateForPrice<string | null>(null)
  const { data: chartData, isLoading: chartLoading } = usePriceChart(spiritId, storeType, period)
  const { data: details, isLoading: detailLoading } = usePriceChartDetail(spiritId, selectedDate, storeType)
  return (
    <div className="space-y-4">
      {/* PRICE_ALERT 발동 배너 + 목표가 알림 인라인 */}
      <PriceAlertBanner spiritId={spiritId} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[240px]">
          <PriceAlertInline spiritId={spiritId} />
        </div>
        <Link
          to={`/price-tracker/register?spiritId=${spiritId}`}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-primary-700 text-white text-xs font-medium hover:bg-primary-800 transition-colors"
        >
          + {t('price.registerBtn')}
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-neutral-200 p-4">
          <PriceRangeChart
            data={chartData ?? undefined} isLoading={chartLoading}
            period={period} onPeriodChange={setPeriod}
            storeType={storeType} onStoreTypeChange={setStoreType}
            onPointClick={(date) => setSelectedDate(date)}
            selectedDate={selectedDate}
          />
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

// ── 같은 이름의 다른 배치 · 병입 목록 (PC: 우측 사이드 / 모바일: 헤더 아래) ──
function VariantsPanel({ variants, isEn }: { variants: SpiritVariant[]; isEn: boolean }) {
  const { t } = useTranslation()
  if (variants.length === 0) return null
  return (
    <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(17,24,39,0.12)] ring-1 ring-neutral-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-[15px] font-bold text-neutral-900">{t('spirit.detail.variantsTitle')}</h2>
        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100
          rounded-full px-1.5 py-0.5">
          {variants.length}
        </span>
      </div>
      <p className="text-[11px] text-neutral-400 mb-2">{t('spirit.detail.variantsHint')}</p>
      <ul className="divide-y divide-neutral-100">
        {variants.map((v) => {
          const name = isEn ? (v.nameEn || v.nameKo) : v.nameKo
          const chips = [
            v.batchNo ? `${t('spirit.detail.variantsBatch')} ${v.batchNo}` : null,
            v.bottledDate
              ? `${t('spirit.detail.variantsBottled')} ${v.bottledDate}`
              : (v.bottledYear ? `${t('spirit.detail.variantsBottled')} ${v.bottledYear}` : null),
            v.vintageYear ? `${t('spirit.detail.vintageYear')} ${v.vintageYear}` : null,
            v.abv != null ? `${v.abv}%` : null,
            v.volumeMl ? `${v.volumeMl}ml` : null,
          ].filter(Boolean) as string[]
          return (
            <li key={v.id}>
              <Link to={`/spirits/${v.id}`} className="flex items-center gap-3 py-2.5 group">
                <div className="w-10 h-[52px] rounded-lg overflow-hidden bg-gradient-to-b from-amber-50
                  to-amber-100/50 ring-1 ring-neutral-100 flex-shrink-0 flex items-center justify-center">
                  {v.primaryImageUrl ? (
                    <img src={v.primaryImageUrl} alt={name} loading="lazy" decoding="async"
                      className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <span className="text-lg">🥃</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-neutral-900 truncate
                    group-hover:text-primary-800 transition-colors">
                    {name}
                  </p>
                  {chips.length > 0 && (
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">{chips.join(' · ')}</p>
                  )}
                  <p className="text-[11px] mt-0.5">
                    {v.avgScore != null ? (
                      <>
                        <b className="text-amber-700">{Number(v.avgScore).toFixed(1)}</b>
                        <span className="text-neutral-400">
                          {' '}/ 100 · {t('review.scoreCount', { n: v.reviewCount })}
                        </span>
                      </>
                    ) : (
                      <span className="text-neutral-300">{t('review.noScore')}</span>
                    )}
                  </p>
                </div>
                <svg className="w-4 h-4 text-neutral-300 group-hover:text-primary-800 flex-shrink-0
                  transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,6 15,12 9,18" />
                </svg>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────

export default function SpiritDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const spiritId = Number(id)
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const [selectedImg, setSelectedImg]   = useState(0)
  const [activeTab, setActiveTab]       = useState<Tab>('reviews')
  const [loginModal, setLoginModal]     = useState(false)
  const [lightboxIdx, setLightboxIdx]   = useState(-1)

  const { data: spirit, isLoading } = useSpiritDetail(spiritId)
  // SEO Review 스키마용 — 첫 페이지 (ReviewList 와 동일 queryKey 라 캐시 공유)
  const { data: reviewsPage } = useReviews(spiritId, 0)
  // 같은 이름의 다른 배치·병입 제품 목록
  const { data: variants = [] } = useSpiritVariants(spiritId)
  const hasVariants = variants.length > 0

  // 변형(다른 배치) 간 이동 시 갤러리·탭 상태 초기화
  useEffect(() => {
    setSelectedImg(0)
    setActiveTab('reviews')
    setLightboxIdx(-1)
  }, [spiritId])

  if (isLoading) return <Spinner fullscreen />

  if (!spirit) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-500 mb-4">{t('spirit.detail.notFound')}</p>
        <button onClick={() => navigate('/spirits')}
          className="text-primary-800 hover:underline text-sm">
          ← {t('spirit.detail.backToList')}
        </button>
      </div>
    )
  }

  const primaryName   = isEn ? (spirit.nameEn || spirit.nameKo) : spirit.nameKo
  const secondaryName = isEn ? spirit.nameKo : spirit.nameEn
  const primaryProducer   = isEn ? (spirit.producerNameEn || spirit.producerNameKo) : spirit.producerNameKo
  const secondaryProducer = isEn ? spirit.producerNameKo : spirit.producerNameEn
  const brandName = spirit.whiskyDetail?.brandName || null
  const countryLabel = localizeCountry(spirit.country, i18n.language)
  const regionLabel  = localizeRegion(spirit.region, i18n.language)

  const canonicalUrl = buildCanonical(`/spirits/${spirit.id}`)
  const rawImage = spirit.primaryImageUrl || spirit.images?.[0]?.imageUrl
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

  const productJsonLd = {
    '@type': 'Product',
    name: primaryName,
    alternateName: secondaryName || undefined,
    description: isEn
      ? `${primaryName} — ${primaryProducer || ''} ${countryLabel ? `· ${countryLabel}` : ''} · CaskByCask tasting notes & user reviews.`
      : `${primaryName} — ${primaryProducer || ''} ${countryLabel ? `· ${countryLabel}` : ''} · CaskByCask 테이스팅 노트와 사용자 리뷰.`,
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
  }

  // BreadcrumbList — 홈 / 카탈로그 / 카테고리 / 현재 spirit
  const breadcrumbJsonLd = buildBreadcrumbSchema([
    { name: isEn ? 'Home' : '홈', path: '/' },
    { name: isEn ? 'Spirits' : '주류 카탈로그', path: '/spirits' },
    { name: t(`spirit.category.${spirit.category}`), path: `/spirits?category=${spirit.category}` },
    { name: primaryName ?? '', path: `/spirits/${spirit.id}` },
  ])

  return (
    <div className={`${hasVariants ? 'max-w-6xl' : 'max-w-5xl'} mx-auto px-4 py-6`}>
      <SeoMeta
        title={primaryName}
        description={isEn
          ? `${primaryName} tasting notes, ratings and reviews. ${primaryProducer || ''} ${countryLabel || ''}`.trim()
          : `${primaryName} 테이스팅 노트와 사용자 리뷰. ${primaryProducer || ''} ${countryLabel || ''}`.trim()}
        canonical={canonicalUrl}
        ogType="product"
        ogImage={heroImage}
        ogImageAlt={primaryName}
        locale={isEn ? 'en_US' : 'ko_KR'}
        jsonLd={[productJsonLd, breadcrumbJsonLd]}
      />

      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-neutral-400 hover:text-primary-800 mb-5 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        {t('common.back')}
      </button>

      <div className={hasVariants ? 'lg:flex lg:items-start lg:gap-6' : ''}>
      <div className="flex-1 min-w-0">
      {/* Header card */}
      <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(17,24,39,0.12)] ring-1 ring-neutral-100 mb-6 overflow-hidden">
        <div className="md:flex">
          {/* Gallery */}
          <div className="md:w-80 flex-shrink-0 p-5 md:border-r border-neutral-100">
            <Gallery
              images={spirit.images}
              nameKo={primaryName}
              selectedIdx={selectedImg}
              onSelect={setSelectedImg}
              onImageClick={setLightboxIdx}
            />
          </div>

          {/* Info */}
          <div className="flex-1 p-5 md:p-6 flex flex-col gap-4 min-w-0 relative">
            {/* Favorites button — top right */}
            <div className="absolute top-4 right-4">
              <WishlistButtons spiritId={spiritId} onNeedLogin={() => setLoginModal(true)} />
            </div>

            <div className="pr-12">
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

            {/* 핵심 스펙 — 도수 · 용량 · 국가/지역 · 숙성연수 */}
            <CoreSpecStrip spirit={spirit} countryLabel={countryLabel} regionLabel={regionLabel} isEn={isEn} />

            {/* 보조 메타 — 병입자 · 병입년도 · 빈티지 */}
            {(spirit.bottler || spirit.bottledYear || spirit.vintageYear) && (
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-neutral-400 -mt-1">
                {spirit.bottler && (
                  <span>{t('spirit.detail.bottler')} <b className="text-neutral-600 font-semibold">{spirit.bottler}</b></span>
                )}
                {spirit.bottledYear && (
                  <span>{t('spirit.detail.bottledYear')} <b className="text-neutral-600 font-semibold">{spirit.bottledYear}</b></span>
                )}
                {spirit.vintageYear && (
                  <span>{t('spirit.detail.vintageYear')} <b className="text-neutral-600 font-semibold">{spirit.vintageYear}</b></span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 모바일: 같은 이름의 다른 배치 목록 — 헤더 카드 아래 */}
      {hasVariants && (
        <div className="lg:hidden mb-6">
          <VariantsPanel variants={variants} isEn={isEn} />
        </div>
      )}

      {/* 카테고리 상세 정보 + Tabs */}
      <div className="space-y-6">
        <SpiritDetailSections spirit={spirit} isEn={isEn} />

        {/* Tabs */}
        <div className="space-y-5">
        <TabBar active={activeTab} onChange={setActiveTab} />
        <div role="tabpanel">
          {activeTab === 'reviews' ? (
            <ReviewList spiritId={spiritId} onNeedLogin={() => setLoginModal(true)} />
          ) : activeTab === 'community' ? (
            <CommentList spiritId={spiritId} onNeedLogin={() => setLoginModal(true)} />
          ) : (
            <PriceTabContent spiritId={spiritId} />
          )}
        </div>
        </div>
      </div>
      </div>

      {/* PC: 같은 이름의 다른 배치 목록 — 우측 사이드 */}
      {hasVariants && (
        <aside className="hidden lg:block w-[300px] flex-shrink-0 lg:sticky lg:top-24
          lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <VariantsPanel variants={variants} isEn={isEn} />
        </aside>
      )}
      </div>

      <ImageLightbox
        images={spirit.images.map((img) => img.imageUrl)}
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
            <Button size="sm" onClick={() => { setLoginModal(false); navigate('/login') }}>
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
