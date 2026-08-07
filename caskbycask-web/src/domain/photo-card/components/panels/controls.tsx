import { useRef, type ReactNode } from 'react'
import { useTouchInput } from '@/shared/tiptap/pointerMode'

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

/** 이만큼(px) 가로로 움직이기 전에는 슬라이더를 끄는 것으로 보지 않는다. */
const TOUCH_DRAG_THRESHOLD = 6

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

/**
 * 슬라이더.
 *
 * ── 터치에서는 '누른 자리로 뛰기'를 쓰지 않는다 ──
 * 네이티브 range 는 트랙을 누르는 순간 그 자리 값으로 뛴다. 패널을 손가락으로 굴리다
 * 바를 스치기만 해도 값이 바뀌어, 되돌리기 전에는 원래 값을 알 수도 없다.
 * 그래서 터치일 때는 투명한 판을 덮어 네이티브 조작을 막고, <b>누른 자리가 아니라 움직인 거리</b>로
 * 값을 옮긴다(손가락이 트랙 폭만큼 가면 최소→최대). 스쳐 지나가는 정도로는 값이 변하지 않고,
 * 판에 touch-action: pan-y 를 두어 세로로 긋는 손짓은 그대로 패널 스크롤로 간다.
 * 마우스·키보드는 네이티브 그대로다.
 */
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
  const isTouch = useTouchInput()
  const trackRef = useRef<HTMLSpanElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startValue: number
    /** 트랙 폭(px) — 이만큼 움직이면 최소에서 최대까지 간다 */
    width: number
    /** 문턱을 넘어 실제 조작이 시작됐는가 */
    armed: boolean
  } | null>(null)

  const beginDrag = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (disabled) return
    const width = trackRef.current?.getBoundingClientRect().width ?? 0
    if (width === 0) return
    dragRef.current = {
      pointerId: event.pointerId, startX: event.clientX, startValue: value, width, armed: false,
    }
  }

  const moveDrag = (event: React.PointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    if (!drag.armed) {
      if (Math.abs(dx) < TOUCH_DRAG_THRESHOLD) return
      drag.armed = true
      // 문턱을 넘은 뒤에는 손가락이 판 밖으로 나가도 계속 따라온다.
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const raw = drag.startValue + (dx / drag.width) * (max - min)
    const next = Math.max(min, Math.min(max, Math.round(raw / step) * step))
    if (next !== value) onChange(next)
  }

  const endDrag = (event: React.PointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (drag.armed) onCommit()
  }

  return (
    <label className={`block ${disabled ? 'opacity-40' : ''}`}>
      <span className="mb-1 flex justify-between text-[11px] font-medium text-neutral-500">
        {label}
        <span className="font-mono text-neutral-600">{display}</span>
      </span>
      <span ref={trackRef} className="relative block">
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
        {isTouch && !disabled && (
          <span
            aria-hidden="true"
            // 위아래로 조금 넓게 덮는다 — 얇은 바를 손끝으로 정확히 짚기 어렵다.
            className="absolute -inset-y-2 inset-x-0 block"
            style={{ touchAction: 'pan-y' }}
            // 판도 label 안이라, 막지 않으면 톡 누르는 것이 label 을 통해 range 로 전달된다
            // (브라우저에 따라 그 자리 값으로 뛴다) — 덮어 둔 뜻이 없어진다.
            onClick={(event) => event.preventDefault()}
            onPointerDown={beginDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
        )}
      </span>
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
