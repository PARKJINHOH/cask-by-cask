import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
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

/** 단추를 이만큼(ms) 누르고 있으면 '꾹 누름'으로 보고 값이 이어서 바뀐다. */
const HOLD_DELAY = 400
/** 꾹 누르는 동안 값이 바뀌는 간격(ms) */
const HOLD_INTERVAL = 70

/**
 * 숫자를 직접 적는 입력. 슬라이더로는 "정확히 200px" 을 맞추기 어려운 값에 쓴다.
 *
 * 타이핑 한 글자마다 값이 바뀌므로(2 → 20 → 200) onChange 는 슬라이더와 같이 gesture 로 묶고,
 * 칸을 벗어날 때(onCommit) 되돌리기 단계를 끊는다.
 *
 * ── 왜 type="number" 가 아닌가 ──
 * React 는 number 입력만 값을 느슨한 비교(node.value != value)로 맞춘다. 칸에 "050" 이 적혀 있고
 * 상태가 50 이면 같은 값으로 보아 칸을 고치지 않는다 — 앞의 0 이 지워지지 않던 이유다.
 * text + inputMode="numeric" 으로 두면 숫자 자판은 그대로 뜨면서 표기는 우리가 정한다.
 *
 * ── 적는 동안에는 칸을 비워 둘 수 있다 ──
 * 빈 칸을 그 자리에서 최솟값으로 되돌리면, 지우자마자 0 이 다시 나타나 그 뒤에 숫자를 붙이게 된다.
 * 적는 동안은 적은 그대로 두고(칸을 벗어날 때 정리한다), 값으로는 그때그때 자른 수를 넘긴다.
 *
 * ── 손가락으로는 ± 단추 ──
 * 좁은 칸을 짚어 자판을 여는 대신 양옆 단추로 step 만큼 올리고 내린다. 꾹 누르면 이어서 바뀐다.
 * 칸을 짚었을 때는 전체가 선택되므로, 바로 적으면 앞에 덧붙지 않고 통째로 바뀐다.
 */
export function NumberField({
  label, value, min, max, step = 1, suffix, disabled, onChange, onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** 이름 줄 오른쪽에 붙는 단위 표기(예: "px") */
  suffix?: string
  disabled?: boolean
  onChange: (value: number) => void
  onCommit: () => void
}) {
  const inputId = useId()
  /** 적는 중인 글자. null 이면 확정된 값을 그대로 보여 준다. */
  const [draft, setDraft] = useState<string | null>(null)
  const holdRef = useRef<{ timeout?: number; interval?: number }>({})
  // 꾹 누르는 동안에는 다시 그려지기를 기다리지 않고 여기서 다음 값을 이어 센다.
  const latestRef = useRef(value)
  useEffect(() => { latestRef.current = value }, [value])

  const clamp = (next: number) => Math.max(min, Math.min(max, next))

  const nudge = (delta: number) => {
    const current = latestRef.current
    const next = clamp(Math.round((current + delta) / step) * step)
    if (next === current) return
    latestRef.current = next
    onChange(next)
  }

  const stopHold = () => {
    window.clearTimeout(holdRef.current.timeout)
    window.clearInterval(holdRef.current.interval)
    holdRef.current = {}
  }
  useEffect(() => stopHold, [])

  const beginHold = (event: React.PointerEvent<HTMLButtonElement>, delta: number) => {
    // 단추를 짚어도 자판이 뜨지 않게 — 입력 칸의 초점을 뺏지 않는다.
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    nudge(delta)
    holdRef.current.timeout = window.setTimeout(() => {
      holdRef.current.interval = window.setInterval(() => nudge(delta), HOLD_INTERVAL)
    }, HOLD_DELAY)
  }

  const endHold = () => {
    if (!holdRef.current.timeout && !holdRef.current.interval) return
    stopHold()
    onCommit()
  }

  const stepButton = (delta: number, glyph: string, atLimit: boolean) => (
    <button
      type="button"
      aria-label={`${label} ${delta > 0 ? '+' : '−'}${Math.abs(delta)}`}
      disabled={disabled || atLimit}
      onPointerDown={(event) => beginHold(event, delta)}
      onPointerUp={endHold}
      onPointerCancel={endHold}
      className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-300 text-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-30"
      style={{ touchAction: 'none' }}
    >
      {glyph}
    </button>
  )

  return (
    <div className={disabled ? 'opacity-40' : ''}>
      <label htmlFor={inputId} className="mb-1 flex justify-between text-[11px] font-medium text-neutral-500">
        {label}
        {suffix && <span className="font-mono text-neutral-400">{suffix}</span>}
      </label>
      <div className="flex items-center gap-1">
        {stepButton(-step, '−', value <= min)}
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={draft ?? String(value)}
          disabled={disabled}
          // 짚으면 전체 선택 — 모바일에서 지우지 않고 바로 새 숫자를 적을 수 있다.
          // iOS 사파리는 focus 도중에 부른 select() 를 무시하므로 한 박자 뒤에 잡는다.
          onFocus={(event) => {
            const node = event.currentTarget
            window.setTimeout(() => node.setSelectionRange(0, node.value.length), 0)
          }}
          onChange={(event) => {
            const raw = event.target.value
            const digits = raw.replace(/[^\d]/g, '')
            const text = min < 0 && raw.trimStart().startsWith('-') ? `-${digits}` : digits
            setDraft(text)
            // 비었거나 부호만 있는 동안은 값을 건드리지 않는다 — 지우는 중일 뿐이다.
            if (digits === '') return
            onChange(clamp(Number(text)))
          }}
          onBlur={() => { setDraft(null); onCommit() }}
          className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-300 px-1 text-center text-xs font-semibold text-neutral-700"
        />
        {stepButton(step, '+', value >= max)}
      </div>
    </div>
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
