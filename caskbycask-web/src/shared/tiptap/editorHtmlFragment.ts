import DOMPurify from 'dompurify'

/**
 * Tiptap 공용 스키마가 표현하고 서버 HtmlSanitizer가 허용하는 HTML 범위입니다.
 * 외부 문서의 script/style/form 및 이벤트 속성은 에디터에 삽입하기 전에 제거합니다.
 */
export const EDITOR_ALLOWED_TAGS = [
  'p', 'br', 'span', 'mark', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'hr', 'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'iframe', 'video',
]

export const EDITOR_ALLOWED_ATTRIBUTES = [
  'href', 'src', 'alt', 'class', 'rel', 'target', 'style', 'width', 'height',
  'data-image-layout', 'data-image-pair', 'data-image-pair-width', 'data-image-pair-height',
  'data-image-source',
  'colspan', 'rowspan', 'scope', 'data-color',
  'data-type', 'data-checked',
  'data-spirit-id', 'data-spirit-name', 'data-spirit-name-en', 'data-spirit-category',
  'data-spirit-thumbnail', 'data-spirit-abv', 'data-spirit-review-count',
  'data-spirit-width',
  'data-review-id', 'data-review-width', 'data-spirit-name-ko',
  'data-spirit-identifier-ko', 'data-spirit-identifier-en',
  'data-review-nose-score', 'data-review-taste-score', 'data-review-finish-score',
  'data-review-total-score', 'data-review-nose-note', 'data-review-taste-note',
  'data-review-finish-note', 'data-review-comment', 'data-review-role', 'data-review-section',
  'data-video-embed', 'data-uploaded-video',
  'allowfullscreen', 'allow', 'frameborder', 'controls', 'preload', 'type',
  'start',
  'id',
]

/**
 * 전체 HTML 문서나 클립보드 HTML을 에디터에 바로 삽입할 수 있는 body fragment로 변환합니다.
 * 지원되는 제목/문단/목록/표/인용/미디어의 순서와 중첩은 유지하되 실행 가능한 요소는 제거합니다.
 */
export function toEditorHtmlFragment(content: string): string {
  if (!content) return ''
  if (typeof window === 'undefined') return content

  // 전체 문서가 들어와도 head의 메타데이터/스타일을 본문으로 섞지 않고,
  // body 자식의 원래 순서와 중첩만 HTML fragment로 가져온다.
  const parsed = new DOMParser().parseFromString(content, 'text/html')
  const bodyFragment = parsed.body.innerHTML

  const sanitized = DOMPurify.sanitize(bodyFragment, {
    ALLOWED_TAGS: EDITOR_ALLOWED_TAGS,
    ALLOWED_ATTR: EDITOR_ALLOWED_ATTRIBUTES,
    FORBID_TAGS: ['script', 'style', 'object', 'embed', 'form', 'input', 'button', 'textarea'],
    FORBID_ATTR: [
      'onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur',
      'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
    ],
    FORCE_BODY: true,
  })

  // 저장 전에도 에디터 DOM에서 iframe/video가 실행되므로 허용 출처를 즉시 제한한다.
  const template = document.createElement('template')
  template.innerHTML = sanitized
  template.content.querySelectorAll<HTMLIFrameElement>('iframe').forEach((iframe) => {
    try {
      const host = new URL(iframe.src).host
      if (!['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'].includes(host)) {
        iframe.remove()
      }
    } catch {
      iframe.remove()
    }
  })
  template.content.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
    if (!video.getAttribute('src')?.startsWith('/api/posts/videos/')) video.remove()
  })

  return template.innerHTML
}
