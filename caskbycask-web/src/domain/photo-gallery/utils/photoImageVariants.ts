/**
 * 이미지 갤러리 반응형 소스.
 *
 * 서버는 업로드 시 본 이미지(장변 2560 상한)와 함께 `{uuid}_w640.webp` · `{uuid}_w1280.webp`
 * 축소본을 만든다(PostImageService 참고). 목록 타일은 폭이 500px 도 안 되는데 본 이미지를
 * 그대로 받으면 화면에 보이는 것보다 수십 배 큰 바이트를 내려받게 된다.
 *
 * 축소본이 없는 **기존 업로드**는 서버(PostController#serveImage)가 본 이미지로 폴백하므로
 * srcset 이 404 를 만나 이미지가 깨지는 일은 없다. 그래서 백필 없이 바로 적용할 수 있다.
 *
 * ⚠️ VARIANT_WIDTHS 는 백엔드 `PostImageService.VARIANT_WIDTHS` 와 반드시 같아야 한다.
 *    한쪽만 바꾸면 만들지 않은 폭을 요청하게 되고, 서버가 그 폭을 거부한다.
 *
 * 순수 문자열 처리라 DOM 없이 단위 테스트할 수 있다.
 */

export const VARIANT_WIDTHS = [640, 1280] as const

/** 본 이미지의 장변 상한 — srcset 후보의 폭 기술자로 쓴다. */
export const BASE_VARIANT_WIDTH = 2560

const WEBP_SUFFIX = /\.webp$/i

/**
 * 변형본은 WebP 로만 만든다. 변환에 실패해 원본(JPG/PNG)이 서빙되는 이미지는
 * 변형본이 존재하지 않으므로 srcset 을 만들지 않는다.
 */
const hasVariants = (imageUrl: string): boolean => WEBP_SUFFIX.test(imageUrl)

/** `/api/posts/images/uuid.webp` → `/api/posts/images/uuid_w640.webp` */
export const photoVariantUrl = (imageUrl: string, width: number): string =>
  imageUrl.replace(WEBP_SUFFIX, `_w${width}.webp`)

/**
 * `<img srcSet>` 값. 변형본을 만들 수 없는 주소면 undefined 를 돌려주어
 * 호출부가 src 만 쓰도록 둔다.
 */
export const photoSrcSet = (imageUrl: string | null | undefined): string | undefined => {
  if (!imageUrl || !hasVariants(imageUrl)) return undefined
  const candidates = VARIANT_WIDTHS.map((width) => `${photoVariantUrl(imageUrl, width)} ${width}w`)
  candidates.push(`${imageUrl} ${BASE_VARIANT_WIDTH}w`)
  return candidates.join(', ')
}

/**
 * 기본 `src` — srcset 을 지원하지 않는 환경의 폴백이자 초기 로드 대상이다.
 * 변형본이 있으면 그 폭을, 없으면 본 이미지를 쓴다.
 */
export const photoSrc = (imageUrl: string, width: number): string =>
  hasVariants(imageUrl) ? photoVariantUrl(imageUrl, width) : imageUrl

/**
 * 목록 그리드의 `sizes`.
 * 컨테이너가 max-w-[1400px], 3열(640px 미만은 2열), 사이 간격 8px 이라
 * 가장 넓을 때 한 칸이 약 445px 다.
 */
export const PHOTO_GRID_SIZES = '(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 445px'

/**
 * 상세·모달 캐러셀의 `sizes`.
 * 모달 폭 max-w-[1280px] 에서 오른쪽 정보 칸(최대 420px)을 뺀 값이 사진 칸의 상한이다.
 */
export const PHOTO_DETAIL_SIZES = '(max-width: 1024px) 100vw, 860px'
