import DOMPurify from 'dompurify'

// [보안] XSS 방어 2중 구조:
//   1차: 서버 jsoup sanitizeLegal (저장 시) — div/class/구조 태그 허용, script/on* 차단
//   2차: 클라이언트 DOMPurify (렌더링 시) — 서버 통과 후 최종 방어
//   API 응답의 contentSanitized를 반드시 이 함수를 통해 렌더링.
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      // 구조
      'div', 'article', 'section', 'header', 'footer', 'main', 'span',
      // 텍스트
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
      // 제목
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // 목록
      'ul', 'ol', 'li',
      // 링크·미디어
      'a', 'img',
      // 테이블
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height', 'style',
      'class',  // Tailwind CSS 클래스
      'id',
      'colspan', 'rowspan', 'scope',
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style'],
    // on* 이벤트 핸들러 전체 차단
    FORBID_ATTR: [
      'onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur',
      'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
    ],
  })
}
