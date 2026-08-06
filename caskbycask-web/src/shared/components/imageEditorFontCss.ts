/**
 * 이미지 에디터 전용 한글 서체 CSS 를 필요할 때만 문서에 붙인다.
 *
 * 6종 × 약 90조각의 @font-face 선언이 375KB 라 본문 번들에 넣을 수 없다.
 * (ImageEditorModal 은 리치텍스트 에디터·관리자 화면 등 여러 곳에서 정적 import 된다)
 * 실제 폰트 파일은 unicode-range 로 나뉘어 있어, 캔버스에 그리는 글자가 속한 조각만 내려온다.
 *
 * 생성물: public/fonts/editor/editor-fonts.css — `npm run fonts:sync-editor`
 */
import { EDITOR_FONT_CSS_VERSION } from './editorFontCssVersion'

/**
 * 내용 해시를 쿼리로 붙인다.
 *
 * 이 CSS 는 한 자리에 계속 덮어써지는 파일이라, 서체를 추가해도 URL 이 그대로면
 * 예전에 캐시한 브라우저가 새 목록을 받지 못한다(실제로 한 번 겪은 문제다 —
 * 캐시가 immutable 로 굳으면 새로고침으로도 풀리지 않는다).
 * 해시가 바뀌면 URL 이 바뀌므로 캐시가 어떻게 굳어 있든 새로 받는다.
 */
const EDITOR_FONT_CSS_HREF = `/fonts/editor/editor-fonts.css?v=${EDITOR_FONT_CSS_VERSION}`

let loadPromise: Promise<void> | null = null

export const ensureEditorFontCssLoaded = (): Promise<void> => {
  if (typeof document === 'undefined') return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLLinkElement>(`link[href="${EDITOR_FONT_CSS_HREF}"]`)
    if (existing) {
      resolve()
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = EDITOR_FONT_CSS_HREF
    // 실패해도 진행한다 — Pretendard 는 본문 CSS 로 이미 로드돼 있어 폴백이 동작한다.
    link.onload = () => resolve()
    link.onerror = () => resolve()
    document.head.appendChild(link)
  })

  return loadPromise
}
