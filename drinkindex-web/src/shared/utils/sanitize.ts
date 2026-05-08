import DOMPurify from 'dompurify'

// [보안] XSS 방어 2중 구조:
//   1차: 서버 jsoup Sanitize (저장 시)
//   2차: 클라이언트 DOMPurify (렌더링 시)
//   API 응답의 contentSanitized를 그대로 innerHTML에 넣지 않고
//   반드시 이 함수를 통해 렌더링.
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
      'h1', 'h2', 'h3', 'h4',
      'ul', 'ol', 'li',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'width', 'height'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style'],
    // on* 이벤트 핸들러 전체 차단
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  })
}
