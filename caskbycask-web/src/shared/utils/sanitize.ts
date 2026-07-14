import DOMPurify from 'dompurify'

// [보안] 영상 임베드(iframe)는 아래 호스트만 허용. 그 외 src 는 표시 단계에서 제거.
//   (서버 HtmlSanitizer 가 1차로 호스트 검증하지만, 클라이언트에서도 동일 정책으로 2중 방어)
const ALLOWED_IFRAME_HOSTS = ['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com']

// 브라우저 환경에서만 훅을 1회 등록합니다. (SSR 환경에서의 TypeError 방지)
if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.addHook === 'function') {
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    const el = node as Element
    if (data.tagName === 'iframe') {
      let ok = false
      try {
        ok = ALLOWED_IFRAME_HOSTS.includes(new URL(el.getAttribute('src') ?? '').host)
      } catch {
        ok = false
      }
      if (!ok) el.remove()
    }
    // 업로드 동영상: /api/posts/videos/ 로 시작하지 않으면 제거
    if (data.tagName === 'video') {
      const src = el.getAttribute('src') ?? ''
      if (!src.startsWith('/api/posts/videos/')) el.remove()
    }
  })
}

// [보안] XSS 방어 2중 구조:
//   1차: 서버 jsoup sanitize (저장 시) — div/class/구조 태그 허용, script/on* 차단
//   2차: 클라이언트 DOMPurify (렌더링 시) — 서버 통과 후 최종 방어
//   API 응답의 contentSanitized를 반드시 이 함수를 통해 렌더링.
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    return dirty
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      // 구조
      'div', 'article', 'section', 'header', 'footer', 'main', 'span',
      // 텍스트
      'p', 'br', 'strong', 'em', 'u', 's', 'mark', 'code', 'pre', 'blockquote', 'hr',
      // 제목
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // 목록 / 체크리스트
      'ul', 'ol', 'li',
      // 링크·미디어
      'a', 'img',
      // YouTube/Vimeo 임베드 (호스트는 위 훅에서 검증)
      'iframe',
      // 업로드 동영상 (src 는 위 훅에서 /api/posts/videos/ 만 허용)
      'video',
      // 테이블
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height', 'style',
      'data-image-layout', 'data-image-pair', 'data-image-pair-width', 'data-image-pair-height',
      'class',  // Tailwind CSS 클래스
      'id',
      'colspan', 'rowspan', 'scope',
      // 글자 배경색(highlight)
      'data-color',
      // 체크리스트(TaskList) / 술 임베드 칩
      'data-type', 'data-checked',
      'data-spirit-id', 'data-spirit-name', 'data-spirit-name-en', 'data-spirit-category',
      'data-spirit-thumbnail', 'data-spirit-abv', 'data-spirit-review-count',
      'data-spirit-width',
      // 내 리뷰 카드 스냅샷 / 구조
      'data-review-id', 'data-review-width', 'data-spirit-name-ko',
      'data-spirit-identifier-ko', 'data-spirit-identifier-en',
      'data-review-nose-score', 'data-review-taste-score', 'data-review-finish-score',
      'data-review-total-score', 'data-review-nose-note', 'data-review-taste-note',
      'data-review-finish-note', 'data-review-comment', 'data-review-role', 'data-review-section',
      // YouTube/Vimeo 임베드 iframe
      'allow', 'allowfullscreen', 'frameborder', 'data-video-embed',
      // 업로드 동영상 video
      'controls', 'preload', 'type', 'data-uploaded-video',
      'start',
    ],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'style'],
    // on* 이벤트 핸들러 전체 차단
    FORBID_ATTR: [
      'onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur',
      'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
    ],
  })
}
