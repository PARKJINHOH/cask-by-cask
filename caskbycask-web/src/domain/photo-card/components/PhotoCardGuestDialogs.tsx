import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useTranslation } from 'react-i18next'

/** 비회원이 눌렀을 때 로그인이 필요한 동작 — 안내 문구가 조금씩 다르다. */
export type GuestGate = 'cleanDownload' | 'publish' | 'template' | 'draft'

interface GateProps {
  gate: GuestGate | null
  /** 임시저장이 진행 중이면 버튼을 잠근다 — 사진이 크면 몇 초 걸린다. */
  busy: boolean
  onClose: () => void
  onContinue: (target: 'login' | 'signup') => void
}

const GATE_BODY_KEYS: Record<GuestGate, string> = {
  cleanDownload: 'photoCard.guestGateCleanDownload',
  publish: 'photoCard.guestGatePublish',
  template: 'photoCard.guestGateTemplate',
  draft: 'photoCard.guestGateDraft',
}

const buttonClass = 'w-full rounded-lg px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50'

/**
 * 「로고 없이 저장」·「갤러리에 올리기」·「내 템플릿으로 저장」을 비회원이 눌렀을 때.
 *
 * 그냥 막으면 여기까지 만든 카드가 아깝고, 로그인으로 바로 보내면 편집하던 것이 날아간다.
 * 지금 작업을 브라우저에 맡겨 두고 다녀오도록 안내한다.
 */
export function PhotoCardGuestGateDialog({ gate, busy, onClose, onContinue }: GateProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={gate !== null} onClose={busy ? () => {} : onClose} className="relative z-50">
      <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-neutral-200 px-5 py-4">
            <DialogTitle className="text-base font-bold text-neutral-900">
              {t('photoCard.guestGateTitle')}
            </DialogTitle>
          </div>

          <div className="space-y-2 px-5 py-4">
            <p className="text-sm leading-relaxed text-neutral-700">
              {gate ? t(GATE_BODY_KEYS[gate]) : ''}
            </p>
            <p className="text-[13px] leading-relaxed text-neutral-500">
              {t('photoCard.guestGateDraftHint')}
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-neutral-200 px-5 py-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => onContinue('login')}
              className={`${buttonClass} bg-primary-600 text-white hover:bg-primary-700`}
            >
              {busy ? t('photoCard.draftSaving') : t('photoCard.guestGateLogin')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onContinue('signup')}
              className={`${buttonClass} border border-neutral-300 text-neutral-700 hover:bg-neutral-50`}
            >
              {t('photoCard.guestGateSignup')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className={`${buttonClass} text-neutral-500 hover:bg-neutral-100`}
            >
              {t('common.cancel')}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

interface ResumeProps {
  /** 임시저장이 있으면 그 시각(ms). 없으면 null */
  savedAt: number | null
  busy: boolean
  onResume: () => void
  onDiscard: () => void
}

/**
 * 임시저장해 둔 작업이 남아 있을 때 — 페이지에 들어오면 물어본다.
 *
 * 말없이 되살리면 "새로 만들려고 들어왔는데 웬 카드가 떠 있는" 상황이 되고,
 * 말없이 버리면 로그인하고 돌아온 사람의 작업이 사라진다. 그래서 고르게 한다.
 */
export function PhotoCardDraftResumeDialog({ savedAt, busy, onResume, onDiscard }: ResumeProps) {
  const { t, i18n } = useTranslation()
  const when = savedAt
    ? new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'ko-KR', {
      dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date(savedAt))
    : ''

  return (
    <Dialog open={savedAt !== null} onClose={() => {}} className="relative z-50">
      <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-neutral-200 px-5 py-4">
            <DialogTitle className="text-base font-bold text-neutral-900">
              {t('photoCard.draftFoundTitle')}
            </DialogTitle>
          </div>

          <div className="space-y-2 px-5 py-4">
            <p className="text-sm leading-relaxed text-neutral-700">{t('photoCard.draftFoundBody')}</p>
            <p className="text-[13px] text-neutral-500">{t('photoCard.draftSavedAt', { when })}</p>
          </div>

          <div className="flex flex-col gap-2 border-t border-neutral-200 px-5 py-4">
            <button
              type="button"
              disabled={busy}
              onClick={onResume}
              className={`${buttonClass} bg-primary-600 text-white hover:bg-primary-700`}
            >
              {busy ? t('photoCard.draftRestoring') : t('photoCard.draftResume')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDiscard}
              className={`${buttonClass} text-neutral-500 hover:bg-neutral-100`}
            >
              {t('photoCard.draftDiscard')}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
