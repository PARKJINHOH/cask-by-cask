'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ImageLightbox from '@/shared/components/ImageLightbox'
import Spinner from '@/shared/components/Spinner'
import { useRequireLogin } from '@/domain/auth/hooks/useRequireLogin'
import { useAuthStore } from '@/domain/auth/store/authStore'
import {
  useCreateVenueComment,
  useDeleteVenueComment,
  useUpdateVenueComment,
  useVenueComments,
} from '@/domain/venue/hooks/useVenueComments'
import {
  VENUE_COMMENT_MAX_FILE_SIZE,
  VENUE_COMMENT_MAX_IMAGES,
  VENUE_COMMENT_MAX_LENGTH,
  VENUE_COMMENT_MAX_TOTAL_SIZE,
  type VenueComment,
  type VenueCommentImagePlanItem,
} from '@/domain/venue/types/venue.types'

interface Props {
  venueId: number
  className?: string
}

/** 편집 중인 사진 한 칸 — 기존 것이거나 새로 고른 파일이다. */
type DraftImage =
  | { kind: 'existing'; id: number; url: string }
  | { kind: 'new'; file: File; url: string }

function formatDate(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 사진 선택 검증.
 *
 * <p>서버가 다시 검증하지만 여기서 먼저 막는다 — 10MB 짜리를 올린 뒤 거절당하는 것보다
 * 고르는 순간 알려 주는 편이 훨씬 빠르다. <b>초과분을 조용히 잘라내지 않고</b> 왜 안 되는지 말한다.
 */
function validateSelection(
  current: DraftImage[],
  incoming: File[],
  t: (key: string, fallback: string, options?: Record<string, unknown>) => string,
): { accepted: File[]; error: string | null } {
  const room = VENUE_COMMENT_MAX_IMAGES - current.length
  if (room <= 0) {
    return {
      accepted: [],
      error: t('venue.comment.imageLimit', '사진은 최대 {{max}}장까지 올릴 수 있어요.', {
        max: VENUE_COMMENT_MAX_IMAGES,
      }),
    }
  }
  if (incoming.length > room) {
    return {
      accepted: [],
      error: t('venue.comment.imageLimit', '사진은 최대 {{max}}장까지 올릴 수 있어요.', {
        max: VENUE_COMMENT_MAX_IMAGES,
      }),
    }
  }

  const oversize = incoming.find((file) => file.size > VENUE_COMMENT_MAX_FILE_SIZE)
  if (oversize) {
    return {
      accepted: [],
      error: t('venue.comment.imageTooLarge', '사진 한 장은 10MB를 넘을 수 없어요.'),
    }
  }

  // HEIC 은 아이폰 기본 포맷이라 사용자가 상시로 부딪힌다. 형식 이름만 말하면 다음에 뭘 할지
  // 알 수 없으므로 해결책을 함께 준다.
  const heic = incoming.find((file) => /\.(heic|heif)$/i.test(file.name))
  if (heic) {
    return {
      accepted: [],
      error: t(
        'venue.comment.imageHeic',
        'HEIC 형식은 지원하지 않아요. 아이폰이라면 설정 > 카메라 > 포맷을 "높은 호환성"으로 바꾸거나, 사진을 캡처해서 올려주세요.',
      ),
    }
  }

  const total =
    incoming.reduce((sum, file) => sum + file.size, 0) +
    current.reduce((sum, image) => sum + (image.kind === 'new' ? image.file.size : 0), 0)
  if (total > VENUE_COMMENT_MAX_TOTAL_SIZE) {
    return {
      accepted: [],
      error: t('venue.comment.imageTotalTooLarge', '사진 전체 용량은 50MB를 넘을 수 없어요.'),
    }
  }

  return { accepted: incoming, error: null }
}

// ── 작성·수정 폼 ─────────────────────────────────────────

interface FormProps {
  venueId: number
  initial?: VenueComment
  parentId?: number | null
  onDone: () => void
  onCancel?: () => void
  autoFocus?: boolean
}

function CommentForm({ venueId, initial, parentId, onDone, onCancel, autoFocus }: FormProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState(initial?.content ?? '')
  const [images, setImages] = useState<DraftImage[]>(
    () => initial?.images.map((image) => ({ kind: 'existing' as const, id: image.id, url: image.imageUrl })) ?? [],
  )
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const create = useCreateVenueComment(venueId)
  const update = useUpdateVenueComment(venueId)
  const isPending = create.isPending || update.isPending
  const isEdit = !!initial

  const pickFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return
    const { accepted, error: validationError } = validateSelection(images, Array.from(fileList), t)
    setError(validationError)
    if (accepted.length) {
      setImages((prev) => [
        ...prev,
        ...accepted.map((file) => ({ kind: 'new' as const, file, url: URL.createObjectURL(file) })),
      ])
    }
    // 같은 파일을 다시 고를 수 있도록 비운다.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    setImages((prev) => {
      const target = prev[index]
      // objectURL 을 회수하지 않으면 사진을 여러 번 바꿀수록 메모리가 샌다.
      if (target?.kind === 'new') URL.revokeObjectURL(target.url)
      return prev.filter((_, i) => i !== index)
    })
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) {
      setError(t('venue.comment.contentRequired', '내용을 입력해주세요.'))
      return
    }
    setError(null)

    const files = images.filter((image) => image.kind === 'new').map((image) => image.file)
    const payload = { content: trimmed, parentId: parentId ?? null }

    const onError = (mutationError: unknown) => {
      const message = (mutationError as { response?: { data?: { message?: string } } })?.response
        ?.data?.message
      setError(message ?? t('venue.comment.saveFailed', '저장하지 못했어요. 잠시 후 다시 시도해주세요.'))
    }

    if (isEdit && initial) {
      // 계획은 화면에 보이는 순서 그대로다 — 배열 인덱스가 곧 노출 순서가 된다.
      let fileIndex = 0
      const imagePlan: VenueCommentImagePlanItem[] = images.map((image) =>
        image.kind === 'existing' ? { imageId: image.id } : { fileIndex: fileIndex++ },
      )
      update.mutate(
        { commentId: initial.id, payload, files, imagePlan },
        { onSuccess: onDone, onError },
      )
    } else {
      create.mutate({ payload, files }, { onSuccess: onDone, onError })
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-neutral-200 bg-white p-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={VENUE_COMMENT_MAX_LENGTH}
        rows={3}
        autoFocus={autoFocus}
        placeholder={
          parentId
            ? t('venue.comment.replyPlaceholder', '답글을 입력해주세요')
            : t('venue.comment.placeholder', '방문 후기를 남겨주세요. 어떤 술이 좋았나요?')
        }
        className="w-full resize-none border-0 p-0 text-sm text-neutral-800 placeholder:text-neutral-400
          focus:outline-none focus:ring-0"
      />

      {images.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {images.map((image, index) => (
            <li key={image.kind === 'existing' ? `e${image.id}` : `n${index}`} className="relative">
              <img
                src={image.url}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                aria-label={t('venue.comment.removeImage', '사진 삭제')}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center
                  rounded-full bg-neutral-900/80 text-xs leading-none text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => pickFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= VENUE_COMMENT_MAX_IMAGES}
            className="min-h-[36px] px-2 text-xs text-neutral-600 hover:bg-neutral-100
              disabled:cursor-not-allowed disabled:text-neutral-300"
          >
            📷 {images.length}/{VENUE_COMMENT_MAX_IMAGES}
          </button>
          <span className="text-xs text-neutral-400">
            {content.length}/{VENUE_COMMENT_MAX_LENGTH}
          </span>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[36px] px-3 text-xs text-neutral-500 hover:bg-neutral-100"
            >
              {t('common.cancel', '취소')}
            </button>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="min-h-[36px] bg-primary-800 px-4 text-xs font-medium text-white
              hover:bg-primary-900 disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            {isPending ? '…' : isEdit ? t('common.save', '저장') : t('venue.comment.submit', '등록')}
          </button>
        </div>
      </div>
    </form>
  )
}

// ── 댓글 한 건 ───────────────────────────────────────────

interface ItemProps {
  venueId: number
  comment: VenueComment
  currentUserId: number | null
  onOpenImages: (urls: string[], index: number) => void
  depth?: number
}

function CommentItem({ venueId, comment, currentUserId, onOpenImages, depth = 0 }: ItemProps) {
  const { t } = useTranslation()
  const requireLogin = useRequireLogin()
  const [editing, setEditing] = useState(false)
  const [replying, setReplying] = useState(false)
  const remove = useDeleteVenueComment(venueId)

  const isMine = currentUserId != null && comment.userId === currentUserId

  // 숨김 처리된 댓글도 자리는 남긴다 — 통째로 빼면 거기 달린 대댓글이 부모를 잃는다.
  if (comment.hidden) {
    return (
      <li className={depth > 0 ? 'ml-8 border-l border-neutral-100 pl-3' : ''}>
        <p className="py-3 text-sm text-neutral-400">
          {t('venue.comment.hidden', '신고 누적으로 숨김 처리된 댓글입니다.')}
        </p>
        {comment.replies.length > 0 && (
          <ul>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                venueId={venueId}
                comment={reply}
                currentUserId={currentUserId}
                onOpenImages={onOpenImages}
                depth={depth + 1}
              />
            ))}
          </ul>
        )}
      </li>
    )
  }

  const imageUrls = comment.images.map((image) => image.imageUrl)

  return (
    <li className={depth > 0 ? 'ml-8 border-l border-neutral-100 pl-3' : ''}>
      <div className="py-3">
        {editing ? (
          <CommentForm
            venueId={venueId}
            initial={comment}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
            autoFocus
          />
        ) : (
          <>
            <div className="flex items-center gap-2">
              {comment.profileImageUrl ? (
                <img src={comment.profileImageUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="h-6 w-6 rounded-full bg-neutral-200" aria-hidden="true" />
              )}
              <span className="text-sm font-medium text-neutral-800">{comment.nickname}</span>
              <span className="text-xs text-neutral-400">{formatDate(comment.createdAt)}</span>
            </div>

            <p className="mt-1.5 whitespace-pre-line break-keep text-sm leading-relaxed text-neutral-700">
              {comment.content}
            </p>

            {imageUrls.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {imageUrls.map((url, index) => (
                  <li key={url}>
                    <button
                      type="button"
                      onClick={() => onOpenImages(imageUrls, index)}
                      className="block overflow-hidden rounded-lg"
                    >
                      <img
                        src={url}
                        alt={t('venue.comment.photoAlt', '방문 사진')}
                        loading="lazy"
                        className="h-20 w-20 object-cover transition-transform hover:scale-105"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-1.5 flex gap-3">
              {depth === 0 && (
                <button
                  type="button"
                  onClick={() => requireLogin(() => setReplying((prev) => !prev))}
                  className="min-h-[32px] text-xs text-neutral-500 hover:text-neutral-800"
                >
                  {t('venue.comment.reply', '답글')}
                </button>
              )}
              {isMine && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="min-h-[32px] text-xs text-neutral-500 hover:text-neutral-800"
                  >
                    {t('common.edit', '수정')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t('venue.comment.confirmDelete', '댓글을 삭제할까요?'))) {
                        remove.mutate(comment.id)
                      }
                    }}
                    className="min-h-[32px] text-xs text-neutral-400 hover:text-red-500"
                  >
                    {t('common.delete', '삭제')}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {replying && (
          <div className="mt-2">
            <CommentForm
              venueId={venueId}
              parentId={comment.id}
              onDone={() => setReplying(false)}
              onCancel={() => setReplying(false)}
              autoFocus
            />
          </div>
        )}
      </div>

      {comment.replies.length > 0 && (
        <ul>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              venueId={venueId}
              comment={reply}
              currentUserId={currentUserId}
              onOpenImages={onOpenImages}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// ── 스레드 ───────────────────────────────────────────────

/**
 * 장소 방문 후기 — 사진 최대 5장, 1단 대댓글.
 *
 * <p>지도 앱의 패널과 문서 페이지가 함께 쓴다. 두 화면의 차이는 바깥 폭·스크롤뿐이라
 * 안쪽은 이 컴포넌트 하나로 둔다.
 */
export default function VenueCommentThread({ venueId, className }: Props) {
  const { t } = useTranslation()
  const requireLogin = useRequireLogin()
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const { data: comments, isLoading } = useVenueComments(venueId)
  const [writing, setWriting] = useState(false)
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null)

  const total = useMemo(
    () => (comments ?? []).reduce((sum, c) => sum + 1 + c.replies.length, 0),
    [comments],
  )

  return (
    <div className={className}>
      {writing ? (
        <CommentForm venueId={venueId} onDone={() => setWriting(false)} onCancel={() => setWriting(false)} autoFocus />
      ) : (
        <button
          type="button"
          onClick={() => requireLogin(() => setWriting(true))}
          className="w-full rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-left
            text-sm text-neutral-400 hover:border-primary-400 hover:text-neutral-600"
        >
          {isLoggedIn
            ? t('venue.comment.placeholder', '방문 후기를 남겨주세요. 어떤 술이 좋았나요?')
            : t('venue.comment.loginToWrite', '로그인하고 방문 후기를 남겨보세요')}
        </button>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : total === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-400">
          {t('venue.comment.empty', '아직 후기가 없어요. 첫 방문 후기를 남겨보세요.')}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-100">
          {(comments ?? []).map((comment) => (
            <CommentItem
              key={comment.id}
              venueId={venueId}
              comment={comment}
              currentUserId={currentUserId}
              onOpenImages={(urls, index) => setLightbox({ urls, index })}
            />
          ))}
        </ul>
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.urls}
          initialIndex={lightbox.index}
          open
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
