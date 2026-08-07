import { useTranslation } from 'react-i18next'
import Modal from './Modal'

interface Props {
  open: boolean
  /** 계속 쓰기 — 창만 닫는다. */
  onStay: () => void
  /** 저장하지 않고 나가기. */
  onDiscard: () => void
  /**
   * 임시저장 후 나가기. 넘기지 않으면 그 버튼이 숨는다
   * (임시저장을 지원하지 않는 화면 — 포토카드처럼 자체 저장 흐름이 따로 있는 곳).
   */
  onSaveDraft?: () => void
  busy?: boolean
}

/**
 * 작성 중 이탈 확인.
 *
 * 모바일에서 뒤로 제스처는 오조작이 잦아, 길게 쓴 글이 확인 한 번 없이 사라지곤 했다.
 * 버튼 순서는 위험이 낮은 것부터 — 계속 쓰기 → 임시저장 → 버리기.
 * 세로로 쌓아 좁은 화면에서도 오탭이 나지 않게 한다(각 버튼 44px 이상).
 */
export default function UnsavedChangesDialog({
  open, onStay, onDiscard, onSaveDraft, busy = false,
}: Props) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onStay} title={t('unsaved.title')} size="sm" closeOnOverlay={!busy}>
      <p className="text-sm leading-relaxed text-neutral-600">{t('unsaved.description')}</p>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onStay}
          disabled={busy}
          className="h-11 rounded-xl bg-primary-800 px-4 text-sm font-semibold text-white
            transition-colors hover:bg-primary-900 disabled:opacity-50"
        >
          {t('unsaved.stay')}
        </button>

        {onSaveDraft && (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={busy}
            className="h-11 rounded-xl border border-neutral-300 px-4 text-sm font-semibold text-neutral-700
              transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            {busy ? t('post.draft.saving') : t('unsaved.saveDraft')}
          </button>
        )}

        <button
          type="button"
          onClick={onDiscard}
          disabled={busy}
          className="h-11 rounded-xl px-4 text-sm font-semibold text-red-600
            transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {t('unsaved.discard')}
        </button>
      </div>
    </Modal>
  )
}
