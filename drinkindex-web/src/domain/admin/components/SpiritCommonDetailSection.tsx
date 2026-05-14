import NasToggle from '@/shared/components/NasToggle'

export interface CommonDetailForm {
  isNas: boolean
  ageStatement: number | null
  distilledDate: string
  bottledDate: string
  releaseDate: string
  volumeMl: string
  abv: string
  bottleNo: string
  batchNo: string
  totalBottles: string
}

export const DEFAULT_COMMON_DETAIL: CommonDetailForm = {
  isNas: false, ageStatement: null, distilledDate: '', bottledDate: '',
  releaseDate: '', volumeMl: '', abv: '', bottleNo: '', batchNo: '', totalBottles: '',
}

interface Props {
  value: CommonDetailForm
  onChange: (updates: Partial<CommonDetailForm>) => void
  dateErrors?: { distilledDate?: string; bottledDate?: string }
}

const INPUT = 'w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1.5'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  )
}


export default function SpiritCommonDetailSection({ value, onChange, dateErrors }: Props) {
  return (
    <div className="space-y-4">
      {/* NAS 토글 */}
      <NasToggle
        isNas={value.isNas}
        ageStatement={value.ageStatement}
        onNasChange={(v) => onChange({ isNas: v })}
        onAgeChange={(v) => onChange({ ageStatement: v })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 증류 연월 */}
        <div className="space-y-1.5">
          <label className={LABEL}>증류 연월</label>
          <input
            type="text"
            value={value.distilledDate}
            onChange={(e) => onChange({ distilledDate: e.target.value })}
            placeholder="YYYY 또는 YYYY-MM"
            className={`${INPUT} ${dateErrors?.distilledDate ? 'border-red-400' : ''}`}
          />
          {dateErrors?.distilledDate && (
            <p className="text-xs text-red-500">{dateErrors.distilledDate}</p>
          )}
        </div>

        {/* 병입 연월 */}
        <div className="space-y-1.5">
          <label className={LABEL}>병입 연월</label>
          <input
            type="text"
            value={value.bottledDate}
            onChange={(e) => onChange({ bottledDate: e.target.value })}
            placeholder="YYYY 또는 YYYY-MM"
            className={`${INPUT} ${dateErrors?.bottledDate ? 'border-red-400' : ''}`}
          />
          {dateErrors?.bottledDate && (
            <p className="text-xs text-red-500">{dateErrors.bottledDate}</p>
          )}
        </div>

        {/* 출시일 */}
        <Field label="출시일">
          <input
            type="date"
            value={value.releaseDate}
            onChange={(e) => onChange({ releaseDate: e.target.value })}
            className={INPUT}
          />
        </Field>

        {/* 병 번호 */}
        <Field label="병 번호">
          <input
            type="text"
            value={value.bottleNo}
            onChange={(e) => onChange({ bottleNo: e.target.value })}
            maxLength={50}
            className={INPUT}
          />
        </Field>

        {/* 배치 번호 */}
        <Field label="배치 번호">
          <input
            type="text"
            value={value.batchNo}
            onChange={(e) => onChange({ batchNo: e.target.value })}
            maxLength={100}
            className={INPUT}
          />
        </Field>

        {/* 총 병 수 */}
        <Field label="총 병 수">
          <input
            type="number" min={1}
            value={value.totalBottles}
            onChange={(e) => onChange({ totalBottles: e.target.value })}
            className={INPUT}
          />
        </Field>
      </div>
    </div>
  )
}
