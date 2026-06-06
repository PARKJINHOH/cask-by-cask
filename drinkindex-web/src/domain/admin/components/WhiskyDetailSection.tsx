import InfoTooltip from '@/shared/components/InfoTooltip'

export interface WhiskyDetailForm {
  style: string; styleOther: string; bottlingType: string; caskType: string
  maturationStyle: string; finishCaskType: string
  isNonChillFiltered: boolean; isNaturalColour: boolean
  isSingleCask: boolean; isCaskStrength: boolean; isPeated: boolean
  phenolPpm: string; caskNo: string; finishCaskDetail: string
}

export const DEFAULT_WHISKY: WhiskyDetailForm = {
  style: '', styleOther: '', bottlingType: '', caskType: '', maturationStyle: '', finishCaskType: '',
  isNonChillFiltered: false, isNaturalColour: false, isSingleCask: false,
  isCaskStrength: false, isPeated: false, phenolPpm: '', caskNo: '', finishCaskDetail: '',
}

interface Props { value: WhiskyDetailForm; onChange: (u: Partial<WhiskyDetailForm>) => void; errors?: Record<string, string> }

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'
const SEL = `${INPUT}`
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

const WHISKY_STYLES = [
  ['SINGLE_MALT','싱글 몰트'],['BLENDED_MALT','블렌디드 몰트'],['BLENDED_WHISKY','블렌디드 위스키'],
  ['BOURBON','버번'],['RYE','라이'],['CORN','콘'],['GRAIN','그레인'],['POT_STILL','팟 스틸'],['OTHER','기타'],
]
const CASK_TYPES = [
  ['EX_BOURBON','버번 캐스크'],['EX_SHERRY','셰리 캐스크'],['EX_PORT','포트 캐스크'],
  ['EX_WINE','와인 캐스크'],['NEW_OAK','뉴 오크'],['EX_RUM','럼 캐스크'],
  ['EX_MADEIRA','마데이라 캐스크'],['EX_SAUTERNES','소테른 캐스크'],
  ['EX_COGNAC','꼬냑 캐스크'],['MIZUNARA','미즈나라'],['OTHER','기타'],
]

export default function WhiskyDetailSection({ value, onChange, errors }: Props) {
  const isFinish = value.maturationStyle === 'FINISH'

  return (
    <div className="space-y-5">
      {/* 필수 정보 — 스타일 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
        <p className="text-xs font-semibold text-amber-700">필수 정보</p>
        <div>
          <label className={LABEL}>스타일 <span className="text-red-400">*</span></label>
          <div className="flex flex-wrap gap-2">
            {WHISKY_STYLES.map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5 cursor-pointer text-sm select-none">
                <input type="radio" value={v} checked={value.style === v}
                  onChange={() => onChange({ style: v })} className="accent-amber-500" />
                {l}
              </label>
            ))}
          </div>
          {errors?.style && <p className="text-xs text-red-500 mt-1">{errors.style}</p>}
          {/* '기타' 선택 시 직접 입력 */}
          {value.style === 'OTHER' && (
            <div className="mt-2">
              <input type="text" value={value.styleOther} maxLength={100}
                onChange={(e) => onChange({ styleOther: e.target.value })}
                placeholder="예) 라이트 위스키, 싱글 그레인 등"
                className={`${INPUT} ${errors?.styleOther ? 'border-red-400' : ''}`} />
              {errors?.styleOther && <p className="text-xs text-red-500 mt-1">{errors.styleOther}</p>}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs font-semibold text-neutral-500">선택 정보</p>

      {/* 병입 구분 */}
      <div>
        <label className={LABEL}>
          병입 구분
          <InfoTooltip text="OB(Official Bottling): 증류소 직접 병입 / IB(Independent Bottling): 독립 병입사 병입" />
        </label>
        <div className="flex gap-4">
          {[['OB', 'OB (증류소 직접)'], ['IB', 'IB (독립 병입)']].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" value={v} checked={value.bottlingType === v}
                onChange={() => onChange({ bottlingType: v })} className="accent-amber-500" />
              {l}
            </label>
          ))}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-400">
            <input type="radio" value="" checked={!value.bottlingType}
              onChange={() => onChange({ bottlingType: '' })} className="accent-amber-500" />
            미지정
          </label>
        </div>
      </div>

      {/* 숙성 방식 — 단일/추가(피니시) 명확화 */}
      <div>
        <label className={LABEL}>
          숙성 방식
          <InfoTooltip text="단일 숙성: 처음부터 한 종류의 캐스크에서 숙성 / 추가 숙성(피니시): 주 숙성 후 다른 캐스크로 옮겨 마무리" />
        </label>
        <div className="flex gap-4">
          {[['FULL_MATURATION','단일 숙성'],['FINISH','추가 숙성 (피니시)']].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" value={v} checked={value.maturationStyle === v}
                onChange={() => onChange({ maturationStyle: v })} className="accent-amber-500" />
              {l}
            </label>
          ))}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-400">
            <input type="radio" value="" checked={!value.maturationStyle}
              onChange={() => onChange({ maturationStyle: '' })} className="accent-amber-500" />
            미지정
          </label>
        </div>
      </div>

      {/* 주 캐스크 */}
      <div>
        <label className={LABEL}>주 캐스크</label>
        <select value={value.caskType} onChange={(e) => onChange({ caskType: e.target.value })} className={SEL}>
          <option value="">선택 안 함</option>
          {CASK_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* 피니시 캐스크 — 추가 숙성 선택 시에만 노출 */}
      {isFinish && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 space-y-3">
          <p className="text-xs font-semibold text-neutral-600">피니시(추가 숙성) 정보</p>
          <div>
            <label className={LABEL}>피니시 캐스크</label>
            <select value={value.finishCaskType} onChange={(e) => onChange({ finishCaskType: e.target.value })} className={SEL}>
              <option value="">선택 안 함</option>
              {CASK_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {/* '기타' 선택 시에만 직접 입력 (중복 설명 필드 통합) */}
          {value.finishCaskType === 'OTHER' && (
            <div>
              <label className={LABEL}>피니시 캐스크 직접 입력</label>
              <input type="text" value={value.finishCaskDetail} maxLength={200}
                onChange={(e) => onChange({ finishCaskDetail: e.target.value })}
                placeholder="예) 토카이 캐스크"
                className={INPUT} />
            </div>
          )}
        </div>
      )}

      {/* 플래그 체크박스 */}
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
        <label className={`${LABEL} ${!value.isPeated ? 'opacity-40' : ''}`}>피트 강도 (ppm)</label>
        <input type="number" min={0} max={300}
          value={value.phenolPpm}
          onChange={(e) => onChange({ phenolPpm: e.target.value })}
          disabled={!value.isPeated}
          placeholder="예: 55"
          className={`${INPUT} ${!value.isPeated ? 'opacity-40 cursor-not-allowed' : ''}`}
        />
      </div>

      {/* 싱글 캐스크 번호 */}
      <div>
        <label className={LABEL}>싱글 캐스크 번호</label>
        <input type="text" value={value.caskNo} maxLength={100}
          onChange={(e) => onChange({ caskNo: e.target.value })} className={INPUT} />
      </div>
    </div>
  )
}
