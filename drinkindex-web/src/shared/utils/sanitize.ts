import DOMPurify from 'dompurify'

// [보안] 영상 임베드(iframe)는 아래 호스트만 허용. 그 외 src 는 표시 단계에서 제거.
//   (서버 HtmlSanitizer 가 1차로 호스트 검증하지만, 클라이언트에서도 동일 정책으로 2중 방어)
const ALLOWED_IFRAME_HOSTS = ['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com']

// 모듈 로드 시 1회 등록 — 허용 호스트가 아닌 iframe 은 제거
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'iframe') {
    const el = node as Element
    let ok = false
    try {
      ok = ALLOWED_IFRAME_HOSTS.includes(new URL(el.getAttribute('src') ?? '').host)
    } catch {
      ok = false
    }
    if (!ok) el.remove()
  }
})

// [보안] XSS 방어 2중 구조:
//   1차: 서버 jsoup sanitize (저장 시) — div/class/구조 태그 허용, script/on* 차단
//   2차: 클라이언트 DOMPurify (렌더링 시) — 서버 통과 후 최종 방어
//   API 응답의 contentSanitized를 반드시 이 함수를 통해 렌더링.
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      // 구조
      'div', 'article', 'section', 'header', 'footer', 'main', 'span',
      // 텍스트
      'p', 'br', 'strong', 'em', 'u', 's', 'mark', 'code', 'pre', 'blockquote',
      // 제목
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // 목록
      'ul', 'ol', 'li',
      // 링크·미디어
      'a', 'img',
      // 영상 임베드 (호스트는 위 훅에서 youtube/vimeo 만 허용)
      'iframe',
      // 테이블
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height', 'style',
      'class',  // Tailwind CSS 클래스
      'id',
      'colspan', 'rowspan', 'scope',
      // 글자 배경색(highlight)
      'data-color',
      // 영상 임베드 iframe
      'allow', 'allowfullscreen', 'frameborder', 'data-video-embed',
    ],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'style'],
    // on* 이벤트 핸들러 전체 차단
    FORBID_ATTR: [
      'onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur',
      'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
    ],
  })
}
