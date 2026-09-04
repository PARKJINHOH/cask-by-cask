import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { formatDotDate, formatScore, optionalScoreColor } from '@/shared/utils/format'
import { parseAromaNotes, supportsAromaProfiles } from '../utils/aroma'
import type { AromaNotes } from '../utils/aroma'
import type { ReviewItem as ReviewItemType } from '../types/review.types'
import UserBadge from '@/shared/components/UserBadge'
import type { UserRole } from '@/domain/auth/types/auth.types'
import { getSpiritDetailPath } from '@/domain/spirit/utils/spiritUrl'
import ReviewCommentContent from './ReviewCommentContent'
import { reviewCommentToText } from '../utils/reviewRichText'
import ReviewImageStrip from './ReviewImageStrip'
import AromaProfileChartPanel from './AromaProfileChartPanel'
import AromaProfilePreviewButton from './AromaProfilePreviewButton'
import AromaProfileFloatingPanel from './AromaProfileFloatingPanel'
import ReviewShareModal from '../share/ReviewShareModal'
import { useContentTranslation } from '@/domain/translation/hooks/useContentTranslation'
import TranslationAction from '@/domain/translation/components/TranslationAction'
import { shouldOfferContentTranslation } from '@/domain/translation/utils/contentLanguage'

function formatAromaId(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── 아로마 칩 목록 (전체 표시, 많으면 자동 줄바꿈) ──────────────────

interface AromaChipsProps {
  aromaNotes: AromaNotes
}

function AromaChips({ aromaNotes }: AromaChipsProps) {
  const { ids, custom } = aromaNotes
  if (ids.length === 0 && custom.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        return (
          <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
            {formatAromaId(id)}
          </span>
        )
      })}
      {custom.map((c) => (
        <span key={c} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-700">
          {c}
        </span>
      ))}
    </div>
  )
}

// ── 점수 섹션 (향 / 맛 / 피니시) ────────────────────────────────────

interface ReviewSectionProps {
  label: string
  /** 점수를 남기지 않은 리뷰면 null — 노트·아로마만 있는 리뷰가 된다. */
  score: number | null
  note?: string | null
  aromaNotes: AromaNotes
}

function ReviewSection({ label, score, note, aromaNotes }: ReviewSectionProps) {
  const color = optionalScoreColor(score)
  return (
    <div className="space-y-2">
      {/* 라벨 + 점수 */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-bold text-neutral-900">{label}</span>
        <span className="text-base font-bold tabular-nums" style={{ color }}>
          {formatScore(score)}
        </span>
      </div>

      {/* 아로마 칩 — 점수 바 상단 */}
      <AromaChips aromaNotes={aromaNotes} />

      {/* 점수 바 */}
      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score ?? 0}%`, backgroundColor: color }} />
      </div>

      {/* 노트 */}
      {note && <p className="whitespace-pre-wrap text-sm text-neutral-600 leading-relaxed">{note}</p>}
    </div>
  )
}

/**
 * 리뷰 총점.
 *
 * 헤더의 **우측 상단**에 둔다. 모바일은 헤더가 세로로 쌓여 작성자 줄과 액션 줄이 나뉘므로
 * 작성자 줄 오른쪽 끝에, PC 는 한 줄이라 액션 줄 맨 오른쪽에 놓는다 —
 * 두 자리 중 화면 폭에 맞는 하나만 렌더된다(반대쪽은 display:none).
 */
function TotalScore({ value, className = '' }: { value: number | null; className?: string }) {
  return (
    <span
      className={`shrink-0 text-2xl font-bold tabular-nums leading-none ${className}`}
      style={{ color: optionalScoreColor(value) }}
    >
      {formatScore(value)}
    </span>
  )
}

function ReviewHeaderDivider() {
  return <span aria-hidden="true" className="h-8 w-px shrink-0 bg-neutral-200" />
}

// ── 리뷰 카드 ───────────────────────────────────────────────────

export interface ReviewItemProps {
  review: ReviewItemType
  currentUserId?: number
  onEdit: (review: ReviewItemType) => void
  onDelete: (id: number) => void
  showSpiritName?: boolean
  reviewVariantLabel?: string
}

export default function ReviewItem({ review, currentUserId, onEdit, onDelete, showSpiritName, reviewVariantLabel }: ReviewItemProps) {
  const { t, i18n } = useTranslation()
  const contentTranslation = useContentTranslation('REVIEW', review.id)
  // PC 는 프로파일이 있으면 기본으로 펼쳐서 옆에 보여준다 (버튼으로 접을 수 있음).
  // 모바일은 자리가 없어 상단 플로팅 패널로 띄우므로 기본은 닫힘 — 카드마다 자동으로 뜨면 화면을 가린다.
  const [profileExpanded, setProfileExpanded] = useState(true)
  const [profilePopupOpen, setProfilePopupOpen] = useState(false)
  const isOwner = !!currentUserId && currentUserId === review.userId
  const spiritName = i18n.language === 'en' ? (review.spiritNameEn || review.spiritNameKo) : review.spiritNameKo
  const spiritDetailPath = getSpiritDetailPath({
    id: review.spiritId,
    spiritCanonicalPathKo: review.spiritCanonicalPathKo,
    spiritCanonicalPathEn: review.spiritCanonicalPathEn,
  }, i18n.language)
  const translated = contentTranslation.fields
  // 번역 제안 여부는 원문 언어로 판단한다 — 태그가 섞이면 판별이 흔들린다.
  const sourceReviewTexts = [
    review.noseNote, review.tasteNote, review.finishNote, reviewCommentToText(review.comment),
  ]
  const hasTranslatableText = sourceReviewTexts
    .some((value) => !!value?.trim())
  const shouldShowTranslation = hasTranslatableText && shouldOfferContentTranslation(
    sourceReviewTexts,
    contentTranslation.targetLanguage,
  )

  const sections = [
    { label: t('review.nose'),   score: review.noseScore,   note: translated?.noseNote ?? review.noseNote,   aromaNotes: parseAromaNotes(review.noseAromaWheelNotes) },
    { label: t('review.taste'),  score: review.tasteScore,  note: translated?.tasteNote ?? review.tasteNote,  aromaNotes: parseAromaNotes(review.tasteAromaWheelNotes) },
    { label: t('review.finish'), score: review.finishScore, note: translated?.finishNote ?? review.finishNote, aromaNotes: parseAromaNotes(review.finishAromaWheelNotes) },
  ]
  const aromaProfiles = supportsAromaProfiles(review.spiritCategory) ? (review.aromaProfiles ?? []) : []
  const hasAromaProfiles = aromaProfiles.length > 0
  const profilePanelId = `review-aroma-profile-${review.id}`
  const profilePopupId = `${profilePanelId}-popup`
  const closeProfilePopup = useCallback(() => setProfilePopupOpen(false), [])

  return (
    <article className="p-5 bg-white rounded-xl border border-neutral-100 space-y-5">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 border-b border-neutral-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <UserBadge
            user={{
              id: review.userId,
              nickname: review.nickname,
              role: (review.userRole || 'MEMBER') as UserRole,
              currentLevel: review.userLevel,
              profileImageUrl: review.userProfileImageUrl,
}}
            size="sm"
            avatarSize="lg"
            nameClassName="text-sm font-bold"
            levelIconSize={13}
            onlyReviews={true}
            disableNicknameHover={true}
            subLine={
              <span className="flex flex-col gap-0.5 min-w-0">
                {reviewVariantLabel && (
                  <span className="text-sm font-semibold text-primary-700 truncate max-w-[220px] sm:max-w-[320px]">
                    {reviewVariantLabel}
                  </span>
                )}
                <span className="text-neutral-400">{formatDotDate(review.createdAt)}</span>
                {/* 마신 곳 — 장소가 비공개·삭제되면 서버가 null 을 주므로 배지만 조용히 사라진다.
                    이 배지가 술 상세의 "마실 수 있는 곳"과 같은 데이터를 반대 방향에서 보여 준다. */}
                {review.venue && (
                  <Link
                    to={`/venues/${review.venue.venueId}`}
                    className="max-w-[160px] truncate text-primary-700 hover:underline sm:max-w-[220px]"
                  >
                    🍸 {i18n.language === 'en'
                      ? review.venue.nameEn || review.venue.nameKo
                      : review.venue.nameKo}
                  </Link>
                )}
              </span>
            }
          />
          {/* 모바일 — 작성자 줄 오른쪽 끝 */}
          <TotalScore value={review.totalScore} className="ml-auto sm:hidden" />
        </div>
        <div className="flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto sm:flex-shrink-0">
          {hasAromaProfiles && (
            <>
              {/* PC: 카드 안에서 옆으로 펼친다 */}
              <AromaProfilePreviewButton
                className="hidden md:flex"
                profiles={aromaProfiles}
                expanded={profileExpanded}
                controlsId={profilePanelId}
                onToggle={() => setProfileExpanded((current) => !current)}
              />
              {/* 모바일: 상단 플로팅 패널을 연다 */}
              <AromaProfilePreviewButton
                className="md:hidden"
                profiles={aromaProfiles}
                expanded={profilePopupOpen}
                controlsId={profilePopupId}
                onToggle={() => setProfilePopupOpen((current) => !current)}
              />
            </>
          )}
          {hasAromaProfiles && <ReviewHeaderDivider />}
          {review.images.length > 0 && (
            <div className="min-w-0 overflow-x-auto">
              <ReviewImageStrip images={review.images} />
            </div>
          )}
          {review.images.length > 0 && <ReviewHeaderDivider />}
          <ReviewShareModal
            review={{
              id: review.id,
              spiritId: review.spiritId,
              spiritNameKo: review.spiritNameKo,
              spiritNameEn: review.spiritNameEn,
              nickname: review.nickname,
              noseScore: review.noseScore,
              tasteScore: review.tasteScore,
              finishScore: review.finishScore,
              totalScore: review.totalScore,
              noseNote: review.noseNote,
              tasteNote: review.tasteNote,
              finishNote: review.finishNote,
              comment: review.comment,
              createdAt: review.createdAt,
              images: review.images,
              aromaProfiles: review.aromaProfiles ?? [],
            }}
          />
          {/* 모바일에서는 액션 줄 왼쪽 끝으로 보낸다 — 오른쪽에 몰린 아로마·이미지·공유와 성격이 다르다.
              PC 는 한 줄이라 기존 자리(공유 다음)를 지킨다. */}
          {isOwner && (
            <div className="order-first mr-auto flex shrink-0 gap-2 sm:order-none sm:mr-0">
              <button onClick={() => onEdit(review)} className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
                {t('common.edit')}
              </button>
              <button onClick={() => onDelete(review.id)} className="text-sm text-danger-400 hover:text-danger-600 transition-colors">
                {t('common.delete')}
              </button>
            </div>
          )}
          {/* PC — 헤더 한 줄의 맨 오른쪽 */}
          <TotalScore value={review.totalScore} className="hidden sm:inline-block" />
        </div>
      </div>

      {/* 주류명 (작성 리뷰 보기 페이지 등에서 노출) */}
      {showSpiritName && (
        <div className="pb-2.5 border-b border-neutral-100">
          <Link
            to={spiritDetailPath}
            className="text-base font-bold text-neutral-800 hover:text-primary-800 hover:underline transition-colors block truncate"
          >
            {spiritName}
          </Link>
        </div>
      )}

      {/* 향 / 맛 / 피니시 */}
      <div className={`grid min-w-0 transition-[grid-template-columns,gap] duration-500 ease-in-out motion-reduce:transition-none ${
        profileExpanded && hasAromaProfiles
          ? 'md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-5'
          : 'md:grid-cols-[minmax(0,1fr)_minmax(0,0fr)] md:gap-0'
      }`}>
        <div className="min-w-0 space-y-5">
          {sections.map(({ label, score, note, aromaNotes }) => (
            <ReviewSection
              key={label}
              label={label}
              score={score}
              note={note}
              aromaNotes={aromaNotes}
            />
          ))}
        </div>
        {hasAromaProfiles && (
          <div
            id={profilePanelId}
            aria-hidden={!profileExpanded}
            inert={profileExpanded ? undefined : true}
            className={`hidden min-w-0 overflow-hidden transition-[max-height,opacity,transform,margin] duration-500 ease-in-out motion-reduce:transition-none md:block ${
              profileExpanded
                ? 'mt-4 max-h-[48rem] translate-y-0 opacity-100 md:mt-0 md:translate-x-0'
                : 'pointer-events-none max-h-0 translate-y-2 opacity-0 md:translate-x-4 md:translate-y-0'
            }`}
          >
            {/* h-full 을 주지 않는다 — 그리드 칸은 노트 길이만큼 늘어나지만
                패널은 제 높이로 서서 맨 위에 붙는다. */}
            {profileExpanded && (
              <div className="min-w-[16rem] md:min-w-0">
                <AromaProfileChartPanel profiles={aromaProfiles} chartOnly />
              </div>
            )}
          </div>
        )}
      </div>

      {hasAromaProfiles && (
        <AromaProfileFloatingPanel
          open={profilePopupOpen}
          profiles={aromaProfiles}
          id={profilePopupId}
          title={t('review.aromaProfile.byReviewer', { nickname: review.nickname })}
          onClose={closeProfilePopup}
        />
      )}

      {/* 종합평가 */}
      {review.comment && (
        <div className="border-t border-neutral-100 pt-4">
          <p className="text-base font-bold text-neutral-900 mb-1.5">{t('review.overall')}</p>
          <ReviewCommentContent
            value={translated?.comment ?? review.comment}
            className="text-sm text-neutral-700 leading-relaxed"
          />
        </div>
      )}

      <TranslationAction
        hasContent={shouldShowTranslation}
        showTranslated={contentTranslation.showTranslated}
        isLoading={contentTranslation.isLoading}
        error={contentTranslation.error}
        onToggle={contentTranslation.toggle}
        className="border-t border-neutral-100 pt-1"
      />
    </article>
  )
}
