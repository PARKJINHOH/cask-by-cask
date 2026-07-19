import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useMyPriceAlerts, useUpsertPriceAlert, useDeletePriceAlert } from '../hooks/usePriceChart'
import { formatOptionalPriceInput, formatPriceInput, parsePriceInput } from '@/shared/utils/moneyInput'
import { RequiredMark } from '@/shared/components/FormFieldLabel'

const krw = new Intl.NumberFormat('ko-KR')

/** 같은 술·용량당 1개의 목표가 알림을 설정하는 한 줄 인라인 폼 */
export default function PriceAlertInline({ spiritId, volumeMl }: { spiritId: number; volumeMl: number | null }) {
  const { t } = useTranslation()
  const { isLoggedIn, isAuthReady } = useAuthStore()
  const { data: myAlerts } = useMyPriceAlerts()
  const upsert = useUpsertPriceAlert()
  const remove = useDeletePriceAlert()

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  const existing = myAlerts?.find((a) =>
    a.spiritId === spiritId && a.isActive && (a.volumeMl === volumeMl || a.volumeMl == null),
  )

  if (!isAuthReady) return null

  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-2 text-xs text-neutral-400 px-1 py-2">
        <span>🔔</span>
        <span>{t('price.alert.loginRequired')}</span>
      </div>
    )
  }

  if (!volumeMl) {
    return (
      <div className="flex items-center gap-2 text-xs text-neutral-400 px-1 py-2">
        <span>🔔</span>
        <span>{t('price.alert.volumeRequired')}</span>
      </div>
    )
  }

  const submit = () => {
    const price = parsePriceInput(value)
    if (!price || price <= 0) return
    upsert.mutate({ spiritId, volumeMl, targetPrice: price }, { onSuccess: () => { setEditing(false); setValue('') } })
  }

  // 설정됨 (편집 모드 아님)
  if (existing && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary-50/70 border border-primary-100 px-3 py-2 text-sm">
        <span className="text-primary-700">🔔</span>
        <span className="text-neutral-700">
          <span className="font-semibold">{volumeMl.toLocaleString()}ml · </span>
          {t('price.alert.activeNotice', { price: krw.format(existing.targetPriceKrw) })}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setEditing(true); setValue(formatPriceInput(existing.targetPriceKrw)) }}
            className="text-xs text-primary-700 hover:underline"
          >
            {t('common.edit', '수정')}
          </button>
          <button
            onClick={() => remove.mutate(existing.id)}
            className="text-xs text-neutral-400 hover:text-red-500"
          >
            {t('price.alert.off')}
          </button>
        </div>
      </div>
    )
  }

  // 미설정 또는 편집 모드 → 한 줄 입력 폼
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
      <span className="text-sm text-neutral-600 whitespace-nowrap">
        🔔 {t('price.alert.inlineLabel')} · {volumeMl.toLocaleString()}ml
        <RequiredMark />
      </span>
      <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-primary-200">
        <input
          required
          aria-required="true"
          value={value}
          onChange={(e) => setValue(formatOptionalPriceInput(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder={t('price.alert.inputPlaceholder')}
          className="w-28 px-2.5 py-1.5 text-sm focus:outline-none"
        />
        <span className="pr-2.5 text-xs text-neutral-400">원</span>
      </div>
      <button
        onClick={submit}
        disabled={upsert.isPending}
        className="px-3 py-1.5 bg-primary-700 text-white rounded-lg text-xs font-medium hover:bg-primary-800 transition-colors disabled:opacity-50"
      >
        {t('price.alert.setBtn')}
      </button>
      {editing && (
        <button onClick={() => setEditing(false)} className="text-xs text-neutral-400 hover:text-neutral-600">
          {t('common.cancel', '취소')}
        </button>
      )}
    </div>
  )
}
