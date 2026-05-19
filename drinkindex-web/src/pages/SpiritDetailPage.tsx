import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSpiritDetail } from '@/domain/spirit/hooks/useSpiritDetail'
import { localizeCountry } from '@/shared/utils/countryName'
import { localizeRegion } from '@/shared/utils/regionName'
import Badge from '@/shared/components/Badge'
import StarScore from '@/shared/components/StarScore'
import Spinner from '@/shared/components/Spinner'
import Modal from '@/shared/components/Modal'
import Button from '@/shared/components/Button'
import ImageLightbox from '@/shared/components/ImageLightbox'
import ReviewList from '@/domain/review/components/ReviewList'
import CommentList from '@/domain/comment/components/CommentList'
import WishlistButtons from '@/domain/wishlist/components/WishlistButtons'
import type { SpiritDetail, SpiritImage } from '@/domain/spirit/types/spirit.types'

type Tab = 'reviews' | 'community'

// ── 카테고리 상세 섹션 ─────────────────────────────────────

function Badge2({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium mr-1 mb-1">
      {children}
    </span>
  )
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">{children}</dl>
}

function DI({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <dt className="text-xs text-neutral-400 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-neutral-900">{value}</dd>
    </div>
  )
}

function SpiritDetailSections({ spirit, isEn }: { spirit: SpiritDetail; isEn: boolean }) {
  const cd = spirit.commonDetail
  const whisky = spirit.whiskyDetail
  const wine = spirit.wineDetail
  const cognac = spirit.cognacDetail

  const hasAny = cd || whisky || wine || cognac
  if (!hasAny) return null

  const WHISKY_STYLE_LABEL: Record<string, string> = {
    SINGLE_MALT: isEn ? 'Single Malt' : '싱글 몰트',
    BLENDED_MALT: isEn ? 'Blended Malt' : '블렌디드 몰트',
    BLENDED_WHISKY: isEn ? 'Blended Whisky' : '블렌디드 위스키',
    BOURBON: 'Bourbon', RYE: 'Rye', CORN: 'Corn', GRAIN: 'Grain', POT_STILL: 'Pot Still',
  }
  const CASK_LABEL: Record<string, string> = {
    EX_BOURBON: 'Ex-Bourbon', EX_SHERRY: 'Ex-Sherry', EX_PORT: 'Ex-Port',
    EX_WINE: 'Ex-Wine', NEW_OAK: 'New Oak', EX_RUM: 'Ex-Rum', EX_MADEIRA: 'Ex-Madeira',
    EX_SAUTERNES: 'Ex-Sauternes', EX_COGNAC: 'Ex-Cognac', MIZUNARA: 'Mizunara', OTHER: isEn ? 'Other' : '기타',
  }
  const GRADE_LABEL: Record<string, string> = {
    VS: 'VS', NAPOLEON: 'Napoléon', VSOP: 'VSOP', XO: 'XO', XXO: 'XXO', HORS_DAGE: "Hors d'Age",
  }
  const CRU_LABEL: Record<string, string> = {
    GRANDE_CHAMPAGNE: 'Grande Champagne', PETITE_CHAMPAGNE: 'Petite Champagne',
    BORDERIES: 'Borderies', FINS_BOIS: 'Fins Bois', BONS_BOIS: 'Bons Bois',
  }
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
      <h2 className="text-base font-bold text-neutral-900 border-b border-neutral-100 pb-3">
        {isEn ? 'Detailed Information' : '상세 정보'}
      </h2>

      {/* 공통 상세 */}
      {cd && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            {isEn ? 'Common' : '공통'}
          </h3>
          <DetailGrid>
            <DI label={isEn ? 'Age Statement' : '숙성 연수'}
              value={cd.isNas
                ? <span className="px-2 py-0.5 rounded bg-neutral-800 text-white text-xs font-bold">NAS</span>
                : (cd.ageStatement != null ? `${cd.ageStatement}년` : null)} />
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
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Whisky</h3>
          <DetailGrid>
            <DI label={isEn ? 'Style' : '스타일'}
              value={whisky.style ? WHISKY_STYLE_LABEL[whisky.style] ?? whisky.style : null} />
            <DI label={isEn ? 'Bottling' : '병입'} value={whisky.bottlingType} />
            <DI label={isEn ? 'Cask' : '캐스크'}
              value={whisky.caskType ? CASK_LABEL[whisky.caskType] ?? whisky.caskType : null} />
            <DI label={isEn ? 'Maturation' : '숙성 방식'}
              value={whisky.maturationStyle === 'FINISH'
                ? (isEn ? 'Finish' : '피니시')
                : whisky.maturationStyle === 'FULL_MATURATION'
                ? (isEn ? 'Full Maturation' : '풀 머추레이션')
                : null} />
            {whisky.finishCaskType && (
              <DI label={isEn ? 'Finish Cask' : '피니시 캐스크'}
                value={CASK_LABEL[whisky.finishCaskType] ?? whisky.finishCaskType} />
            )}
            <DI label={isEn ? 'Phenol (ppm)' : '피트 강도'}
              value={whisky.phenolPpm != null ? `${whisky.phenolPpm} ppm` : null} />
            <DI label={isEn ? 'Cask No.' : '캐스크 번호'} value={whisky.caskNo} />
          </DetailGrid>
          <div className="flex flex-wrap gap-1 mt-2">
            {whisky.isNonChillFiltered && <Badge2>NCF</Badge2>}
            {whisky.isNaturalColour && <Badge2>{isEn ? 'Natural Colour' : '천연 색상'}</Badge2>}
            {whisky.isSingleCask && <Badge2>Single Cask</Badge2>}
            {whisky.isCaskStrength && <Badge2>Cask Strength</Badge2>}
            {whisky.isPeated && <Badge2>Peated</Badge2>}
          </div>
        </div>
      )}

      {/* 와인 상세 */}
      {wine && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Wine</h3>
          <DetailGrid>
            <DI label={isEn ? 'Type' : '종류'} value={wine.wineType} />
            <DI label={isEn ? 'Vintage' : '빈티지'} value={wine.vintage} />
            <DI label={isEn ? 'Appellation' : '원산지'} value={wine.appellationDesignation} />
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
            <div>
              <p className="text-xs text-neutral-400 mb-1.5">{isEn ? 'Grape Varieties' : '포도 품종'}</p>
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
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cognac</h3>
          <div className="flex items-center gap-4">
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
            {cognac.isFineChampagne && <Badge2>Fine Champagne</Badge2>}
          </div>
          {cognac.blendDetail && (
            <p className="text-sm text-neutral-600 leading-relaxed">{cognac.blendDetail}</p>
          )}
        </div>
      )}

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-neutral-900">{value}</dd>
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
        className={`aspect-square rounded-xl overflow-hidden bg-neutral-100 relative group ${
          current ? 'cursor-zoom-in' : ''
        }`}
      >
        {current ? (
          <>
            <img key={current.id} src={current.imageUrl} alt={nameKo}
              className="w-full h-full object-cover" loading="eager" />
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
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🥃</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-hidden pb-1">
          {images.map((img, i) => (
            <button key={img.id} onClick={() => onSelect(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                i === selectedIdx ? 'border-primary-500' : 'border-transparent hover:border-neutral-300'
              }`}>
              <img src={img.imageUrl} alt={`${nameKo} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const { t } = useTranslation()
  const tabs: { id: Tab; label: string }[] = [
    { id: 'reviews',   label: t('review.tab') },
    { id: 'community', label: t('comment.tab') },
  ]
  return (
    <div role="tablist" className="flex border-b border-neutral-200 gap-6">
      {tabs.map(({ id, label }) => (
        <button key={id} role="tab" aria-selected={active === id} onClick={() => onChange(id)}
          className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === id
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}>
          {label}
        </button>
      ))}
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

  if (isLoading) return <Spinner fullscreen />

  if (!spirit) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-500 mb-4">{t('spirit.detail.notFound')}</p>
        <button onClick={() => navigate('/spirits')}
          className="text-primary-600 hover:underline text-sm">
          ← {t('spirit.detail.backToList')}
        </button>
      </div>
    )
  }

  const primaryName   = isEn ? (spirit.nameEn || spirit.nameKo) : spirit.nameKo
  const secondaryName = isEn ? spirit.nameKo : spirit.nameEn
  const primaryDistillery   = isEn ? (spirit.distilleryNameEn || spirit.distilleryNameKo) : spirit.distilleryNameKo
  const secondaryDistillery = isEn ? spirit.distilleryNameKo : spirit.distilleryNameEn
  const countryLabel = localizeCountry(spirit.country, i18n.language)
  const regionLabel  = localizeRegion(spirit.region, i18n.language)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-neutral-400 hover:text-primary-600 mb-5 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        {t('common.back')}
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
        <div className="md:flex">
          {/* Gallery */}
          <div className="md:w-72 flex-shrink-0 p-4 md:border-r border-neutral-100">
            <Gallery
              images={spirit.images}
              nameKo={primaryName}
              selectedIdx={selectedImg}
              onSelect={setSelectedImg}
              onImageClick={setLightboxIdx}
            />
          </div>

          {/* Info */}
          <div className="flex-1 p-6 flex flex-col gap-5 min-w-0 relative">
            {/* Favorites button — top right */}
            <div className="absolute top-4 right-4">
              <WishlistButtons spiritId={spiritId} onNeedLogin={() => setLoginModal(true)} />
            </div>

            <div className="pr-12">
              <Badge variant={spirit.category} size="sm" className="mb-2">
                {t(`spirit.category.${spirit.category}`)}
              </Badge>
              <h1 className="text-2xl font-bold text-neutral-900 leading-tight">
                {primaryName}
              </h1>
              <p className="text-sm text-neutral-500 mt-0.5">{secondaryName}</p>
              {primaryDistillery && (
                <p className="text-sm text-neutral-400 mt-1">
                  {primaryDistillery}
                  {secondaryDistillery ? ` · ${secondaryDistillery}` : ''}
                </p>
              )}
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              {spirit.country     && <InfoRow label={t('spirit.detail.country')}     value={countryLabel} />}
              {spirit.abv != null  && <InfoRow label={t('spirit.detail.abv')}         value={`${spirit.abv}%`} />}
              {spirit.volumeMl    && <InfoRow label={t('spirit.detail.volume')}       value={`${spirit.volumeMl}ml`} />}
              {spirit.region      && <InfoRow label={t('spirit.detail.region')}       value={regionLabel} />}
              {spirit.bottler     && <InfoRow label={t('spirit.detail.bottler')}      value={spirit.bottler} />}
              {spirit.bottledYear && <InfoRow label={t('spirit.detail.bottledYear')}  value={spirit.bottledYear} />}
              {spirit.vintageYear && <InfoRow label={t('spirit.detail.vintageYear')}  value={spirit.vintageYear} />}
            </dl>

            <StarScore score={spirit.avgScore} reviewCount={spirit.reviewCount} size="lg" showBar />
          </div>
        </div>
      </div>

      {/* 카테고리 상세 정보 + Tabs */}
      <div className="space-y-6">
        <SpiritDetailSections spirit={spirit} isEn={isEn} />

        {/* Tabs */}
        <div className="space-y-5">
        <TabBar active={activeTab} onChange={setActiveTab} />
        <div role="tabpanel">
          {activeTab === 'reviews' ? (
            <ReviewList spiritId={spiritId} onNeedLogin={() => setLoginModal(true)} />
          ) : (
            <CommentList spiritId={spiritId} onNeedLogin={() => setLoginModal(true)} />
          )}
        </div>
        </div>
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
