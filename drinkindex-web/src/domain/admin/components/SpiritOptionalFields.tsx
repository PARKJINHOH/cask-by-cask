import { useState, useEffect, useRef } from 'react'
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import ProducerSelector from '@/domain/producer/components/ProducerSelector'
import AdminProducerSelector from '@/domain/producer/components/AdminProducerSelector'
import CountryRegionSelector from '@/domain/location/components/CountryRegionSelector'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import { CATEGORY_TO_PRODUCER_TYPE, PRODUCER_TYPE_LABEL } from '@/domain/producer/types/producer.types'

type FieldKey =
  | 'producerId'
  | 'countryRegion'
  | 'bottler'
  | 'bottledYear'
  | 'vintageYear'
  | 'abv'
  | 'volumeMl'

const FIELD_DEFS: Array<{ key: FieldKey; label: string; group: string }> = [
  { key: 'producerId',  label: '증류소',     group: '생산 정보' },
  { key: 'countryRegion', label: '국가 / 지역', group: '생산 정보' },
  { key: 'bottler',       label: '병입업체명',  group: '병입 정보' },
  { key: 'bottledYear',   label: '병입년도',    group: '병입 정보' },
  { key: 'vintageYear',   label: '빈티지',      group: '병입 정보' },
  { key: 'abv',           label: '도수 (%)',    group: '규격' },
  { key: 'volumeMl',      label: '용량 (ml)',   group: '규격' },
]

// 카테고리별로 숨길 선택 옵션
// 와인: vintageYear 대신 bottledYear 사용 (vintage는 wineDetail에서 관리)
// 비와인: vintageYear 불필요
const CATEGORY_HIDDEN: Partial<Record<string, FieldKey[]>> = {
  WINE:   ['bottledYear'],
  WHISKY: ['vintageYear'],
  COGNAC: ['vintageYear'],
  OTHER:  ['vintageYear'],
}

interface InitialValues {
  producerId?: number | null
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
  defaultProducerName?: string
  initialValues?: InitialValues
  dataReady?: boolean
  category?: SpiritCategory
  hiddenFields?: FieldKey[]
  /** 항상 표시되며 사용자가 제거할 수 없는 필드 */
  pinnedFields?: FieldKey[]
  /** 레이블에 * 표시할 필수 필드 */
  requiredFields?: FieldKey[]
  /** 필드별 에러 메시지 */
  fieldErrors?: Partial<Record<FieldKey, string>>
  /** 관리자 페이지에서 사용 시 true — 전체 목록 selectbox 방식으로 전환 */
  adminSelector?: boolean
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
  defaultProducerName,
  initialValues = {},
  dataReady = true,
  category,
  hiddenFields = [],
  pinnedFields = [],
  requiredFields = [],
  fieldErrors = {},
  adminSelector = false,
}: Props) {
  const producerType = category ? CATEGORY_TO_PRODUCER_TYPE[category] : undefined
  const producerLabel = producerType ? PRODUCER_TYPE_LABEL[producerType].ko : '생산자'
  const [activeFields, setActiveFields] = useState<Set<FieldKey>>(new Set())
  const [didInit, setDidInit] = useState(false)

  // 초기값 기반 활성 필드 설정
  useEffect(() => {
    if (!dataReady || didInit) return
    const active = new Set<FieldKey>()
    if (initialValues.producerId != null)            active.add('producerId')
    if (initialValues.country || initialValues.region) active.add('countryRegion')
    if (initialValues.bottler)                         active.add('bottler')
    if (initialValues.bottledYear != null)             active.add('bottledYear')
    if (initialValues.vintageYear != null)             active.add('vintageYear')
    if (initialValues.abv != null)                     active.add('abv')
    if (initialValues.volumeMl != null)                active.add('volumeMl')
    // 초기화 시점에도 pinnedFields 반영
    pinnedFields.forEach(f => active.add(f))
    setActiveFields(active)
    setDidInit(true)
  }, [dataReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // 카테고리 변경 시 해당 카테고리에서 숨겨야 할 필드를 activeFields에서 제거
  useEffect(() => {
    if (!category) return
    const toHide: FieldKey[] = CATEGORY_HIDDEN[category] ?? []
    if (toHide.length === 0) return
    setActiveFields(prev => {
      const next = new Set(prev)
      toHide.forEach(f => {
        if (next.has(f)) {
          next.delete(f)
          if (f === 'bottledYear') setValue('bottledYear', undefined)
          if (f === 'vintageYear') setValue('vintageYear', undefined)
        }
      })
      return next
    })
  }, [category]) // eslint-disable-line react-hooks/exhaustive-deps

  // pinnedFields 변경 시 activeFields 동기화
  // - 새로 pinned된 필드 → activeFields에 추가
  // - pinned 해제된 필드 → activeFields에서 제거
  const prevPinnedRef = useRef<FieldKey[]>([])
  const pinnedKey = pinnedFields.join(',')

  useEffect(() => {
    const prev = prevPinnedRef.current
    const curr = pinnedFields
    prevPinnedRef.current = curr

    setActiveFields(state => {
      const next = new Set(state)
      // 더 이상 pinned가 아닌 필드 제거
      prev.forEach(f => {
        if (!curr.includes(f)) {
          next.delete(f)
        }
      })
      // 새로 pinned된 필드 추가
      curr.forEach(f => next.add(f))
      return next
    })
  }, [pinnedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // abv 값 0~100 클램핑
  const watchedAbv = watch('abv')
  useEffect(() => {
    if (typeof watchedAbv !== 'number') return
    if (watchedAbv > 100) setValue('abv', 100)
    else if (watchedAbv < 0) setValue('abv', 0)
  }, [watchedAbv, setValue])

  const addField = (key: FieldKey) =>
    setActiveFields(prev => new Set([...prev, key]))

  const removeField = (key: FieldKey) => {
    setActiveFields(prev => { const s = new Set(prev); s.delete(key); return s })
    if (key === 'producerId')  setValue('producerId', undefined)
    if (key === 'countryRegion') { onCountryChange(null, ''); onRegionChange('') }
    if (key === 'bottler')       setValue('bottler', undefined)
    if (key === 'bottledYear')   setValue('bottledYear', undefined)
    if (key === 'vintageYear')   setValue('vintageYear', undefined)
    if (key === 'abv')           setValue('abv', undefined)
    if (key === 'volumeMl')      setValue('volumeMl', undefined)
  }

  const categoryHidden: FieldKey[] = (category && CATEGORY_HIDDEN[category]) ?? []
  const allHidden = [...hiddenFields, ...categoryHidden]
  const visibleDefs   = FIELD_DEFS.filter(f => !allHidden.includes(f.key))
  const activeList    = visibleDefs.filter(f =>  activeFields.has(f.key))
  // pinned 필드는 inactiveList(추가 피커)에서 제외
  const inactiveList  = visibleDefs.filter(f => !activeFields.has(f.key) && !pinnedFields.includes(f.key))

  const inactiveByGroup = inactiveList.reduce<Record<string, typeof FIELD_DEFS>>((acc, f) => {
    ;(acc[f.group] ??= []).push(f)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* 활성화된 옵션 필드 */}
      {activeList.map(({ key, label }) => {
        const isPinned   = pinnedFields.includes(key)
        const isRequired = requiredFields.includes(key)
        const errorMsg   = fieldErrors[key]

        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-neutral-600">
                {key === 'producerId' ? producerLabel : label}
                {isRequired && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {!isPinned && (
                <button
                  type="button"
                  onClick={() => removeField(key)}
                  className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors"
                >
                  − 제거
                </button>
              )}
            </div>

            {key === 'producerId' && (
              adminSelector ? (
                <AdminProducerSelector
                  value={watch('producerId') ?? null}
                  defaultName={defaultProducerName}
                  onChange={(id) => setValue('producerId', id ?? undefined)}
                  type={producerType}
                />
              ) : (
                <ProducerSelector
                  value={watch('producerId') ?? null}
                  defaultName={defaultProducerName}
                  onChange={(id) => setValue('producerId', id ?? undefined)}
                  type={producerType}
                />
              )
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

            {errorMsg && (
              <p className="text-xs text-red-500">{errorMsg}</p>
            )}
          </div>
        )
      })}

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
                    + {key === 'producerId' ? producerLabel : label}
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
