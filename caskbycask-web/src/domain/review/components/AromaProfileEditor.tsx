import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/shared/components/Modal'
import type { AromaNotes } from '../utils/aroma'
import { aromaRefKey, aromaRefs, buildProfile } from '../utils/aroma'
import type { AromaProfile, AromaProfilePhase } from '../types/review.types'
import { intensityKey } from './AromaProfileChartPanel'

const AromaRadarChart = lazy(() => import('./AromaRadarChart'))

interface Props {
  open: boolean
  phase: AromaProfilePhase
  aromaNotes: AromaNotes
  profile?: AromaProfile
  onClose: () => void
  onSave: (profile: AromaProfile | null) => void
}

export default function AromaProfileEditor({
  open,
  phase,
  aromaNotes,
  profile,
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation()
  const refs = useMemo(() => aromaRefs(aromaNotes), [aromaNotes])
  const [step, setStep] = useState<'select' | 'intensity'>('intensity')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [intensities, setIntensities] = useState<Record<string, number | undefined>>({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!open) return
    const existingKeys = profile?.items.map(aromaRefKey) ?? []
    const initialKeys = existingKeys.length > 0
      ? existingKeys
      : refs.length <= 8
        ? refs.map(aromaRefKey)
        : []
    setSelectedKeys(initialKeys)
    setIntensities(Object.fromEntries(profile?.items.map((item) => [aromaRefKey(item), item.intensity]) ?? []))
    setStep(refs.length > 8 ? 'select' : 'intensity')
    setDirty(false)
  }, [open, profile, refs])

  const selectedRefs = refs.filter((ref) => selectedKeys.includes(aromaRefKey(ref)))
  const chartItems = selectedRefs.map((ref) => ({
    ...ref,
    intensity: intensities[aromaRefKey(ref)] ?? 0,
  }))
  const completeCount = selectedRefs.filter((ref) => intensities[aromaRefKey(ref)] != null).length
  const canContinue = selectedRefs.length >= 3 && selectedRefs.length <= 8
  const canSave = canContinue && completeCount === selectedRefs.length

  const closeSafely = () => {
    if (dirty && !window.confirm(t('review.aromaProfile.discardConfirm'))) return
    onClose()
  }

  const toggleAxis = (key: string) => {
    setDirty(true)
    setSelectedKeys((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : current.length < 8
        ? [...current, key]
        : current)
  }

  return (
    <Modal
      open={open}
      onClose={closeSafely}
      title={t('review.aromaProfile.modalTitle', {
        phase: t(`review.aromaProfile.phase.${phase}`),
      })}
      size="lg"
    >
      <div className="max-h-[75dvh] space-y-4 overflow-y-auto pr-1">
        {step === 'select' ? (
          <>
            <div>
              <p className="text-sm font-semibold text-neutral-800">{t('review.aromaProfile.selectAxesTitle')}</p>
              <p className="mt-1 text-xs text-neutral-500">{t('review.aromaProfile.selectAxesHelp')}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {refs.map((ref) => {
                const key = aromaRefKey(ref)
                const selected = selectedKeys.includes(key)
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                      selected ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-neutral-200 bg-white text-neutral-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!selected && selectedKeys.length >= 8}
                      onChange={() => toggleAxis(key)}
                      className="accent-amber-600"
                    />
                    <span>{ref.labelSnapshot}</span>
                  </label>
                )
              })}
            </div>
            <p className="text-right text-xs font-semibold text-neutral-500">
              {t('review.aromaProfile.axisCount', { count: selectedRefs.length })}
            </p>
            <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
              <button type="button" onClick={closeSafely} className="rounded-lg px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep('intensity')}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('common.next')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-600">{t('review.aromaProfile.intensityHelp')}</p>
            <div className="space-y-2">
              {selectedRefs.map((ref) => {
                const key = aromaRefKey(ref)
                return (
                  <fieldset key={key} className="rounded-xl border border-neutral-200 p-3">
                    <legend className="px-1 text-sm font-bold text-neutral-800">{ref.labelSnapshot}</legend>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-label={t('review.aromaProfile.itemValue', {
                            aroma: ref.labelSnapshot,
                            intensity: value,
                            label: t(`review.aromaProfile.intensity.${intensityKey(value)}`),
                          })}
                          aria-pressed={intensities[key] === value}
                          onClick={() => {
                            setDirty(true)
                            setIntensities((current) => ({ ...current, [key]: value }))
                          }}
                          className={`rounded-lg py-2 text-sm font-bold transition ${
                            intensities[key] === value
                              ? 'bg-amber-500 text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-amber-100'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )
              })}
            </div>

            <Suspense fallback={<div className="h-[240px] animate-pulse rounded-xl bg-amber-50" />}>
              <AromaRadarChart items={chartItems} height={240} />
            </Suspense>
            <p className="text-right text-xs font-semibold text-neutral-500">
              {t('review.aromaProfile.progress', { complete: completeCount, total: selectedRefs.length })}
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 pt-3">
              {profile && (
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(t('review.aromaProfile.deleteConfirm', {
                      phase: t(`review.aromaProfile.phase.${phase}`),
                    }))) return
                    onSave(null)
                    onClose()
                  }}
                  className="mr-auto rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  {t('review.aromaProfile.delete')}
                </button>
              )}
              {refs.length > 8 && (
                <button type="button" onClick={() => setStep('select')} className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100">
                  {t('review.aromaProfile.changeAxes')}
                </button>
              )}
              <button type="button" onClick={closeSafely} className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={() => {
                  onSave(buildProfile(phase, selectedRefs, intensities))
                  onClose()
                }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('review.aromaProfile.save')}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
