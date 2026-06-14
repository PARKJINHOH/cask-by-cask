import InfoTooltip from '@/shared/components/InfoTooltip'

export interface WhiskyDetailForm {
  style: string; styleOther: string; brandName: string; bottlingType: string
  caskTypes: string[]; caskFinishes: string[]; caskTypeOther: string
  isNonChillFiltered: boolean; isNaturalColour: boolean
  isSingleCask: boolean; isCaskStrength: boolean; isPeated: boolean
  phenolPpm: string; caskNo: string; notes: string
}

export const DEFAULT_WHISKY: WhiskyDetailForm = {
  style: 'SINGLE_MALT', styleOther: '', brandName: '', bottlingType: 'OB',
  caskTypes: [], caskFinishes: [], caskTypeOther: '',
  isNonChillFiltered: false, isNaturalColour: false, isSingleCask: false,
  isCaskStrength: false, isPeated: false, phenolPpm: '', caskNo: '', notes: '',
}

interface Props { value: WhiskyDetailForm; onChange: (u: Partial<WhiskyDetailForm>) => void; errors?: Record<string, string> }

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

const WHISKY_STYLES = [
  ['SINGLE_MALT','싱글 몰트'],['BLENDED_MALT','블렌디드 몰트'],['BLENDED_WHISKY','블렌디드'],
  ['BOURBON','버번'],['WHEATED_BOURBON','밀 버번'],['TENNESSEE','테네시'],['RYE','라이'],['POT_STILL','싱글 팟 스틸'],
  ['GRAIN_CORN','그레인 / 콘'],['OTHER','기타'],
]
// 캐스크 — 유형별 그룹(비슷한 뉘앙스끼리 정렬). 한 곳만 고치면 UI 자동 반영.
const CASK_GROUPS: Array<[string, Array<[string, string]>]> = [
  ['버번 · 오크', [
    ['EX_BOURBON', '버번 캐스크'], ['NEW_OAK', '뉴(버진) 오크'],
    ['FRENCH_OAK', '프렌치 오크'], ['CHINKAPIN', '친카핀'],
  ]],
  ['셰리 캐스크', [
    ['EX_SHERRY', '셰리 캐스크'], ['EX_FINO', '피노 캐스크'], ['EX_MANZANILLA', '만자니야 캐스크'],
    ['EX_AMONTILLADO', '아몬티야도 캐스크'], ['EX_OLOROSO', '올로로소 캐스크'],
    ['EX_PALO_CORTADO', '팔로 코르타도 캐스크'], ['EX_PX', 'PX 캐스크'],
  ]],
  ['주정강화 · 디저트 와인', [
    ['EX_PORT', '포트 캐스크'], ['EX_MADEIRA', '마데이라 캐스크'],
    ['EX_MARSALA', '마르살라 캐스크'], ['EX_MALAGA', '말라가 캐스크'],
    ['EX_SAUTERNES', '소테른 캐스크'], ['EX_TOKAJI', '토카이 캐스크'], ['EX_VERMOUTH', '베르무트 캐스크'],
  ]],
  ['와인 캐스크', [
    ['EX_WINE', '와인 캐스크'], ['VINO_BARRIQUE', '비노 바리끄'],
  ]],
  ['증류주 캐스크', [
    ['EX_RUM', '럼 캐스크'], ['EX_COGNAC', '꼬냑 캐스크'], ['EX_BRANDY', '브랜디 캐스크'],
    ['EX_CALVADOS', '칼바도스 캐스크'], ['EX_ARMAGNAC', '아르마냑 캐스크'],
    ['EX_MEZCAL_TEQUILA', '메스칼/데킬라 캐스크'],
  ]],
  ['기타 캐스크', [
    ['MIZUNARA', '미즈나라 (일본)'], ['EX_UMESHU', '매실주(우메슈) 캐스크'],
    ['TEAK_WOOD', '티크우드'], ['PEATED_CASK', '피티드 캐스크'], ['OTHER', '기타'],
  ]],
]

export default function WhiskyDetailSection({ value, onChange, errors }: Props) {
  const toggleCask = (code: string, checked: boolean) => {
    const caskTypes = checked
      ? [...value.caskTypes, code]
      : value.caskTypes.filter((c) => c !== code)
    // 캐스크 선택 해제 시 해당 피니시 표시도 함께 제거
    const caskFinishes = checked ? value.caskFinishes : value.caskFinishes.filter((c) => c !== code)
    onChange({ caskTypes, caskFinishes })
  }
  const toggleFinish = (code: string, checked: boolean) => {
    const caskFinishes = checked
      ? [...value.caskFinishes, code]
      : value.caskFinishes.filter((c) => c !== code)
    onChange({ caskFinishes })
  }

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
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="radio" value="" checked={!value.bottlingType}
              onChange={() => onChange({ bottlingType: '' })} className="accent-amber-500" />
            미지정
          </label>
        </div>
      </div>

      {/* 캐스크 — 유형별 그룹 박스. 각 캐스크 우측 '피니시'는 추가 숙성(피니시) 캐스크일 때 체크 */}
      <div>
        <label className={LABEL}>
          캐스크
          <InfoTooltip text="이 위스키에 사용된 캐스크를 모두 선택하세요. 여러 캐스크를 혼합하거나 반반 숙성한 경우 모두 체크합니다. 추가 숙성(피니시)에 쓰인 캐스크는 우측 '피니시'를 함께 체크하세요." />
        </label>
        <div className="space-y-3">
          {CASK_GROUPS.map(([groupName, items]) => (
            <div key={groupName} className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5 space-y-2.5">
              <p className="text-xs font-semibold text-neutral-500">{groupName}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {items.map(([v, l]) => {
                  const selected = value.caskTypes.includes(v)
                  return (
                    <div key={v} className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm select-none min-w-0">
                        <input type="checkbox" checked={selected}
                          onChange={(e) => toggleCask(v, e.target.checked)}
                          className="w-4 h-4 accent-amber-500 flex-shrink-0" />
                        <span className="truncate">{l}</span>
                      </label>
                      <label className={`flex items-center gap-1 text-[11px] flex-shrink-0 select-none ${
                        selected ? 'cursor-pointer text-amber-600' : 'opacity-30 cursor-not-allowed text-neutral-400'}`}>
                        <input type="checkbox" disabled={!selected}
                          checked={value.caskFinishes.includes(v)}
                          onChange={(e) => toggleFinish(v, e.target.checked)}
                          className="w-3.5 h-3.5 accent-amber-500" />
                        피니시
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {/* '기타' 선택 시 직접 입력 */}
        {value.caskTypes.includes('OTHER') && (
          <div className="mt-2">
            <input type="text" value={value.caskTypeOther} maxLength={200}
              onChange={(e) => onChange({ caskTypeOther: e.target.value })}
              placeholder="예) 목록에 없는 캐스크 직접 입력"
              className={INPUT} />
          </div>
        )}
      </div>

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
