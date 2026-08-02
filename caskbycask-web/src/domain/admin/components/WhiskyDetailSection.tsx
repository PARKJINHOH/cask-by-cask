import { useState, useEffect } from 'react'
import InfoTooltip from '@/shared/components/InfoTooltip'
import { BROAD_CASK_CATEGORIES } from '@/domain/spirit/data/whisky'

export interface WhiskyDetailForm {
  style: string; styleOther: string; brandName: string; bottlingType: string
  caskTypes: string[]; caskFinishes: string[]; caskTypeOther: string
  caskDetails: Record<string, string[]>
  isNonChillFiltered: boolean; isNaturalColour: boolean
  isSingleCask: boolean; isCaskStrength: boolean; isPeated: boolean
  phenolPpm: string; phenolPpmMin: string; phenolPpmMax: string; notes: string
}

export const DEFAULT_WHISKY: WhiskyDetailForm = {
  style: 'SINGLE_MALT', styleOther: '', brandName: '', bottlingType: 'OB',
  caskTypes: [], caskFinishes: [], caskTypeOther: '',
  caskDetails: {},
  isNonChillFiltered: false, isNaturalColour: false, isSingleCask: false,
  isCaskStrength: false, isPeated: false, phenolPpm: '', phenolPpmMin: '', phenolPpmMax: '', notes: '',
}

interface Props { value: WhiskyDetailForm; onChange: (u: Partial<WhiskyDetailForm>) => void }

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

// 목록의 단일 소스는 domain/spirit/data/whisky.ts — 기존 import 경로 유지를 위해 재export 한다
export { BROAD_CASK_CATEGORIES } from '@/domain/spirit/data/whisky'

/**
 * 캐스크 입력 — 관리자 등록/수정 화면에서 **독립 컬럼**으로 배치한다.
 *
 * <p>캐스크는 대분류 11종 각각에 세부 오크통 명칭을 여러 개 넣을 수 있어 세로로 매우 길다.
 * PC 에서 다른 항목과 같은 컬럼에 두면 스크롤이 과해지므로 3열 레이아웃의 한 컬럼을 통째로 쓴다.
 * 마스터와 하위 에디션이 같은 컴포넌트를 공유한다.
 */
export function WhiskyCaskSection({ value, onChange }: Props) {
  return (
    <div>
      <label className={LABEL}>
        캐스크
        <InfoTooltip text="이 위스키에 사용된 캐스크 대분류를 체크하고, 아래에 구체적인 세부 오크통 명칭을 적어주세요. + 버튼을 눌러 여러 개를 등록할 수 있습니다. 피니시(추가 숙성) 캐스크는 우측 피니시를 체크해주세요." />
      </label>
      <div className="space-y-3">
        {BROAD_CASK_CATEGORIES.map(({ code, label, placeholder }) => {
          const isChecked = value.caskTypes.includes(code)
          const isFinish = value.caskFinishes.includes(code)
          const details = value.caskDetails?.[code] || []

          const handleToggle = (checked: boolean) => {
            const newCaskTypes = checked
              ? [...value.caskTypes, code]
              : value.caskTypes.filter((c) => c !== code)

            const newCaskFinishes = checked
              ? value.caskFinishes
              : value.caskFinishes.filter((c) => c !== code)

            const newCaskDetails = { ...value.caskDetails }
            if (checked) {
              if (!newCaskDetails[code] || newCaskDetails[code].length === 0) {
                newCaskDetails[code] = ['']
              }
            } else {
              delete newCaskDetails[code]
            }

            onChange({ caskTypes: newCaskTypes, caskFinishes: newCaskFinishes, caskDetails: newCaskDetails })
          }

          const handleToggleFinish = (checked: boolean) => {
            const newCaskFinishes = checked
              ? [...value.caskFinishes, code]
              : value.caskFinishes.filter((c) => c !== code)
            onChange({ caskFinishes: newCaskFinishes })
          }

          const handleAddDetail = () => {
            const newDetails = [...details, '']
            onChange({
              caskDetails: {
                ...value.caskDetails,
                [code]: newDetails
              }
            })
          }

          const handleUpdateDetail = (idx: number, val: string) => {
            const newDetails = [...details]
            newDetails[idx] = val
            onChange({
              caskDetails: {
                ...value.caskDetails,
                [code]: newDetails
              }
            })
          }

          const handleRemoveDetail = (idx: number) => {
            const newDetails = details.filter((_, i) => i !== idx)
            onChange({
              caskDetails: {
                ...value.caskDetails,
                [code]: newDetails.length > 0 ? newDetails : ['']
              }
            })
          }

          return (
            <div key={code} className={`rounded-xl border transition-all p-3.5 space-y-3 ${
              isChecked
                ? 'border-amber-200 bg-amber-50/20 shadow-sm'
                : 'border-neutral-200 bg-neutral-50/40'
            }`}>
              {/* 대분류 헤더 영역 */}
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold select-none min-w-0 text-neutral-800">
                  <input type="checkbox" checked={isChecked}
                    onChange={(e) => handleToggle(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 border-neutral-300 focus:ring-amber-500 accent-amber-500 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </label>

                <label className={`flex items-center gap-1.5 text-xs font-medium flex-shrink-0 select-none transition-all ${
                  isChecked ? 'cursor-pointer text-amber-700' : 'opacity-30 cursor-not-allowed text-neutral-400'}`}>
                  <input type="checkbox" disabled={!isChecked}
                    checked={isFinish}
                    onChange={(e) => handleToggleFinish(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-500 border-neutral-300 focus:ring-amber-500 accent-amber-500" />
                  피니시
                </label>
              </div>

              {/* 세부 오크통 동적 입력 (체크 시 활성화) */}
              {isChecked && (
                <div className="pl-6 bg-amber-50/10 rounded-lg p-2 border-l border-amber-200/60 ml-2 space-y-2">
                  <p className="text-[11px] text-amber-600/80 font-medium">세부 오크통 종류 명칭</p>
                  <div className="space-y-2">
                    {details.map((detailVal, idx) => (
                      <div key={idx} className="flex items-center gap-2 w-full">
                        <input type="text" value={detailVal} maxLength={100}
                          onChange={(e) => handleUpdateDetail(idx, e.target.value)}
                          placeholder={placeholder}
                          className={`${INPUT} flex-grow min-w-0`} />

                        <button type="button" onClick={() => handleRemoveDetail(idx)}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 rounded-lg flex-shrink-0 transition-colors"
                          title="삭제">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={handleAddDetail}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    추가
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function WhiskyDetailSection({ value, onChange }: Props) {
  const [isPhenolRange, setIsPhenolRange] = useState(false)

  useEffect(() => {
    if (value.phenolPpmMin !== '' || value.phenolPpmMax !== '') {
      setIsPhenolRange(true)
    } else {
      setIsPhenolRange(false)
    }
  }, [value.phenolPpmMin, value.phenolPpmMax])

  const handleRangeToggle = (checked: boolean) => {
    setIsPhenolRange(checked)
    if (!checked) {
      onChange({ phenolPpmMin: '', phenolPpmMax: '' })
    } else {
      onChange({ phenolPpm: '' })
    }
  }

  return (
    <div className="space-y-5">
      {/* 다른 카테고리(와인·꼬냑·기타)와 같은 구분 표시 — 필수 항목(스타일)은 좌측 기본 정보에 있다 */}
      <p className="text-xs font-semibold text-neutral-500">선택 정보</p>

      {/* 특성 체크박스 */}
      <div>
        <label className={LABEL}>특성</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            ['isNonChillFiltered', 'Non-Chill Filtered (저온 여과 생략)'],
            ['isNaturalColour', 'Natural Colour (캐러멜 색소 무첨가)'],
            ['isSingleCask', 'Single Cask (단일 캐스크)'],
            ['isCaskStrength', 'Cask Strength (원액 그대로)'],
            ['isPeated', 'Peated (피트 사용)'],
          ] as [keyof WhiskyDetailForm, string][]).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer text-sm select-none">
              <input type="checkbox" checked={!!value[k]}
                onChange={(e) => onChange({ [k]: e.target.checked } as Partial<WhiskyDetailForm>)}
                className="w-4 h-4 accent-amber-500" />
              {l}
            </label>
          ))}
        </div>
      </div>

      {/* 피트 강도 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={`${LABEL} mb-0 ${!value.isPeated ? 'opacity-40' : ''}`}>피트 강도 (ppm)</label>
          {value.isPeated && (
            <label className="flex items-center gap-1 text-[11px] text-neutral-500 cursor-pointer select-none">
              <input type="checkbox" checked={isPhenolRange} onChange={(e) => handleRangeToggle(e.target.checked)} className="accent-amber-500 rounded" />
              범위 지정
            </label>
          )}
        </div>
        {isPhenolRange && value.isPeated ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input type="number" min={0} max={999} step="any"
                value={value.phenolPpmMin}
                onChange={(e) => onChange({ phenolPpmMin: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="최소"
                className={INPUT}
              />
            </div>
            <span className="text-neutral-400">~</span>
            <div className="flex-1">
              <input type="number" min={0} max={999} step="any"
                value={value.phenolPpmMax}
                onChange={(e) => onChange({ phenolPpmMax: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="최대"
                className={INPUT}
              />
            </div>
          </div>
        ) : (
          <input type="number" min={0} max={999} step="any"
            value={value.phenolPpm}
            onChange={(e) => onChange({ phenolPpm: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            disabled={!value.isPeated}
            placeholder="예: 55"
            className={`${INPUT} ${!value.isPeated ? 'opacity-40 cursor-not-allowed' : ''}`}
          />
        )}
      </div>

      {/* 기타 정보 (참고용 자유 입력) */}
      <div>
        <label className={LABEL}>
          기타 정보
          <InfoTooltip text="출시 정보·캐스크 비율 등 참고용 메모. 예) 2021~2022 출시 제품, PX 50% 포트 20%" />
        </label>
        <textarea value={value.notes} maxLength={500} rows={2}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="예) 2021~2022 출시 제품, PX 50% 포트 20%"
          className={`${INPUT} resize`} />
      </div>
    </div>
  )
}
