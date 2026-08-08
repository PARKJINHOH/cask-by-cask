import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  PHOTO_CARD_DRAFT_MAX_COUNT, PHOTO_CARD_DRAFT_RETENTION_DAYS,
  photoCardDraftApi, type PhotoCardDraftSummary,
} from '../../api/photoCardDraftApi'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'
import { PanelButton, Section } from './controls'

interface Props {
  editor: PhotoCardEditor
  isLoggedIn: boolean
  busy: boolean
  /** 지금 이어서 편집 중인 임시저장. 저장하면 이것을 덮어쓴다. */
  currentDraftId: number | null
  onSave: (options: { asNew: boolean }) => void
  onLoad: (id: number) => void
  /** 지운 것이 지금 이어서 편집 중인 임시저장이면 페이지가 그 연결을 끊어야 한다. */
  onDeleted: (id: number) => void
  /** 비회원이 눌렀을 때 — 페이지가 지금 작업을 맡겨 두고 로그인으로 안내한다. */
  onRequireLogin: () => void
}

/** 목록을 다시 읽어야 하는 곳이 여러 군데다(패널의 삭제, 페이지의 저장). 키를 한곳에 둔다. */
export const PHOTO_CARD_DRAFTS_QUERY_KEY = ['photoCardDrafts'] as const

/**
 * 임시저장 도구.
 *
 * ── 왜 서버인가 ──
 * 브라우저에만 두면 시크릿 창·캐시 정리·다른 기기에서 그대로 사라진다. 여기 담기는 것은
 * 배치뿐 아니라 <b>편집 중인 사진</b>이라, 사진이 없으면 이어서 하기 자체가 성립하지 않는다.
 * 그래서 회원 전용이고, 서버는 {@link PHOTO_CARD_DRAFT_RETENTION_DAYS}일만 맡아 둔다 —
 * 남의 사진첩을 오래 들고 있지 않겠다는 약속이라, 저장할 때마다 화면에 그대로 적어 둔다.
 *
 * ── 목록을 왜 패널에 두는가 ──
 * 커뮤니티 글쓰기는 본문이 한 칸이라 목록을 모달로 띄워도 되지만, 편집기는 오른쪽 패널이
 * 늘 열려 있다. 목록을 그 자리에 두면 무엇을 저장해 뒀는지 보면서 이어서 작업할 수 있다.
 */
export default function DraftPanel({
  editor, isLoggedIn, busy, currentDraftId, onSave, onLoad, onDeleted, onRequireLogin,
}: Props) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [removingId, setRemovingId] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: PHOTO_CARD_DRAFTS_QUERY_KEY,
    queryFn: photoCardDraftApi.list,
    enabled: isLoggedIn,
    staleTime: 30_000,
  })
  const drafts = data ?? []

  const hasPhoto = Boolean(editor.photoImage)

  const formatSavedAt = (iso: string) => new Date(iso).toLocaleString(
    i18n.language === 'en' ? 'en-US' : 'ko-KR',
    { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false },
  )

  /** 남은 보관 기간. 오늘 안에 사라지는 것은 날짜로 말해 봐야 와닿지 않아 따로 적는다. */
  const remainingLabel = (iso: string) => {
    const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
    return days <= 1
      ? t('photoCard.draftExpiresToday')
      : t('photoCard.draftExpiresIn', { days })
  }

  const remove = async (draft: PhotoCardDraftSummary) => {
    if (!window.confirm(t('photoCard.draftDeleteConfirm'))) return
    setRemovingId(draft.id)
    try {
      await photoCardDraftApi.remove(draft.id)
      onDeleted(draft.id)
      await queryClient.invalidateQueries({ queryKey: PHOTO_CARD_DRAFTS_QUERY_KEY })
    } finally {
      setRemovingId(null)
    }
  }

  if (!isLoggedIn) {
    return (
      <Section title={t('photoCard.toolDraft')} hint={t('photoCard.draftGuestHint')}>
        <PanelButton tone="primary" onClick={onRequireLogin}>
          {t('photoCard.draftLoginToSave')}
        </PanelButton>
      </Section>
    )
  }

  return (
    <div className="space-y-4">
      <Section
        title={t('photoCard.toolDraft')}
        hint={hasPhoto
          ? t('photoCard.draftServerHint', { days: PHOTO_CARD_DRAFT_RETENTION_DAYS })
          : t('photoCard.draftNeedsPhoto')}
      >
        <PanelButton tone="primary" disabled={busy || !hasPhoto} onClick={() => onSave({ asNew: false })}>
          {currentDraftId ? t('photoCard.draftOverwrite') : t('photoCard.draftSaveCurrent')}
        </PanelButton>
        {/* 불러온 임시저장을 이어서 고치는 중이면, 덮어쓸지 따로 남길지 고를 수 있어야 한다. */}
        {currentDraftId != null && (
          <PanelButton disabled={busy || !hasPhoto} onClick={() => onSave({ asNew: true })}>
            {t('photoCard.draftSaveAsNew')}
          </PanelButton>
        )}
      </Section>

      <Section title={`${t('photoCard.draftListTitle')} (${drafts.length}/${PHOTO_CARD_DRAFT_MAX_COUNT})`}>
        {isLoading && <p className="py-6 text-center text-xs text-neutral-400">{t('common.loading')}</p>}
        {isError && <p className="py-6 text-center text-xs text-red-600">{t('photoCard.draftListFailed')}</p>}
        {!isLoading && !isError && drafts.length === 0 && (
          <p className="py-6 text-center text-xs text-neutral-500">{t('photoCard.draftEmpty')}</p>
        )}

        <ul className="space-y-2">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className={`rounded-lg border px-2.5 py-2 ${
                draft.id === currentDraftId
                  ? 'border-primary-500 bg-primary-50/50'
                  : 'border-neutral-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {draft.thumbnailUrl ? (
                  <img
                    src={draft.thumbnailUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded border border-neutral-200 object-cover"
                  />
                ) : (
                  <span className="h-14 w-14 shrink-0 rounded border border-dashed border-neutral-200" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-neutral-800">
                    {draft.name?.trim() || t('photoCard.draftUnnamed')}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-neutral-500">
                    {formatSavedAt(draft.savedAt)}
                  </p>
                  <p className="text-[11px] font-medium text-neutral-400">
                    {remainingLabel(draft.expiresAt)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  disabled={busy || removingId === draft.id}
                  onClick={() => onLoad(draft.id)}
                  className="flex-1 rounded-md bg-primary-600 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-primary-500 disabled:opacity-40"
                >
                  {t('photoCard.draftLoad')}
                </button>
                <button
                  type="button"
                  disabled={busy || removingId === draft.id}
                  onClick={() => { void remove(draft) }}
                  className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  {t('common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
