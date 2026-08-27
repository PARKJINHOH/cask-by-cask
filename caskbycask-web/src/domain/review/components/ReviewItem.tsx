import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { formatDate, formatScore, optionalScoreColor } from '@/shared/utils/format'
import { parseAromaNotes, supportsAromaProfiles } from '../utils/aroma'
import type { AromaNotes } from '../utils/aroma'
import type { ReviewItem as ReviewItemType } from '../types/review.types'
import UserBadge from '@/shared/components/UserBadge'
import type { UserRole } from '@/domain/auth/types/auth.types'
import { getSpiritDetailPath } from '@/domain/spirit/utils/spiritUrl'
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
  const sourceReviewTexts = [review.noseNote, review.tasteNote, review.finishNote, review.comment]
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
            onlyReviews={true}
            disableNicknameHover={true}
            subLine={
              <span className="flex flex-col gap-0.5 min-w-0">
                {reviewVariantLabel && (
                  <span className="font-semibold text-primary-700 truncate max-w-[220px] sm:max-w-[320px]">
                    {reviewVariantLabel}
                  </span>
                )}
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-neutral-400">
                  {review.userReviewCount && review.userReviewCount >= 2 && (
                    <span className="font-semibold text-neutral-500">
                      {t('review.nthReview', { index: review.userReviewIndex })}
                    </span>
                  )}
                  <span>{formatDate(review.createdAt, i18n.language)}</span>
                </span>
              </span>
            }
          />
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:justify-end sm:flex-shrink-0">
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
            <div className="min-w-0 flex-1 overflow-x-auto sm:flex-none">
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
          <span className="ml-auto shrink-0 text-2xl font-bold tabular-nums sm:ml-0" style={{ color: optionalScoreColor(review.totalScore) }}>
            {formatScore(review.totalScore)}
          </span>
          {isOwner && (
            <div className="flex gap-2">
              <button onClick={() => onEdit(review)} className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
                {t('common.edit')}
              </button>
              <button onClick={() => onDelete(review.id)} className="text-sm text-danger-400 hover:text-danger-600 transition-colors">
                {t('common.delete')}
              </button>
            </div>
          )}
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
          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {translated?.comment ?? review.comment}
          </p>
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
