import { useState, useEffect } from 'react'
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import DistillerySelector from '@/domain/distillery/components/DistillerySelector'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'

type FieldKey =
  | 'distilleryId'
  | 'countryRegion'
  | 'bottler'
  | 'bottledYear'
  | 'vintageYear'
  | 'abv'
  | 'volumeMl'

const FIELD_DEFS: Array<{ key: FieldKey; label: string; group: string }> = [
  { key: 'distilleryId',  label: '증류소',     group: '생산 정보' },
  { key: 'countryRegion', label: '국가 / 지역', group: '생산 정보' },
  { key: 'bottler',       label: '병입업체명',  group: '병입 정보' },
  { key: 'bottledYear',   label: '병입년도',    group: '병입 정보' },
  { key: 'vintageYear',   label: '빈티지',      group: '병입 정보' },
  { key: 'abv',           label: '도수 (%)',    group: '규격' },
  { key: 'volumeMl',      label: '용량 (ml)',   group: '규격' },
]

interface InitialValues {
  distilleryId?: number | null
  country?: string | null
  region?: string | null
  bottler?: string | null
  bottledYear?: number | null
  vintageYear?: number | null
  abv?: number | null
  volumeMl?: number | null
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>
  countryCode: string | null
  countryNameKo: string
  regionNameKo: string
  onCountryChange: (code: string | null, nameKo: string) => void
  onRegionChange: (nameKo: string) => void
  defaultDistilleryName?: string
  initialValues?: InitialValues
  dataReady?: boolean
}

const INPUT_CLS =
  'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'

export default function SpiritOptionalFields({
  register,
  setValue,
  watch,
  countryCode,
  countryNameKo,
  regionNameKo,
  onCountryChange,
  onRegionChange,
  defaultDistilleryName,
  initialValues = {},
  dataReady = true,
}: Props) {
  const [activeFields, setActiveFields] = useState<Set<FieldKey>>(new Set())
  const [didInit, setDidInit] = useState(false)

  useEffect(() => {
    if (!dataReady || didInit) return
    const active = new Set<FieldKey>()
    if (initialValues.distilleryId != null)            active.add('distilleryId')
    if (initialValues.country || initialValues.region) active.add('countryRegion')
    if (initialValues.bottler)                         active.add('bottler')
    if (initialValues.bottledYear != null)             active.add('bottledYear')
    if (initialValues.vintageYear != null)             active.add('vintageYear')
    if (initialValues.abv != null)                     active.add('abv')
    if (initialValues.volumeMl != null)                active.add('volumeMl')
    setActiveFields(active)
    setDidInit(true)
  }, [dataReady]) // eslint-disable-line react-hooks/exhaustive-deps

  const addField = (key: FieldKey) =>
    setActiveFields(prev => new Set([...prev, key]))

  const removeField = (key: FieldKey) => {
    setActiveFields(prev => { const s = new Set(prev); s.delete(key); return s })
    if (key === 'distilleryId')  setValue('distilleryId', undefined)
    if (key === 'countryRegion') { onCountryChange(null, ''); onRegionChange('') }
    if (key === 'bottler')       setValue('bottler', undefined)
    if (key === 'bottledYear')   setValue('bottledYear', undefined)
    if (key === 'vintageYear')   setValue('vintageYear', undefined)
    if (key === 'abv')           setValue('abv', undefined)
    if (key === 'volumeMl')      setValue('volumeMl', undefined)
  }

  const activeList  = FIELD_DEFS.filter(f =>  activeFields.has(f.key))
  const inactiveList = FIELD_DEFS.filter(f => !activeFields.has(f.key))

  const inactiveByGroup = inactiveList.reduce<Record<string, typeof FIELD_DEFS>>((acc, f) => {
    ;(acc[f.group] ??= []).push(f)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* 활성화된 옵션 필드 */}
      {activeList.map(({ key, label }) => (
        <div key={key} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-neutral-600">{label}</label>
            <button
              type="button"
              onClick={() => removeField(key)}
              className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors"
            >
              − 제거
            </button>
          </div>

          {key === 'distilleryId' && (
            <DistillerySelector
              value={watch('distilleryId') ?? null}
              defaultName={defaultDistilleryName}
              onChange={(id) => setValue('distilleryId', id ?? undefined)}
            />
          )}

          {key === 'countryRegion' && (
            <>
              <CountryRegionSelector
                countryCode={countryCode}
                regionNameKo={regionNameKo}
                onCountryChange={onCountryChange}
                onRegionChange={onRegionChange}
              />
              {(countryNameKo || regionNameKo) && countryCode === null && (
                <p className="text-xs text-neutral-400">
                  현재 값: {[countryNameKo, regionNameKo].filter(Boolean).join(' / ')}
                </p>
              )}
            </>
          )}

          {key === 'bottler' && (
            <input {...register('bottler')} className={INPUT_CLS} />
          )}

          {key === 'bottledYear' && (
            <input
              type="number" step="1" min="1800" max="2100"
              {...register('bottledYear', { valueAsNumber: true })}
              className={INPUT_CLS}
            />
          )}

          {key === 'vintageYear' && (
            <input
              type="number" step="1" min="1800" max="2100"
              {...register('vintageYear', { valueAsNumber: true })}
              className={INPUT_CLS}
            />
          )}

          {key === 'abv' && (
            <input
              type="number" step="0.1" min="0" max="100"
              {...register('abv', { valueAsNumber: true })}
              className={INPUT_CLS}
            />
          )}

          {key === 'volumeMl' && (
            <input
              type="number" step="1" min="1"
              {...register('volumeMl', { valueAsNumber: true })}
              className={INPUT_CLS}
            />
          )}
        </div>
      ))}

      {/* 비활성 필드 추가 피커 */}
      {inactiveList.length > 0 && (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-4 space-y-3">
          <p className="text-[11px] font-semibold text-neutral-400 tracking-wide">옵션 추가</p>
          {Object.entries(inactiveByGroup).map(([group, fields]) => (
            <div key={group} className="space-y-1.5">
              <p className="text-[11px] text-neutral-400">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {fields.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => addField(key)}
                    className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full
                      text-xs font-medium border border-neutral-200 bg-white text-neutral-600
                      hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700
                      transition-colors"
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
