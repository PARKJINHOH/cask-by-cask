export interface RangeSliderProps {
  min: number
  max: number
  value: [number, number]
  onChange: (v: [number, number]) => void
  onChangeEnd?: (v: [number, number]) => void
  step?: number
  formatLabel?: (v: number) => string
  label?: string
}

export default function RangeSlider({
  min,
  max,
  value,
  onChange,
  onChangeEnd,
  step = 1,
  formatLabel,
  label,
}: RangeSliderProps) {
  const [lo, hi] = value
  const span = max - min
  const pLo = ((lo - min) / span) * 100
  const pHi = ((hi - min) / span) * 100

  const clampLo = (v: number) => Math.min(Math.max(v, min), hi - step)
  const clampHi = (v: number) => Math.max(Math.min(v, max), lo + step)

  // when lo is near the right end, bring it on top so it's still grabbable
  const loZ = lo > max - span * 0.1 ? 5 : 3

  return (
    <div className="space-y-1.5">
      {label && (
        <span className="text-sm font-medium text-neutral-700">{label}</span>
      )}
      <div className="flex justify-between text-xs text-neutral-500 tabular-nums">
        <span>{formatLabel ? formatLabel(lo) : lo}</span>
        <span>{formatLabel ? formatLabel(hi) : hi}</span>
      </div>

      <div className="relative h-5">
        {/* Track background */}
        <div className="pointer-events-none absolute top-1/2 inset-x-0 -translate-y-1/2 h-1.5 rounded-full bg-neutral-200">
          <div
            className="absolute h-full rounded-full bg-primary-500"
            style={{ left: `${pLo}%`, right: `${100 - pHi}%` }}
          />
        </div>

        {/* Lo thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          className="range-dual"
          style={{ zIndex: loZ }}
          aria-label={label ? `${label} 최솟값` : '최솟값'}
          aria-valuemin={min}
          aria-valuemax={hi}
          aria-valuenow={lo}
          onChange={(e) => onChange([clampLo(+e.target.value), hi])}
          onPointerUp={() => onChangeEnd?.([lo, hi])}
        />
        {/* Hi thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          className="range-dual"
          style={{ zIndex: 4 }}
          aria-label={label ? `${label} 최댓값` : '최댓값'}
          aria-valuemin={lo}
          aria-valuemax={max}
          aria-valuenow={hi}
          onChange={(e) => onChange([lo, clampHi(+e.target.value)])}
          onPointerUp={() => onChangeEnd?.([lo, hi])}
        />
      </div>
    </div>
  )
}
