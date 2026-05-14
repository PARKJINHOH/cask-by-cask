import type { ReactNode } from 'react'
import InfoTooltip from '@/shared/components/InfoTooltip'

export interface WhiskyDetailForm {
  style: string; bottlingType: string; caskType: string
  maturationStyle: string; finishCaskType: string
  isNonChillFiltered: boolean; isNaturalColour: boolean
  isSingleCask: boolean; isCaskStrength: boolean; isPeated: boolean
  phenolPpm: string; caskNo: string; finishCaskDetail: string
}

export const DEFAULT_WHISKY: WhiskyDetailForm = {
  style: '', bottlingType: '', caskType: '', maturationStyle: '', finishCaskType: '',
  isNonChillFiltered: false, isNaturalColour: false, isSingleCask: false,
  isCaskStrength: false, isPeated: false, phenolPpm: '', caskNo: '', finishCaskDetail: '',
}

interface Props { value: WhiskyDetailForm; onChange: (u: Partial<WhiskyDetailForm>) => void; bottlingSlot?: ReactNode; countrySlot?: ReactNode }

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'
const SEL = `${INPUT}`
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

const WHISKY_STYLES = [
  ['SINGLE_MALT','싱글 몰트'],['BLENDED_MALT','블렌디드 몰트'],['BLENDED_WHISKY','블렌디드 위스키'],
  ['BOURBON','버번'],['RYE','라이'],['CORN','콘'],['GRAIN','그레인'],['POT_STILL','팟 스틸'],
]
const CASK_TYPES = [
  ['EX_BOURBON','버번 캐스크'],['EX_SHERRY','셰리 캐스크'],['EX_PORT','포트 캐스크'],
  ['EX_WINE','와인 캐스크'],['NEW_OAK','뉴 오크'],['EX_RUM','럼 캐스크'],
  ['EX_MADEIRA','마데이라 캐스크'],['EX_SAUTERNES','소테른 캐스크'],
  ['EX_COGNAC','꼬냑 캐스크'],['MIZUNARA','미즈나라'],['OTHER','기타'],
]

export default function WhiskyDetailSection({ value, onChange, bottlingSlot, countrySlot }: Props) {
  const isFinish = value.maturationStyle === 'FINISH'

  return (
    <div className="space-y-5">
      {countrySlot}

      {/* 스타일 */}
      <div>
        <label className={LABEL}>스타일</label>
        <select value={value.style} onChange={(e) => onChange({ style: e.target.value })} className={SEL}>
          <option value="">선택 안 함</option>
          {WHISKY_STYLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

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

      {bottlingSlot}

      {/* 캐스크 */}
      <div>
        <label className={LABEL}>주 캐스크</label>
        <select value={value.caskType} onChange={(e) => onChange({ caskType: e.target.value })} className={SEL}>
          <option value="">선택 안 함</option>
          {CASK_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* 숙성 방식 */}
      <div>
        <label className={LABEL}>숙성 방식</label>
        <div className="flex gap-4">
          {[['FULL_MATURATION','Full Maturation (단일 캐스크)'],['FINISH','Finish (이중 숙성)']].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="radio" value={v} checked={value.maturationStyle === v}
                onChange={() => onChange({ maturationStyle: v })} className="accent-amber-500" />
              {l}
            </label>
          ))}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-400">
            <input type="radio" value=""
              checked={value.maturationStyle !== 'FULL_MATURATION' && value.maturationStyle !== 'FINISH'}
              onChange={() => onChange({ maturationStyle: '' })} className="accent-amber-500" />
            미지정
          </label>
        </div>
        {value.maturationStyle !== 'FULL_MATURATION' && value.maturationStyle !== 'FINISH' && (
          <input
            type="text"
            value={value.maturationStyle}
            onChange={(e) => onChange({ maturationStyle: e.target.value })}
            placeholder="예) 버번 캐스크 60% + 셰리 캐스크 40%"
            className={`${INPUT} mt-2`}
          />
        )}
      </div>

      {/* 피니시 캐스크 (Finish 선택 시만 활성) */}
      <div>
        <label className={`${LABEL} ${!isFinish ? 'opacity-40' : ''}`}>피니시 캐스크</label>
        <select
          value={value.finishCaskType}
          onChange={(e) => onChange({ finishCaskType: e.target.value })}
          disabled={!isFinish}
          className={`${SEL} ${!isFinish ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <option value="">선택 안 함</option>
          {CASK_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {isFinish && value.finishCaskType === 'OTHER' && (
          <input
            type="text"
            value={value.finishCaskDetail}
            onChange={(e) => onChange({ finishCaskDetail: e.target.value })}
            maxLength={200}
            className={`${INPUT} mt-2`}
          />
        )}
      </div>

      {/* 피니시 캐스크 설명 (기타 선택 시 위 인라인 입력으로 대체) */}
      {value.finishCaskType !== 'OTHER' && (
        <div>
          <label className={`${LABEL} ${!isFinish ? 'opacity-40' : ''}`}>피니시 캐스크 설명</label>
          <input type="text" value={value.finishCaskDetail} maxLength={200}
            onChange={(e) => onChange({ finishCaskDetail: e.target.value })}
            disabled={!isFinish}
            className={`${INPUT} ${!isFinish ? 'opacity-40 cursor-not-allowed' : ''}`}
          />
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

      {/* 캐스크 번호 */}
      <div>
        <label className={LABEL}>캐스크 번호</label>
        <input type="text" value={value.caskNo} maxLength={100}
          onChange={(e) => onChange({ caskNo: e.target.value })} className={INPUT} />
      </div>
    </div>
  )
}
