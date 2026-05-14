interface Props {
  isNas: boolean
  ageStatement: number | null
  onNasChange: (isNas: boolean) => void
  onAgeChange: (age: number | null) => void
}

const INPUT_CLS = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'

export default function NasToggle({ isNas, ageStatement, onNasChange, onAgeChange }: Props) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isNas}
          onChange={(e) => onNasChange(e.target.checked)}
          className="w-4 h-4 accent-amber-500 cursor-pointer"
        />
        <span className="text-sm font-medium text-neutral-700">NAS (No Age Statement)</span>
      </label>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-neutral-600">
          숙성 연수
          {isNas && (
            <span className="ml-1.5 text-neutral-400 font-normal">(NAS 선택 시 저장되지 않음)</span>
          )}
        </label>
        <input
          type="number"
          min={1}
          max={100}
          step={1}
          value={ageStatement ?? ''}
          onChange={(e) => onAgeChange(e.target.value === '' ? null : Number(e.target.value))}
          disabled={isNas}
          placeholder="예: 12"
          className={`${INPUT_CLS} ${
            isNas
              ? 'opacity-40 cursor-not-allowed bg-gray-50 border-neutral-200'
              : 'border-neutral-200'
          }`}
        />
      </div>
    </div>
  )
}
