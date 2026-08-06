import { useEffect, useRef } from 'react'
import type { PhotoCardEditor } from './usePhotoCardEditor'
import type { PhotoCardViewport } from './usePhotoCardViewport'

/** 방향키 한 번에 움직이는 거리(프레임 대비 비율). Shift 를 누르면 10배. */
const NUDGE = 0.002

const isTyping = (target: EventTarget | null) => {
  const element = target as HTMLElement | null
  if (!element) return false
  const tag = element.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable
}

/**
 * 편집기 단축키.
 *
 * 입력 칸 안에서는 전부 무시한다 — 메모를 쓰다가 Backspace 를 눌렀는데 레이어가 지워지면 안 된다.
 * 스페이스(손바닥 도구)는 뷰포트 쪽에서 따로 듣는다.
 */
export const usePhotoCardShortcuts = (
  editor: PhotoCardEditor,
  viewport: PhotoCardViewport,
) => {
  // 편집기·뷰포트 객체는 매 렌더 새로 만들어진다. 의존성에 그대로 넣으면 키를 누를 때마다가 아니라
  // 렌더할 때마다 리스너를 떼었다 붙인다. 최신 값은 ref 로 읽고 등록은 한 번만 한다.
  const latest = useRef({ editor, viewport })
  latest.current = { editor, viewport }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const { editor, viewport } = latest.current
      const mod = event.ctrlKey || event.metaKey
      const selected = editor.selectedLayerIds

      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) editor.redo()
        else editor.undo()
        return
      }
      if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        editor.redo()
        return
      }
      if (mod && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        editor.selectAll()
        return
      }
      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        if (selected.length === 1) editor.duplicateLayer(selected[0])
        return
      }
      if (mod && event.key === '0') {
        event.preventDefault()
        viewport.fit()
        return
      }
      if (mod && event.key === '1') {
        event.preventDefault()
        viewport.zoomToActual()
        return
      }
      if (event.key === 'Escape') {
        editor.selectLayer(null)
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selected.length === 0) return
        event.preventDefault()
        editor.removeLayers(selected)
        return
      }

      const step = (event.shiftKey ? NUDGE * 10 : NUDGE)
      const move: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      }
      const delta = move[event.key]
      if (!delta || selected.length === 0) return
      event.preventDefault()
      // 누르고 있는 동안은 되돌리기 한 단계로 묶는다. 키를 떼면 새 단계가 시작된다.
      editor.nudgeLayers(selected, delta[0], delta[1], `nudge:${selected.join(',')}`)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key.startsWith('Arrow')) latest.current.editor.endGesture()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])
}
