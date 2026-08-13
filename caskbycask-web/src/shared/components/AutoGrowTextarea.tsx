import {
  forwardRef, useCallback, useEffect, useRef, useState,
  type TextareaHTMLAttributes,
} from 'react'

export interface AutoGrowTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** `maxLength` 가 있어도 글자수 카운터를 숨긴다(툴바 등 밖에서 따로 세는 경우). */
  hideCounter?: boolean
  /** 감싸는 div 의 클래스. `flex-1`·`h-full` 처럼 부모 레이아웃이 주는 클래스는 여기로 넘긴다. */
  wrapperClassName?: string
}

/**
 * 내용에 따라 높이가 늘어나는 textarea.
 *
 * 왜 공용 컴포넌트인가 — 글이 길어질 때 좁은 상자 안에서 스크롤하게 두면
 * 쓴 글을 한눈에 볼 수 없다. 사용자·관리자 화면의 모든 입력이 같은 규칙을 쓰도록
 * 한 곳에 모았다(스크롤 대신 확장 + `maxLength` 가 있으면 우측 하단 글자수 표시).
 *
 * 높이 계산: `height:auto` 로 되돌린 뒤 `scrollHeight` 를 다시 심는다.
 * Tailwind preflight 가 `box-sizing: border-box` 를 깔아 두므로 테두리 두께를 더해야
 * 매 입력마다 1~2px 씩 모자라 스크롤이 되살아나지 않는다.
 * 최소 높이는 `rows` 가 그대로 결정한다 — `height:auto` 상태의 `scrollHeight` 는
 * 최소 `rows` 만큼이기 때문에 별도 계산이 필요 없다.
 */
const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
  function AutoGrowTextarea(
    {
      className = '',
      wrapperClassName = '',
      hideCounter = false,
      maxLength,
      rows = 2,
      value,
      defaultValue,
      onChange,
      ...rest
    },
    forwardedRef,
  ) {
    const elementRef = useRef<HTMLTextAreaElement | null>(null)
    // 비제어 입력일 때만 쓰는 길이. 제어 입력은 value 에서 바로 센다.
    const [typedLength, setTypedLength] = useState(() => String(defaultValue ?? '').length)

    const showCounter = !hideCounter && typeof maxLength === 'number' && maxLength > 0
    const length = value !== undefined ? String(value).length : typedLength

    const grow = useCallback((element: HTMLTextAreaElement | null) => {
      if (!element) return
      element.style.height = 'auto'
      const styles = window.getComputedStyle(element)
      const border = styles.boxSizing === 'border-box'
        ? (parseFloat(styles.borderTopWidth) || 0) + (parseFloat(styles.borderBottomWidth) || 0)
        : 0
      element.style.height = `${element.scrollHeight + border}px`
    }, [])

    // 콜백 ref — 커밋 시점(브라우저가 그리기 전)에 재므로 수정 화면을 열 때 높이가 튀지 않는다.
    // 밖에서 받은 ref 에는 실제 textarea 엘리먼트를 그대로 넘긴다 —
    // 멘션 삽입·포커스처럼 DOM 을 직접 만지는 화면이 있어 래퍼를 끼우면 안 된다.
    const attachRef = useCallback((element: HTMLTextAreaElement | null) => {
      elementRef.current = element
      if (typeof forwardedRef === 'function') forwardedRef(element)
      else if (forwardedRef) forwardedRef.current = element
      grow(element)
    }, [forwardedRef, grow])

    // 값이 밖에서 바뀌는 경우(폼 초기 로딩·초기화·자동 채움)도 높이를 맞춘다.
    useEffect(() => { grow(elementRef.current) }, [grow, value])

    // 비제어 입력(react-hook-form register 등)은 값이 ref 로 직접 꽂힌다 —
    // onChange 를 타지 않으므로 렌더마다 DOM 에서 다시 읽어 높이와 카운터를 맞춘다.
    // 제어 입력은 위 effect 로 충분하므로 이 비용을 지우지 않는다.
    useEffect(() => {
      if (value !== undefined) return
      const element = elementRef.current
      if (!element) return
      setTypedLength(element.value.length)
      grow(element)
    })

    // 폭이 바뀌면 줄바꿈 위치가 달라져 높이도 달라진다(창 크기 변경·모달 열림·패널 접기).
    // 높이 변화로는 다시 재지 않으므로 되먹임 루프가 생기지 않는다.
    useEffect(() => {
      const element = elementRef.current
      if (!element || typeof ResizeObserver === 'undefined') return

      let lastWidth = element.clientWidth
      const observer = new ResizeObserver(() => {
        if (element.clientWidth === lastWidth) return
        lastWidth = element.clientWidth
        grow(element)
      })
      observer.observe(element)
      return () => observer.disconnect()
    }, [grow])

    return (
      <div className={`relative ${wrapperClassName}`.trim()}>
        <textarea
          {...rest}
          ref={attachRef}
          rows={rows}
          maxLength={maxLength}
          {...(value !== undefined ? { value } : { defaultValue })}
          onChange={(event) => {
            if (value === undefined) setTypedLength(event.target.value.length)
            grow(event.currentTarget)
            onChange?.(event)
          }}
          className={[
            'resize-none overflow-hidden',
            // 카운터가 마지막 줄 글자와 겹치지 않도록 아래쪽만 넓혀 둔다.
            showCounter ? 'pb-6' : '',
            className,
          ].filter(Boolean).join(' ')}
        />
        {showCounter && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1.5 right-2.5
              text-[10px] leading-none tabular-nums text-neutral-400"
          >
            {length}/{maxLength}
          </span>
        )}
      </div>
    )
  },
)

export default AutoGrowTextarea
