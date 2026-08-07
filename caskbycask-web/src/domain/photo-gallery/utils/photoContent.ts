/**
 * 이미지 갤러리 글 본문 분리.
 *
 * 포토카드 게시는 본문 맨 앞에 사진 <img> 를 넣고 그 뒤에 캡션을 붙인다
 * (PhotoCardPublishDialog 참고). 인스타 형태의 상세 화면은 사진을 왼쪽 칸에서
 * 따로 크게 보여 주므로, 오른쪽 캡션 칸에서는 같은 사진을 한 번 더 그리면 안 된다.
 *
 * 순수 문자열 처리라 DOM 없이 단위 테스트할 수 있다.
 * (여기서 뽑은 HTML 은 RichContent 가 다시 sanitize 하므로 이 함수는 정제 책임이 없다.)
 */

const IMG_TAG = /<img\b[^>]*>/gi
const SRC_ATTR = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
/** 이미지를 뺀 뒤 남는 빈 문단 — <p></p>, <p> </p>, <p><br></p> 등 */
const EMPTY_BLOCK = /<(p|div|figure)\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi

export interface SplitPhotoContent {
  /** 본문에 들어 있던 이미지 주소 (등장 순서) */
  imageUrls: string[]
  /** 이미지를 뺀 캡션 HTML */
  captionHtml: string
}

export const splitPhotoContent = (html: string | null | undefined): SplitPhotoContent => {
  if (!html) return { imageUrls: [], captionHtml: '' }

  const imageUrls: string[] = []
  for (const tag of html.match(IMG_TAG) ?? []) {
    const matched = SRC_ATTR.exec(tag)
    const src = matched?.[1] ?? matched?.[2] ?? matched?.[3]
    if (src) imageUrls.push(src)
  }

  let captionHtml = html.replace(IMG_TAG, '')
  // 이미지를 감싸고 있던 빈 문단이 중첩된 경우가 있어 더 줄지 않을 때까지 반복한다.
  for (let pass = 0; pass < 5; pass += 1) {
    const next = captionHtml.replace(EMPTY_BLOCK, '')
    if (next === captionHtml) break
    captionHtml = next
  }
  captionHtml = captionHtml.trim()

  return { imageUrls, captionHtml }
}
