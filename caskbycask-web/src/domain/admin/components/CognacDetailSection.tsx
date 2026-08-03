import { useTranslation } from 'react-i18next'
import InfoTooltip from '@/shared/components/InfoTooltip'
import { RequiredMark } from '@/shared/components/FormFieldLabel'
import CruCompositionInput, { type CruCompositionRow } from '@/shared/components/CruCompositionInput'
import {
  COGNAC_GRADES, COGNAC_GRADE_MIN_YEARS, COGNAC_GRADE_NO_STATEMENT, COGNAC_OAK_TYPES,
} from '@/domain/spirit/data/cognac'

/** 숙성 위계에 놓이는 등급만 — '등급 표기 없음'은 위계 밖이라 따로 렌더한다 */
const AGING_GRADES = COGNAC_GRADES.filter((g) => g !== COGNAC_GRADE_NO_STATEMENT)

export interface CognacDetailForm {
  grade: string; cruComposition: CruCompositionRow[]; isFineChampagne: boolean; blendDetail: string
  vintageYear: string; ageYears: string; oakTypes: string[]; caskFinish: string; notes: string
}
export const DEFAULT_COGNAC: CognacDetailForm = {
  grade: '', cruComposition: [], isFineChampagne: false, blendDetail: '',
  vintageYear: '', ageYears: '', oakTypes: [], caskFinish: '', notes: '',
}

interface Props { value: CognacDetailForm; onChange: (u: Partial<CognacDetailForm>) => void; errors?: Record<string, string> }

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

/** Fine Champagne 법적 요건: Grande + Petite Champagne 만으로 구성되고 Grande 가 50% 이상 */
function qualifiesAsFineChampagne(rows: CruCompositionRow[]): boolean {
  if (rows.length !== 2) return false
  const crus = rows.map((r) => r.cru)
  if (!crus.includes('GRANDE_CHAMPAGNE') || !crus.includes('PETITE_CHAMPAGNE')) return false
  const grande = Number(rows.find((r) => r.cru === 'GRANDE_CHAMPAGNE')?.percentage) || 0
  return grande >= 50
}

export default function CognacDetailSection({ value, onChange, errors }: Props) {
  const { t } = useTranslation()

  const cruCount = value.cruComposition.filter((r) => r.cru).length
  const showFineChampagneHint = !value.isFineChampagne && qualifiesAsFineChampagne(value.cruComposition)

  const toggleOak = (oak: string) => {
    const next = value.oakTypes.includes(oak)
      ? value.oakTypes.filter((o) => o !== oak)
      : [...value.oakTypes, oak]
    onChange({ oakTypes: next })
  }

  return (
    <div className="space-y-5">
      {/* 필수 정보 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
        <p className="text-xs font-semibold text-amber-700">필수 정보</p>
        <div>
          <label className={LABEL}>
            등급 <RequiredMark />
          </label>
          <div role="radiogroup" aria-required="true" className="space-y-3">
            {/* 숙성 위계에 놓이는 등급들 */}
            <div className="flex flex-wrap gap-3">
              {AGING_GRADES.map((g) => (
                <label key={g} className="flex flex-col items-center cursor-pointer select-none">
                  <input type="radio" value={g} checked={value.grade === g}
                    onChange={() => onChange({ grade: g })} className="accent-amber-500 mb-1" />
                  <span className="text-xs font-semibold text-neutral-700">{t(`spirit.cognacGrade.${g}`)}</span>
                  <span className="text-[10px] text-neutral-400">{COGNAC_GRADE_MIN_YEARS[g] ?? ' '}</span>
                </label>
              ))}
            </div>

            {/* 위계 밖 — '표기가 없다'(사실)와 '아직 안 정했다'(미입력)는 다르다 */}
            <div className="flex flex-wrap items-center gap-4 border-t border-amber-200/70 pt-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="radio" value={COGNAC_GRADE_NO_STATEMENT}
                  checked={value.grade === COGNAC_GRADE_NO_STATEMENT}
                  onChange={() => onChange({ grade: COGNAC_GRADE_NO_STATEMENT })}
                  className="accent-amber-500" />
                <span className="text-xs font-semibold text-neutral-700">
                  {t(`spirit.cognacGrade.${COGNAC_GRADE_NO_STATEMENT}`)}
                </span>
                <InfoTooltip text="라벨에 VS·VSOP·XO 같은 등급 표기가 아예 없는 제품에 씁니다. 큐베 이름만으로 파는 레미 마르탱 1738 Accord Royal, 마르텔 코르동 블루, 헤네시 파라디, 루이 13세 등이 여기 해당합니다. 등급을 짐작해서 넣지 마세요." />
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="radio" value="" checked={!value.grade}
                  onChange={() => onChange({ grade: '' })} className="accent-amber-500" />
                <span className="text-xs text-neutral-400">아직 확인 안 함</span>
              </label>
            </div>
          </div>
          {errors?.grade && <p className="text-xs text-red-500 mt-1">{errors.grade}</p>}
        </div>
      </div>

      <p className="text-xs font-semibold text-neutral-500">선택 정보</p>

      {/* 크뤼 구성 */}
      <div>
        <label className={LABEL}>
          크뤼 구성 (원산지 구역, 비율 합계 ≤ 100%)
          <InfoTooltip text="토양의 백악질 비율로 나뉘는 꼬냑 AOC 법정 6개 구역. 샹파뉴 와인과는 이름만 같고 다른 지역입니다. Grande Champagne이 최상위. 꼬냑은 여러 크뤼를 섞는 것이 기본이라 섞인 크뤼를 모두 입력하세요. 비율을 모르면 비워두면 됩니다." />
        </label>
        <CruCompositionInput value={value.cruComposition}
          onChange={(rows) => onChange({ cruComposition: rows })} />
        {cruCount > 0 && (
          <p className="text-xs text-neutral-500 mt-1.5">
            {cruCount === 1 ? '싱글 크뤼로 표시됩니다.' : `멀티 크뤼 블렌드(${cruCount}개 크뤼)로 표시됩니다.`}
          </p>
        )}
        {errors?.cruComposition && <p className="text-xs text-red-500 mt-1">{errors.cruComposition}</p>}
      </div>

      {/* Fine Champagne */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
          <input type="checkbox" checked={value.isFineChampagne}
            onChange={(e) => onChange({ isFineChampagne: e.target.checked })} className="w-4 h-4 accent-amber-500" />
          Fine Champagne (Grande + Petite Champagne 블렌드, Grande 50% 이상)
        </label>
        {showFineChampagneHint && (
          <p className="text-xs text-amber-600 mt-1.5">
            입력한 크뤼 구성이 Fine Champagne 요건을 충족합니다. 라벨에 표기되어 있다면 체크하세요.
          </p>
        )}
      </div>

      {/* 빈티지 / 선언 숙성연수 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>
            빈티지 연도
            <InfoTooltip text="단일 연도 증류 원액으로 만든 빈티지 꼬냑일 때만. 일반 꼬냑은 비워두세요." />
          </label>
          <input type="number" min={1800} max={new Date().getFullYear()}
            value={value.vintageYear} onChange={(e) => onChange({ vintageYear: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>
            표기 숙성연수
            <InfoTooltip text="라벨에 표기된 숙성 연수(예: 20년). 표기가 없으면 비워두세요." />
          </label>
          <div className="relative">
            <input type="number" min={0} max={100}
              value={value.ageYears} onChange={(e) => onChange({ ageYears: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className={`${INPUT} pr-8`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">년</span>
          </div>
        </div>
      </div>

      {/* 오크 종류 — 리무쟁·트롱세 병용이 흔해 복수 선택 */}
      <div>
        <label className={LABEL}>
          오크 산지 (복수 선택)
          <InfoTooltip text="오크통을 만든 나무가 자란 프랑스 지역입니다. 리무쟁은 나뭇결이 굵어 향과 타닌이 진하게 배고, 트롱세는 결이 촘촘해 은은하게 뱁니다. 두 곳을 함께 쓰는 하우스가 많으니 확인된 것을 모두 고르세요. 알리에는 트롱세를 포함하는 넓은 지역 표기입니다. 산지가 공개되지 않았으면 '프랑스산 (산지 미표기)'을 고르세요." />
        </label>
        <div className="flex flex-wrap gap-2">
          {COGNAC_OAK_TYPES.map((oak) => {
            const on = value.oakTypes.includes(oak)
            return (
              <button key={oak} type="button" onClick={() => toggleOak(oak)} aria-pressed={on}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary-400 ${on
                    ? 'border-amber-400 bg-amber-100 text-amber-800'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-amber-300 hover:bg-amber-50'}`}>
                {t(`spirit.cognacOak.${oak}`)}
              </button>
            )
          })}
        </div>
      </div>

      {/* 캐스크 피니시 / 추가 숙성 */}
      <div>
        <label className={LABEL}>
          캐스크 피니시 / 추가 숙성
          <InfoTooltip text="다른 캐스크에서 추가 숙성한 경우. 예: 포트 캐스크 피니시." />
        </label>
        <input type="text" value={value.caskFinish} maxLength={200}
          onChange={(e) => onChange({ caskFinish: e.target.value })}
          placeholder="예: 포트 캐스크 피니시" className={INPUT} />
      </div>

      {/* 블렌드 설명 */}
      <div>
        <label className={LABEL}>
          블렌드 설명
          <InfoTooltip text="아상블라주에 대한 서술. 예: 약 40종의 오드비를 블렌딩, 최고령 원액 25년." />
        </label>
        <textarea value={value.blendDetail} rows={3} maxLength={300}
          onChange={(e) => onChange({ blendDetail: e.target.value })}
          className={`${INPUT} resize`} />
      </div>

      {/* 기타 정보 (참고용 자유 입력) */}
      <div>
        <label className={LABEL}>기타 정보</label>
        <textarea value={value.notes} rows={3} maxLength={500}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="출시·숙성 관련 참고 정보를 입력하세요."
          className={`${INPUT} resize`} />
      </div>
    </div>
  )
}
