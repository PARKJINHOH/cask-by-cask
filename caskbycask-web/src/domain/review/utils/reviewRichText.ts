/**
 * 리뷰 종합평가(comment) 서식 변환.
 *
 * 종합평가는 제한형 에디터(굵기·밑줄·글자색·형광펜·글자크기)로 작성한 HTML 로 저장한다.
 * 다만 에디터 도입 이전에 등록된 리뷰는 순수 텍스트로 남아 있어 DB 값이 두 가지 형태로 섞인다.
 * 데이터를 일괄 변환하지 않고(되돌릴 수 없고 실패 시 전체 리뷰가 깨진다) 읽는 시점에 맞춰 준다.
 */

/**
 * 에디터가 내보내는 fragment 는 항상 블록/인라인 태그로 시작한다(`toEditorHtmlFragment`).
 * 그 외에는 레거시 순수 텍스트로 본다 — 이 정규식을 느슨하게 바꾸면
 * `<3` 처럼 부등호로 시작하는 옛 리뷰가 태그로 오인돼 깨진다.
 */
const HTML_LIKE = /^\s*<(p|div|span|strong|b|u|mark|br)[\s/>]/i

function looksLikeHtml(value: string): boolean {
  return HTML_LIKE.test(value)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    // &amp; 는 마지막에 푼다 — 먼저 풀면 `&amp;lt;` 가 `<` 로 두 번 해석된다.
    .replace(/&amp;/gi, '&')
}

/**
 * 화면 표시·에디터 로드용 HTML.
 *
 * 레거시 순수 텍스트는 escape 한 뒤 줄바꿈을 `<br>` 로 바꿔 한 문단에 담는다.
 * `.notice-content p` 가 `white-space: pre-wrap` 이라 기존 화면과 같은 모양으로 그려지고,
 * TipTap 은 `<br>` 을 hardBreak 로 읽어 수정 화면에서도 줄바꿈이 그대로 살아난다.
 */
export function reviewCommentToHtml(value?: string | null): string {
  const raw = value ?? ''
  if (!raw.trim()) return ''
  if (looksLikeHtml(raw)) return raw
  return `<p>${escapeHtml(raw).replace(/\r\n|\r|\n/g, '<br>')}</p>`
}

/**
 * 순수 텍스트가 필요한 소비처(공유 이미지, 리뷰 카드 임베드, JSON-LD, OG description)용.
 *
 * 레거시 값은 손대지 않는다 — 태그가 없는데 엔티티 치환을 돌리면 옛 리뷰의 `&` 표기가 바뀐다.
 */
export function reviewCommentToText(value?: string | null): string {
  const raw = value ?? ''
  if (!raw) return ''
  if (!looksLikeHtml(raw)) return raw
  return decodeEntities(
    raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li|blockquote)\s*>/gi, '\n')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 에디터 하단에 표시되는 글자수와 같은 기준의 본문 길이.
 *
 * TipTap CharacterCount 는 `doc.textBetween(0, size, undefined, ' ')` 를 센다 —
 * 줄바꿈(`<br>`)은 한 칸으로 세고 문단 경계에는 아무것도 넣지 않는다. 검증이 이 기준과
 * 어긋나면 "600/600 인데 600자를 넘었다"는 막다른 골목이 생기므로, 폼 검증과
 * 서버(HtmlSanitizer.countCharactersAsEditor)가 모두 여기에 맞춘다.
 *
 * 화면 표시용 {@link reviewCommentToText} 는 문단 경계를 줄바꿈으로 살리므로 길이가 다르다.
 */
export function reviewCommentLength(value?: string | null): number {
  const raw = value ?? ''
  if (!raw) return 0
  // 레거시 순수 텍스트는 에디터에 들어가는 순간 줄바꿈이 <br>(한 칸)이 된다.
  if (!looksLikeHtml(raw)) return raw.replace(/\r\n|\r/g, '\n').length
  return decodeEntities(
    raw.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ''),
  ).length
}

/** 빈 에디터는 `<p></p>` 를 내보낸다 — 저장 전에 빈 값으로 되돌리기 위한 판정. */
export function isBlankReviewComment(value?: string | null): boolean {
  return reviewCommentToText(value).trim() === ''
}
