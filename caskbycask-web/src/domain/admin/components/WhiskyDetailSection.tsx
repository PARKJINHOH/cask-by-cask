import { useState, useEffect } from 'react'
import InfoTooltip from '@/shared/components/InfoTooltip'

export interface WhiskyDetailForm {
  style: string; styleOther: string; brandName: string; bottlingType: string
  caskTypes: string[]; caskFinishes: string[]; caskTypeOther: string
  caskDetails: Record<string, string[]>
  isNonChillFiltered: boolean; isNaturalColour: boolean
  isSingleCask: boolean; isCaskStrength: boolean; isPeated: boolean
  phenolPpm: string; phenolPpmMin: string; phenolPpmMax: string; caskNo: string; notes: string
}

export const DEFAULT_WHISKY: WhiskyDetailForm = {
  style: 'SINGLE_MALT', styleOther: '', brandName: '', bottlingType: 'OB',
  caskTypes: [], caskFinishes: [], caskTypeOther: '',
  caskDetails: {},
  isNonChillFiltered: false, isNaturalColour: false, isSingleCask: false,
  isCaskStrength: false, isPeated: false, phenolPpm: '', phenolPpmMin: '', phenolPpmMax: '', caskNo: '', notes: '',
}

interface Props { value: WhiskyDetailForm; onChange: (u: Partial<WhiskyDetailForm>) => void }

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

export const BROAD_CASK_CATEGORIES = [
  { code: 'EX_BOURBON', label: '버번 캐스크 (Bourbon Cask)', placeholder: '예) 버진 오크, 아메리칸 오크' },
  { code: 'NEW_OAK', label: '버진 오크 (Virgin Oak / New Oak)', placeholder: '예) 아메리칸 버진 오크' },
  { code: 'EX_SHERRY', label: '셰리 캐스크 (Sherry Cask)', placeholder: '예) 올로로소, PX, 피노, 만자니야' },
  { code: 'EX_PORT', label: '포트/주정강화 캐스크 (Fortified Wine Cask)', placeholder: '예) 포트, 마데이라, 소테른, 마르살라' },
  { code: 'EX_WINE', label: '와인 캐스크 (Wine Cask)', placeholder: '예) 레드 와인, 샤르도네, 비노 바리끄' },
  { code: 'EX_RUM', label: '럼 캐스크 (Rum Cask)', placeholder: '예) 다크 럼, 화이트 럼' },
  { code: 'EX_COGNAC', label: '꼬냑 캐스크 (Cognac Cask)', placeholder: '예) 그랑 상파뉴 꼬냑' },
  { code: 'EX_CALVADOS', label: '칼바도스 캐스크 (Calvados Cask)', placeholder: '예) 칼바도스' },
  { code: 'EX_BEER', label: '맥주 캐스크 (Beer Cask)', placeholder: '예) 임페리얼 스타우트, IPA' },
  { code: 'MIZUNARA', label: '미즈나라 캐스크 (Mizunara Cask)', placeholder: '예) 미즈나라' },
  { code: 'OTHER', label: '기타 캐스크 (Other Casks)', placeholder: '예) 매실주 캐스크, 피티드 캐스크' },
]

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
      {/* 캐스크 — 대분류 선택 및 세부 입력 동적 구조 */}
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
              <input type="number" min={0} max={300}
                value={value.phenolPpmMin}
                onChange={(e) => onChange({ phenolPpmMin: e.target.value })}
                placeholder="최소"
                className={INPUT}
              />
            </div>
            <span className="text-neutral-400">~</span>
            <div className="flex-1">
              <input type="number" min={0} max={300}
                value={value.phenolPpmMax}
                onChange={(e) => onChange({ phenolPpmMax: e.target.value })}
                placeholder="최대"
                className={INPUT}
              />
            </div>
          </div>
        ) : (
          <input type="number" min={0} max={300}
            value={value.phenolPpm}
            onChange={(e) => onChange({ phenolPpm: e.target.value })}
            disabled={!value.isPeated}
            placeholder="예: 55"
            className={`${INPUT} ${!value.isPeated ? 'opacity-40 cursor-not-allowed' : ''}`}
          />
        )}
      </div>

      {/* 싱글 캐스크 번호 */}
      <div>
        <label className={LABEL}>싱글 캐스크 번호</label>
        <input type="text" value={value.caskNo} maxLength={100}
          onChange={(e) => onChange({ caskNo: e.target.value })}
          placeholder="ex. 카발란 FI150504001A"
          className={INPUT} />
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
          className={`${INPUT} resize-none`} />
      </div>
    </div>
  )
}
