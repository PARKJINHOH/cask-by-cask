import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useMyPriceAlerts } from '../hooks/usePriceChart'
import type { PriceAlertResponse } from '../types/pricetracker.types'

const krw = new Intl.NumberFormat('ko-KR')
const DISMISS_KEY = 'di_price_alert_dismissed'
// 최근 7일 내 발동된 알림만 배너로 노출
const RECENT_MS = 7 * 24 * 60 * 60 * 1000

function loadDismissed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/**
 * PRICE_ALERT 전용 배너 (일반 알림함과 분리, 가격 트래커/술 상세 가격탭 상단).
 * spiritId 지정 시 해당 술만, 미지정 시 전체 발동 알림을 노출.
 */
export default function PriceAlertBanner({ spiritId }: { spiritId?: number }) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const { isLoggedIn, isAuthReady } = useAuthStore()
  const { data: alerts } = useMyPriceAlerts()
  const [dismissed, setDismissed] = useState<Record<string, boolean>>(loadDismissed)

  if (!isAuthReady || !isLoggedIn || !alerts) return null

  const key = (a: PriceAlertResponse) => `${a.id}:${a.lastNotifiedAt}`

  const triggered = alerts.filter((a) => {
    if (!a.lastNotifiedAt) return false
    if (spiritId && a.spiritId !== spiritId) return false
    if (Date.now() - new Date(a.lastNotifiedAt).getTime() > RECENT_MS) return false
    return !dismissed[key(a)]
  })

  if (triggered.length === 0) return null

  const dismiss = (a: PriceAlertResponse) => {
    const next = { ...dismissed, [key(a)]: true }
    setDismissed(next)
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
  }

  return (
    <div className="space-y-2 mb-4">
      {triggered.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm"
        >
          <span className="text-base">🎯</span>
          <p className="text-amber-900 min-w-0 truncate">
            <span className="font-semibold">{t('price.alert.bannerTitle')}</span>{' '}
            <span className="font-medium">{isEn ? a.spiritNameEn || a.spiritNameKo : a.spiritNameKo}</span>
            {' — '}
            {t('price.alert.bannerTarget', { price: krw.format(a.targetPriceKrw) })}
          </p>
          <button
            onClick={() => dismiss(a)}
            className="ml-auto shrink-0 text-amber-400 hover:text-amber-700 text-lg leading-none"
            aria-label={t('common.close', '닫기')}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
