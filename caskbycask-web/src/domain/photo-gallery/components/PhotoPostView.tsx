import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePostDetail, usePostActions } from '@/domain/community/hooks/usePostDetail'
import CommentSection from '@/domain/community/components/CommentSection'
import RichContent from '@/shared/components/RichContent'
import ImageLightbox from '@/shared/components/ImageLightbox'
import UserBadge from '@/shared/components/UserBadge'
import Toast from '@/shared/components/Toast'
import { useToast } from '@/shared/hooks/useToast'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { loginRouteState, useRequireLogin } from '@/domain/auth/hooks/useRequireLogin'
import { formatDotDateTime } from '@/shared/utils/format'
import type { UserRole } from '@/domain/auth/types/auth.types'
import { splitPhotoContent } from '../utils/photoContent'
import { PHOTO_DETAIL_SIZES, photoSrc, photoSrcSet } from '../utils/photoImageVariants'
import { downloadImageUrl, fileNameFromImageUrl } from '../utils/downloadImage'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

interface Props {
  postId: number
  /** 모달로 띄웠을 때 — 닫기 버튼을 노출한다 */
  onClose?: () => void
  /** 목록 안에서 열었을 때 앞뒤 사진으로 이동 */
  onPrev?: () => void
  onNext?: () => void
  /** 삭제 후 처리 — 미지정 시 갤러리 목록으로 이동 */
  onDeleted?: () => void
  /**
   * 이미지 뷰어(라이트박스) 열림 상태 알림.
   * 뷰어가 떠 있는 동안 바깥 모달이 ← → 를 앞뒤 게시글 이동으로 가로채면 안 된다.
   */
  onViewerOpenChange?: (open: boolean) => void
  /** 모달은 높이가 고정이라 각 칸이 따로 스크롤된다. 페이지는 문서 스크롤을 쓴다. */
  fill?: boolean
}

/** 좌우로 이만큼 그어야 사진이 넘어간다(px) */
const SWIPE_THRESHOLD = 60
/** 이 이하로 움직이면 '탭'으로 본다(px) */
const SWIPE_TAP_TOLERANCE = 10

/**
 * 인스타그램 형태의 사진 상세 — 왼쪽에 사진, 오른쪽에 글쓴이·설명·댓글.
 *
 * 모달(PhotoPostModal)과 단독 페이지(PhotoPostDetailPage)가 같은 몸통을 쓴다.
 * 본문 맨 앞 이미지는 왼쪽 칸이 맡으므로 오른쪽 캡션에서는 걷어 낸다(splitPhotoContent).
 */
export default function PhotoPostView({
  postId,
  onClose,
  onPrev,
  onNext,
  onDeleted,
  onViewerOpenChange,
  fill = false,
}: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const requireLogin = useRequireLogin()
  const { isLoggedIn } = useAuthStore()
  const { toasts, showToast, removeToast } = useToast()
  const { data: post, isLoading, isError, error } = usePostDetail(postId)
  const { likeMutation, scrapMutation, reportMutation, deleteMutation } = usePostActions(postId)

  const [imageIndex, setImageIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => { onViewerOpenChange?.(viewerOpen) }, [viewerOpen, onViewerOpenChange])

  // 앞뒤 게시글로 넘어가면 사진도 첫 장부터 — 지난 글의 3번째 장에서 이어지면 안 된다.
  useEffect(() => { setImageIndex(0) }, [postId])

  const { images, captionHtml } = useMemo(() => {
    const split = splitPhotoContent(post?.contentSanitized)
    // 업로드된 첨부(images)가 정본이고, 본문에서 뽑은 주소는 옛 글을 위한 보완이다.
    const attached = post?.images?.map((image) => image.imageUrl) ?? []
    return {
      images: attached.length > 0 ? attached : split.imageUrls,
      captionHtml: split.captionHtml,
    }
  }, [post])

  // 로딩 중에도(images 가 아직 빈 배열이어도) 안전하다 — 아래 다운로드 훅이 참조하므로
  // 이 값을 로딩·에러 조기 반환보다 앞에 둔다(훅은 조건부 반환 뒤에 올 수 없다).
  const currentImage = images[Math.min(imageIndex, Math.max(images.length - 1, 0))]

  const showPrevImage = useCallback(() => {
    setImageIndex((index) => (index - 1 + images.length) % images.length)
  }, [images.length])
  const showNextImage = useCallback(() => {
    setImageIndex((index) => (index + 1) % images.length)
  }, [images.length])

  /**
   * 모바일 좌우 스와이프로 사진을 넘긴다 — 화살표는 손가락으로 누르기엔 작다.
   * 세로로 그은 손짓은 그대로 두어 페이지 스크롤을 막지 않고, 스와이프로 끝난
   * 손짓은 탭으로 세지 않는다(뷰어가 딸려 열리는 것을 막는다).
   */
  const swipe = useRef({ startX: 0, startY: 0, dx: 0, horizontal: false, moved: false })

  const handleTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0]
    swipe.current = { startX: touch.clientX, startY: touch.clientY, dx: 0, horizontal: false, moved: false }
  }, [])

  const handleTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    const state = swipe.current
    const touch = event.touches[0]
    const dx = touch.clientX - state.startX
    const dy = touch.clientY - state.startY
    state.dx = dx
    if (Math.abs(dx) > SWIPE_TAP_TOLERANCE || Math.abs(dy) > SWIPE_TAP_TOLERANCE) state.moved = true
    if (Math.abs(dx) > Math.abs(dy)) state.horizontal = true
  }, [])

  const handleTouchEnd = useCallback(() => {
    const state = swipe.current
    if (images.length <= 1 || !state.horizontal) return
    if (Math.abs(state.dx) <= SWIPE_THRESHOLD) return
    if (state.dx < 0) showNextImage()
    else showPrevImage()
  }, [images.length, showNextImage, showPrevImage])

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast(t('photoGallery.linkCopied'), 'success')
    } catch {
      showToast(t('common.error'), 'error')
    }
  }, [showToast, t])

  /**
   * 지금 보고 있는 사진의 원본(풀해상도) 다운로드.
   *
   * `currentImage`(=post.images[i].imageUrl)는 서버에 저장된 본 이미지 그대로다 —
   * 화면에 그리는 <img> 는 목록·상세 최적화를 위해 축소본(photoSrc)을 쓰지만,
   * 다운로드는 그 축소본이 아니라 이 원본 URL을 대상으로 해야 한다.
   */
  const handleDownload = useCallback(async () => {
    if (!currentImage || downloading) return
    setDownloading(true)
    try {
      await downloadImageUrl(currentImage, fileNameFromImageUrl(currentImage, `caskbycask-photo-${postId}`))
    } catch {
      showToast(t('photoGallery.downloadOriginalFailed'), 'error')
    } finally {
      setDownloading(false)
    }
  }, [currentImage, downloading, postId, showToast, t])

  const handleDelete = useCallback(() => {
    if (!window.confirm(`${t('post.deleteConfirm')}\n\n${t('social.deleteSourceWarning')}`)) return
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        showToast(t('post.deleteSuccess'), 'success')
        if (onDeleted) onDeleted()
        else navigate('/community/photo', { replace: true })
      },
    })
  }, [deleteMutation, navigate, onDeleted, showToast, t])

  const handleReport = useCallback(() => {
    reportMutation.mutate(reportReason || undefined, {
      onSuccess: () => {
        showToast(t('post.reportSuccess'), 'success')
        setShowReport(false)
        setReportReason('')
      },
    })
  }, [reportMutation, reportReason, showToast, t])

  const errorCode = (error as { response?: { data?: { code?: string } } })?.response?.data?.code

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-400">
        {t('common.loading')}
      </div>
    )
  }

  if (errorCode === 'USER_023') {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base font-bold text-neutral-900">{t('post.adultGate.viewTitle')}</p>
        <p className="text-sm text-neutral-500">{t('post.adultGate.viewDesc')}</p>
        <Link
          to={isLoggedIn ? '/mypage?tab=settings' : '/login'}
          state={isLoggedIn ? undefined : loginRouteState(location)}
          className="mt-1 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          {isLoggedIn ? t('post.adultGate.goVerify') : t('nav.login')}
        </Link>
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
        {t('common.error')}
      </div>
    )
  }

  const isMyPost = isLoggedIn && !!post.isMyPost

  return (
    <div
      className={[
        'grid w-full overflow-hidden bg-white',
        // 사진 칸을 넉넉히 — PC 는 왼쪽 사진, 오른쪽 정보/댓글. 모바일은 위아래로 쌓인다.
        'lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]',
        fill ? 'h-full min-h-0 lg:grid-rows-1' : '',
      ].join(' ')}
    >
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 왼쪽: 사진 */}
      <div
        className={[
          'relative flex items-center justify-center bg-neutral-950',
          fill ? 'min-h-0 max-lg:max-h-[52vh]' : 'max-h-[76vh] min-h-[40vh]',
        ].join(' ')}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {currentImage ? (
          // 사진을 누르면 확대·이동이 되는 이미지 뷰어로 넘어간다.
          <button
            type="button"
            onClick={() => { if (!swipe.current.moved) setViewerOpen(true) }}
            aria-label={t('photoGallery.openViewer')}
            className="flex h-full w-full cursor-zoom-in items-center justify-center"
          >
            <img
              // 상세는 크게 보여 주되 원본까지 갈 필요는 없다 — 확대는 라이트박스가 본 이미지로 연다.
              src={photoSrc(currentImage, 1280)}
              srcSet={photoSrcSet(currentImage)}
              sizes={PHOTO_DETAIL_SIZES}
              alt={post.title}
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
          </button>
        ) : (
          <span className="py-24 text-sm text-neutral-500">{t('photoGallery.noImage')}</span>
        )}

        {/* 한 글에 사진이 여러 장일 때 */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrevImage}
              aria-label={t('common.imageViewer.previous')}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white hover:bg-black/70"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={showNextImage}
              aria-label={t('common.imageViewer.next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white hover:bg-black/70"
            >
              ›
            </button>
            {/* 점을 눌러도 그 장으로 간다 — 스와이프가 안 되는 마우스 환경의 지름길 */}
            <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  aria-label={t('common.imageViewer.goTo', { number: index + 1 })}
                  aria-current={index === imageIndex}
                  className="p-1"
                >
                  <span
                    className={`block h-1.5 w-1.5 rounded-full ${index === imageIndex ? 'bg-white' : 'bg-white/40'}`}
                  />
                </button>
              ))}
            </span>
          </>
        )}

        {/* 앞뒤 사진(다른 게시글)으로 이동 — 갤러리 목록에서 열었을 때만 */}
        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            aria-label={t('photoGallery.prevPost')}
            className="absolute left-2 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white hover:bg-black/70 lg:left-3 lg:top-1/2 lg:-translate-y-1/2 lg:px-3 lg:py-2"
          >
            ←
          </button>
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            aria-label={t('photoGallery.nextPost')}
            className="absolute right-2 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white hover:bg-black/70 lg:right-3 lg:top-1/2 lg:-translate-y-1/2 lg:px-3 lg:py-2"
          >
            →
          </button>
        )}
      </div>

      {/* 오른쪽: 글쓴이 · 설명 · 댓글 */}
      <div className={['flex flex-col border-neutral-200 lg:border-l', fill ? 'min-h-0' : ''].join(' ')}>
        {/* 헤더 — 글쓴이 */}
        <div className="flex items-start gap-2 border-b border-neutral-100 px-4 py-3">
          <div className="min-w-0 flex-1">
            {post.authorRole ? (
              <UserBadge
                user={{
                  id: post.authorId ?? undefined,
                  nickname: post.authorNickname,
                  role: post.authorRole as UserRole,
                  currentLevel: post.authorLevel,
                  maturingPower: post.authorMaturingPower ?? undefined,
                  nicknameFixed: post.authorNicknameFixed,
                  profileImageUrl: post.authorProfileImageUrl,
                  systemAccount: post.authorSystemAccount,
                }}
                size="md"
                avatarSize="lg"
                subLine={`${formatDotDateTime(post.createdAt)} · 조회 ${post.viewCount.toLocaleString()}`}
              />
            ) : (
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-medium text-neutral-700">{post.authorNickname}</span>
                <span className="text-xs text-neutral-500">{formatDotDateTime(post.createdAt)}</span>
              </span>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="-mr-1 shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 본문 + 댓글 — 모달에서는 이 칸만 스크롤된다 */}
        <div className={['flex-1 px-4 py-4', fill ? 'min-h-0 overflow-y-auto' : ''].join(' ')}>
          <h1 className="text-base font-bold text-neutral-900">{post.title}</h1>

          {post.isHidden && !post.contentSanitized ? (
            <p className="mt-3 rounded-xl bg-neutral-100 px-4 py-6 text-center text-sm text-neutral-500">
              🚫 {t('post.hiddenNotice')}
            </p>
          ) : post.isLocked && !post.contentSanitized ? (
            <p className="mt-3 rounded-xl bg-neutral-100 px-4 py-6 text-center text-sm text-neutral-500">
              🔒 {t('post.lockedNotice')}
            </p>
          ) : post.isBlocked ? (
            <p className="mt-3 rounded-xl bg-neutral-100 px-4 py-6 text-center text-sm text-neutral-400">
              {t('post.blocked')}
            </p>
          ) : captionHtml ? (
            <RichContent className="prose prose-sm mt-2 max-w-none" html={captionHtml} />
          ) : null}

          {/* 주류 태그 — 사진에 쓴 술의 상세로 이동한다 */}
          {!post.isBlocked && (post.spiritTags?.length ?? 0) > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {post.spiritTags!.map((tag) => (
                <Link
                  key={tag.spiritId}
                  to={`/spirits/${tag.spiritId}`}
                  className="flex items-center gap-2.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 transition-colors hover:bg-primary-100"
                >
                  <span className="h-10 w-8 shrink-0 overflow-hidden rounded bg-neutral-200">
                    {tag.imageUrl && <img src={tag.imageUrl} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-neutral-900">{tag.nameKo}</span>
                    {tag.nameEn && (
                      <span className="block truncate text-xs text-neutral-500">{tag.nameEn}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-primary-700">›</span>
                </Link>
              ))}
            </div>
          )}

          {!post.isBlocked && post.hashtags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t('post.hashtags.label')}>
              {post.hashtags.map((hashtag) => (
                <span
                  key={hashtag.toLocaleLowerCase()}
                  className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800"
                >
                  #{hashtag}
                </span>
              ))}
            </div>
          )}

          {/* 댓글 */}
          <div className="mt-5 border-t border-neutral-100 pt-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">
              {t('post.commentSection')} {post.commentCount > 0 && `(${post.commentCount})`}
            </h2>
            <CommentSection postId={postId} />
          </div>
        </div>

        {/* 액션 바 */}
        {!post.isBlocked && (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 px-4 py-3">
            <button
              type="button"
              onClick={() => {
                if (isMyPost) return
                // 로그인 후 보던 사진(?post=)으로 그대로 돌아온다.
                requireLogin(() => likeMutation.mutate(true))
              }}
              disabled={isMyPost}
              aria-label={t('post.like')}
              title={isMyPost ? t('post.selfLikeDisabled') : t('post.like')}
              className={[
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                isMyPost
                  ? 'cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300'
                  : post.isLiked === true
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-neutral-200 text-neutral-600 hover:border-primary-300 hover:bg-primary-50',
              ].join(' ')}
            >
              <svg className="h-[18px] w-[18px]" fill={post.isLiked === true ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              {post.likeCount > 0 && <span className="font-bold">{post.likeCount}</span>}
            </button>

            {isLoggedIn && (
              <button
                type="button"
                onClick={() => scrapMutation.mutate()}
                title={post.isScrapped ? t('post.scrapped') : t('post.scrap')}
                className={[
                  'rounded-lg p-2 transition-colors',
                  post.isScrapped ? 'text-amber-500 hover:bg-amber-50' : 'text-neutral-400 hover:bg-neutral-100',
                ].join(' ')}
              >
                <svg className="h-5 w-5" fill={post.isScrapped ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={() => { void handleShare() }}
              title={t('photoGallery.share')}
              className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </button>

            <span className="ml-auto flex items-center gap-2">
              {isLoggedIn && !isMyPost && (
                <button
                  type="button"
                  onClick={() => setShowReport(true)}
                  className="text-xs text-neutral-400 transition-colors hover:text-red-500"
                >
                  {t('post.report')}
                </button>
              )}
              {isMyPost && (
                <>
                  {/* 원본(최종 카드 풀해상도) 다운로드 — 내 글일 때만. 화면엔 축소본이 보이지만
                      이 버튼은 서버에 저장된 본 이미지 그대로를 내려받는다. */}
                  <button
                    type="button"
                    onClick={() => { void handleDownload() }}
                    disabled={downloading || !currentImage}
                    title={t('photoGallery.downloadOriginal')}
                    className="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 disabled:opacity-40"
                  >
                    {downloading ? t('photoGallery.downloadingOriginal') : t('photoGallery.downloadOriginal')}
                  </button>
                  <Link
                    to={`/community/photo/${postId}/edit`}
                    className="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                  >
                    {t('post.edit')}
                  </Link>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-500 hover:border-red-300 hover:text-red-700"
                  >
                    {t('post.delete')}
                  </button>
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* 이미지 뷰어 — 휠·더블클릭 확대, 드래그 이동, 사진이 여러 장이면 좌우 이동 */}
      <ImageLightbox
        images={images}
        initialIndex={imageIndex}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />

      {/* 신고 */}
      {showReport && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-base font-semibold text-neutral-900">{t('post.report')}</h3>
            <p className="mb-3 text-sm text-neutral-500">{t('post.reportReason')}</p>
            <AutoGrowTextarea
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder={t('comment.reportPlaceholder')}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setShowReport(false); setReportReason('') }}
                className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleReport}
                disabled={reportMutation.isPending}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40"
              >
                {t('post.report')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
