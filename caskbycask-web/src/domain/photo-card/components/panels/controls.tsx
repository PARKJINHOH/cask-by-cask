import type { ReactNode } from 'react'

/**
 * 속성 패널에서 반복되는 입력 묶음.
 *
 * 슬라이더는 끌고 있는 동안 값이 수십 번 바뀐다. 그대로 두면 되돌리기 한 번에 1px 씩 움직이므로
 * onChange 는 gesture 로 묶어 커밋하고, 손을 뗄 때(onCommit) 되돌리기 단계를 끊는다.
 *
 * ── 글자 굵기·명도 ──
 * 패널 글자는 11px 로 작다. 여기에 기본 굵기(400)와 옅은 회색(neutral-400)을 겹치면
 * 획이 가늘어 읽히지 않는다. 작은 글자에는 medium(500) 이상과 neutral-500 이상을 쓴다.
 */

export function Section({ title, hint, children }: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-semibold text-neutral-500">{title}</h3>
      {children}
      {hint && <p className="text-[11px] font-medium leading-relaxed text-neutral-500">{hint}</p>}
    </section>
  )
}

export function SliderField({
  label, value, min, max, step = 1, display, disabled, onChange, onCommit,
}: {
  label: string
  /** 슬라이더가 다루는 정수값 */
  value: number
  min: number
  max: number
  step?: number
  /** 사용자에게 보여 줄 표기(예: "12.5%") */
  display: string
  disabled?: boolean
  onChange: (value: number) => void
  onCommit: () => void
}) {
  return (
    <label className={`block ${disabled ? 'opacity-40' : ''}`}>
      <span className="mb-1 flex justify-between text-[11px] font-medium text-neutral-500">
        {label}
        <span className="font-mono text-neutral-600">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
        className="w-full accent-primary-600"
      />
    </label>
  )
}

/**
 * 숫자를 직접 적는 입력. 슬라이더로는 "정확히 200px" 을 맞추기 어려운 값에 쓴다.
 *
 * 타이핑 한 글자마다 값이 바뀌므로(2 → 20 → 200) onChange 는 슬라이더와 같이 gesture 로 묶고,
 * 칸을 벗어날 때(onCommit) 되돌리기 단계를 끊는다.
 */
export function NumberField({
  label, value, min, max, step = 1, suffix, disabled, onChange, onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** 칸 안 오른쪽에 붙는 단위 표기(예: "px") */
  suffix?: string
  disabled?: boolean
  onChange: (value: number) => void
  onCommit: () => void
}) {
  return (
    <label className={`block ${disabled ? 'opacity-40' : ''}`}>
      <span className="mb-1 block text-[11px] font-medium text-neutral-500">{label}</span>
      <span className="relative flex items-center">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            // 칸을 비우면 NaN 이 된다 — 지우는 중일 뿐이므로 최솟값으로 본다.
            const next = Number(event.target.value)
            onChange(Math.max(min, Math.min(max, Number.isFinite(next) ? next : min)))
          }}
          onBlur={onCommit}
          className={`w-full rounded-lg border border-neutral-300 py-1.5 pl-2 text-[11px] font-semibold text-neutral-700 ${
            suffix ? 'pr-7' : 'pr-2'
          }`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2 text-[11px] font-medium text-neutral-400">
            {suffix}
          </span>
        )}
      </span>
    </label>
  )
}

export function SegmentedField<T extends string>({ label, value, options, onChange }: {
  label?: string
  value: T
  options: { value: T; label: string; title?: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div>
      {label && <span className="mb-1 block text-[11px] font-medium text-neutral-500">{label}</span>}
      <div className="flex overflow-hidden rounded-lg border border-neutral-300">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`flex-1 border-r border-neutral-200 py-1.5 text-[11px] font-semibold transition-colors last:border-r-0 ${
              value === option.value
                ? 'bg-primary-600 text-white'
                : 'text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 자주 쓰는 배경색. 직접 고르기 전에 한 번에 맞추는 용도다. */
const COLOR_PRESETS = ['#ffffff', '#fdfcf8', '#f5f5f5', '#141414', '#1c1917', '#0f172a']

export function ColorField({ label, value, presets, onChange }: {
  label: string
  value: string
  presets?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium text-neutral-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value.slice(0, 7)}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 shrink-0 rounded-lg border border-neutral-300 p-1"
        />
        {presets && (
          <div className="flex min-w-0 flex-1 gap-1">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-label={preset}
                onClick={() => onChange(preset)}
                style={{ backgroundColor: preset }}
                className={`h-7 min-w-0 flex-1 rounded border transition-transform hover:scale-105 ${
                  value.slice(0, 7).toLowerCase() === preset ? 'border-primary-600' : 'border-neutral-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** 패널 안의 보조 버튼. 도구 패널마다 같은 모양을 쓴다. */
export function PanelButton({ children, onClick, disabled, tone = 'neutral' }: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: 'neutral' | 'primary'
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-lg py-2.5 text-xs font-bold transition-colors disabled:opacity-40 ${
        tone === 'primary'
          ? 'bg-primary-600 text-white hover:bg-primary-500'
          : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
      }`}
    >
      {children}
    </button>
  )
}
