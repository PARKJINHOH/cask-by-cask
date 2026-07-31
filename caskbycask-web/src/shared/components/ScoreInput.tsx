import { useCallback, useId } from 'react'
import { scoreColor } from '@/shared/utils/format'
import { RequiredMark } from '@/shared/components/FormFieldLabel'

export interface ScoreInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  note?: string
  onNoteChange?: (note: string) => void
  notePlaceholder?: string
  disabled?: boolean
  required?: boolean
}

export default function ScoreInput({
  label,
  value,
  onChange,
  note,
  onNoteChange,
  notePlaceholder,
  disabled = false,
  required = false,
}: ScoreInputProps) {
  const id = useId()

  const clamp = useCallback(
    (n: number) => Math.max(0, Math.min(100, Math.round(n * 10) / 10)),
    [],
  )

  const adjust = (delta: number) => {
    if (disabled) return
    onChange(clamp(value + delta))
  }

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(clamp(Number(e.target.value)))

  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (!isNaN(v)) onChange(clamp(v))
  }

  const handleWheelBlur = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur()
  }

  const color = scoreColor(value)
  const pct = `${value}%`

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>

      {/* 상단: 라벨 + 점수 입력 */}
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`${id}-num`} className="text-sm font-semibold text-neutral-700">
          {label}
          {required && <RequiredMark />}
        </label>
        <input
          id={`${id}-num`}
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={value}
          onChange={handleNumber}
          onWheel={handleWheelBlur}
          disabled={disabled}
          required={required}
          aria-required={required || undefined}
          className="w-20 text-center text-xl font-bold py-1.5 px-1 rounded-xl border border-neutral-300
            focus:outline-none focus:ring-2 focus:ring-primary-400 tabular-nums bg-white
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
            [&::-webkit-inner-spin-button]:appearance-none"
          style={{ color }}
        />
      </div>

      {/* 슬라이더 행: [-] [슬라이더] [+] */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* 감소 버튼 */}
        <button
          type="button"
          onClick={() => adjust(-0.1)}
          disabled={disabled || value <= 0}
          aria-label={`${label} 0.1 감소`}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl
            border border-neutral-200 bg-white text-neutral-600 text-xl font-light
            hover:bg-neutral-50 active:scale-95
            disabled:opacity-30 disabled:cursor-not-allowed
            touch-manipulation transition-all select-none"
        >
          −
        </button>

        {/* 슬라이더 트랙 */}
        <div
          className="relative flex-1 h-8 flex items-center"
        >
          {/* 배경 트랙 */}
          <div className="absolute inset-x-0 h-2 rounded-full bg-neutral-200" aria-hidden>
            <div
              className="h-full rounded-full transition-[width] duration-75"
              style={{ width: pct, backgroundColor: color }}
            />
          </div>

          {/* 썸 마커 */}
          <div
            className="absolute w-5 h-5 rounded-full shadow-md border-2 border-white
              transition-[left] duration-75 -translate-x-1/2 pointer-events-none"
            style={{ left: pct, backgroundColor: color }}
            aria-hidden
          />

          {/* 투명 range input */}
          <input
            id={`${id}-slider`}
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={value}
            onChange={handleSlider}
            onWheel={handleWheelBlur}
            disabled={disabled}
            aria-required={required || undefined}
            aria-label={`${label} 슬라이더`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
            className="absolute inset-0 w-full opacity-0 cursor-pointer
              disabled:cursor-not-allowed touch-manipulation"
          />
        </div>

        {/* 증가 버튼 */}
        <button
          type="button"
          onClick={() => adjust(0.1)}
          disabled={disabled || value >= 100}
          aria-label={`${label} 0.1 증가`}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl
            border border-neutral-200 bg-white text-neutral-600 text-xl font-light
            hover:bg-neutral-50 active:scale-95
            disabled:opacity-30 disabled:cursor-not-allowed
            touch-manipulation transition-all select-none"
        >
          +
        </button>
      </div>

      {/* 눈금 레이블 */}
      <div className="flex justify-between text-[10px] text-neutral-300 select-none px-12 sm:px-13">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>

      {/* 카테고리 노트 textarea */}
      {onNoteChange !== undefined && (
        <div>
          <textarea
            value={note ?? ''}
            onChange={(e) => onNoteChange(e.target.value)}
            disabled={disabled}
            placeholder={notePlaceholder}
            maxLength={1000}
            rows={2}
            className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-xl resize-y
              focus:outline-none focus:ring-2 focus:ring-primary-400
              placeholder:text-neutral-300 leading-relaxed min-h-[4rem]"
          />
          <p className="text-right text-[10px] text-neutral-300 mt-0.5 tabular-nums">
            {(note ?? '').length}/1000
          </p>
        </div>
      )}
    </div>
  )
}
