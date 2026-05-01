import { useCallback, useId } from 'react'

export interface ScoreInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

function scoreColor(v: number): string {
  if (v >= 85) return '#22c55e'  // green-500
  if (v >= 70) return '#f59e0b'  // amber-500
  if (v >= 50) return '#f97316'  // orange-500
  return '#ef4444'               // red-500
}

export default function ScoreInput({ label, value, onChange, disabled = false }: ScoreInputProps) {
  const id = useId()
  const clamp = useCallback((n: number) => Math.max(0, Math.min(100, Math.round(n))), [])

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(clamp(Number(e.target.value)))
  }

  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    if (!isNaN(v)) onChange(clamp(v))
  }

  const color = scoreColor(value)

  return (
    <div className={`space-y-2 ${disabled ? 'opacity-50' : ''}`}>
      {/* Label + number input */}
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${id}-num`} className="text-sm font-medium text-neutral-700 flex-1">
          {label}
        </label>
        <input
          id={`${id}-num`}
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={handleNumber}
          disabled={disabled}
          aria-label={`${label} 점수 (0–100)`}
          className="w-16 text-center text-lg font-bold py-1 rounded-lg border border-neutral-200
            focus:outline-none focus:ring-2 focus:ring-primary-400 tabular-nums
            disabled:cursor-not-allowed bg-white"
          style={{ color }}
        />
      </div>

      {/* Slider track + input */}
      <div className="relative h-5 flex items-center">
        {/* Visual track */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-neutral-200" aria-hidden="true">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
        </div>

        {/* Thumb marker */}
        <div
          className="absolute w-4 h-4 rounded-full shadow-sm border-2 border-white transition-all duration-100 -translate-x-1/2 pointer-events-none"
          style={{ left: `${value}%`, backgroundColor: color }}
          aria-hidden="true"
        />

        {/* Invisible range input (covers the track for interaction) */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={handleSlider}
          disabled={disabled}
          aria-label={`${label} 슬라이더`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-xs text-neutral-300 select-none">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  )
}
