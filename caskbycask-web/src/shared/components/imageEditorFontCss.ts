/**
 * 이미지 에디터 전용 한글 서체 CSS 를 필요할 때만 문서에 붙인다.
 *
 * 6종 × 약 90조각의 @font-face 선언이 375KB 라 본문 번들에 넣을 수 없다.
 * (ImageEditorModal 은 리치텍스트 에디터·관리자 화면 등 여러 곳에서 정적 import 된다)
 * 실제 폰트 파일은 unicode-range 로 나뉘어 있어, 캔버스에 그리는 글자가 속한 조각만 내려온다.
 *
 * 생성물: public/fonts/editor/editor-fonts.css — `npm run fonts:sync-editor`
 */
const EDITOR_FONT_CSS_HREF = '/fonts/editor/editor-fonts.css'

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
