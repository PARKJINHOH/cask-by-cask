import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSpiritDetail } from '@/domain/spirit/hooks/useSpiritDetail'
import Badge from '@/shared/components/Badge'
import StarScore from '@/shared/components/StarScore'
import Spinner from '@/shared/components/Spinner'
import Modal from '@/shared/components/Modal'
import Button from '@/shared/components/Button'
import ImageLightbox from '@/shared/components/ImageLightbox'
import ReviewList from '@/domain/review/components/ReviewList'
import CommentList from '@/domain/comment/components/CommentList'
import WishlistButtons from '@/domain/wishlist/components/WishlistButtons'
import type { SpiritImage } from '@/domain/spirit/types/spirit.types'

type Tab = 'reviews' | 'community'

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
  const tabs: { id: Tab; label: string }[] = [
    { id: 'reviews',   label: '리뷰' },
    { id: 'community', label: '커뮤니티' },
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

  const [selectedImg, setSelectedImg]   = useState(0)
  const [activeTab, setActiveTab]       = useState<Tab>('reviews')
  const [loginModal, setLoginModal]     = useState(false)
  const [lightboxIdx, setLightboxIdx]   = useState(-1)

  const { data: spirit, isLoading } = useSpiritDetail(spiritId)

  if (isLoading) return <Spinner fullscreen />

  if (!spirit) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-500 mb-4">술 정보를 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/')}
          className="text-primary-600 hover:underline text-sm">
          ← 목록으로
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-neutral-400 hover:text-primary-600 mb-5 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        뒤로
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
        <div className="md:flex">
          {/* Gallery */}
          <div className="md:w-72 flex-shrink-0 p-4 md:border-r border-neutral-100">
            <Gallery
              images={spirit.images}
              nameKo={spirit.nameKo}
              selectedIdx={selectedImg}
              onSelect={setSelectedImg}
              onImageClick={setLightboxIdx}
            />
          </div>

          {/* Info */}
          <div className="flex-1 p-6 flex flex-col gap-5 min-w-0">
            <div>
              <Badge variant={spirit.category} size="sm" className="mb-2">
                {spirit.category}
              </Badge>
              <h1 className="text-2xl font-bold text-neutral-900 leading-tight">
                {spirit.nameKo}
              </h1>
              <p className="text-sm text-neutral-500 mt-0.5">{spirit.nameEn}</p>
              {spirit.distilleryNameKo && (
                <p className="text-sm text-neutral-400 mt-1">
                  {spirit.distilleryNameKo}
                  {spirit.distilleryNameEn ? ` · ${spirit.distilleryNameEn}` : ''}
                </p>
              )}
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              {spirit.country     && <InfoRow label="원산지"   value={spirit.country} />}
              {spirit.abv != null  && <InfoRow label="도수"     value={`${spirit.abv}%`} />}
              {spirit.volumeMl    && <InfoRow label="용량"     value={`${spirit.volumeMl}ml`} />}
              {spirit.region      && <InfoRow label="지역"     value={spirit.region} />}
              {spirit.bottler     && <InfoRow label="병입자"   value={spirit.bottler} />}
              {spirit.bottledYear && <InfoRow label="병입 연도" value={spirit.bottledYear} />}
              {spirit.vintageYear && <InfoRow label="빈티지"   value={spirit.vintageYear} />}
            </dl>

            <StarScore score={spirit.avgScore} reviewCount={spirit.reviewCount} size="lg" showBar />

            <WishlistButtons spiritId={spiritId} onNeedLogin={() => setLoginModal(true)} />
          </div>
        </div>
      </div>

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
        title="로그인이 필요합니다"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setLoginModal(false)}>취소</Button>
            <Button size="sm" onClick={() => { setLoginModal(false); navigate('/login') }}>
              로그인하기
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600 leading-relaxed">
          이 기능을 사용하려면 로그인이 필요합니다.
          <br />
          로그인 페이지로 이동하시겠습니까?
        </p>
      </Modal>
    </div>
  )
}
