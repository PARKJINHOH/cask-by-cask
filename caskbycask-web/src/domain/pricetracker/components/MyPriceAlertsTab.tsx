import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/shared/components/Spinner'
import EmptyState from '@/shared/components/EmptyState'
import { useMyPriceAlerts, useDeletePriceAlert, useTogglePriceAlert } from '../hooks/usePriceChart'

const krw = new Intl.NumberFormat('ko-KR')

export default function MyPriceAlertsTab() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const { data: alerts, isLoading } = useMyPriceAlerts()
  const toggle = useTogglePriceAlert()
  const del = useDeletePriceAlert()

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!alerts || alerts.length === 0) {
    return (
      <EmptyState
        title={t('price.alert.noAlerts')}
        description={t('price.alert.noAlertsDesc')}
        className="border border-neutral-200 rounded-2xl bg-white"
      />
    )
  }

  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <li key={a.id} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Link to={`/price-tracker/spirits/${a.spiritId}`} className="font-semibold text-neutral-900 truncate hover:text-primary-700 block">
              {isEn ? a.spiritNameEn || a.spiritNameKo : a.spiritNameKo}
            </Link>
            <p className="text-xs text-neutral-500 mt-0.5">
              <span className="font-medium">
                {a.volumeMl == null ? t('price.volume.legacyAll') : `${a.volumeMl.toLocaleString()}ml`}
                {' · '}
              </span>
              {t('price.alert.activeNotice', { price: krw.format(a.targetPriceKrw) })}
              {a.lastNotifiedAt && <span className="ml-2 text-amber-600">🎯 {t('price.alert.triggered')}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => toggle.mutate(a.id)}
              className={`text-xs font-medium ${a.isActive ? 'text-primary-700' : 'text-neutral-400'}`}
            >
              {a.isActive ? t('price.alert.on') : t('price.alert.off')}
            </button>
            <button onClick={() => del.mutate(a.id)} className="text-xs text-neutral-400 hover:text-red-500">
              {t('common.delete', '삭제')}
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
