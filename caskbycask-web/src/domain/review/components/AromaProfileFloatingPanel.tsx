import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { AromaProfile } from '../types/review.types'
import AromaProfileChartPanel from './AromaProfileChartPanel'

/**
 * 모바일 전용 — 아로마 프로파일을 화면 위쪽에 띄워 두고 스크롤을 따라다니게 한다.
 *
 * 리뷰 카드마다 하나씩 달리므로 여러 개가 동시에 뜨면 같은 자리에서 겹친다.
 * 새로 열린 패널이 직전 패널을 닫도록 "지금 떠 있는 것" 하나만 모듈 스코프에 기억한다.
 */
let closeCurrent: (() => void) | null = null

interface Props {
  open: boolean
  profiles: AromaProfile[]
  id: string
  /** 패널 머리글. 비우면 "아로마 프로파일". */
  title?: string
  onClose: () => void
}

export default function AromaProfileFloatingPanel({ open, profiles, id, title, onClose }: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    if (closeCurrent && closeCurrent !== onClose) closeCurrent()
    closeCurrent = onClose

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (closeCurrent === onClose) closeCurrent = null
    }
  }, [open, onClose])

  if (!open || profiles.length === 0) return null

  return (
    <div
      id={id}
      role="region"
      aria-label={title ?? t('review.aromaProfile.title')}
      // 헤더+GNB 높이(--di-chrome-top, MainLayout 의 useChromeTop 이 채운다) 바로 아래에 붙인다.
      // marginTop 은 감싼 쪽의 space-y-* 가 얹는 여백을 지운다 — fixed 라도 top 기준에서 그만큼 밀린다.
      style={{ top: 'calc(var(--di-chrome-top, 0px) + 0.75rem)', marginTop: 0 }}
      className="fixed inset-x-3 z-40 md:hidden"
    >
      <div className="overflow-hidden rounded-2xl border border-amber-300 bg-white/95 shadow-[0_16px_40px_-12px_rgba(17,24,39,0.45)] backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
          <p className="min-w-0 truncate text-xs font-bold text-neutral-700">
            {title ?? t('review.aromaProfile.title')}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="px-2 pb-2 pt-1.5">
          <AromaProfileChartPanel profiles={profiles} compact />
        </div>
      </div>
    </div>
  )
}
