import type { YoutubeVideoType } from '../types/youtube.types'

/**
 * 유튜브 썸네일 주소 계산.
 *
 * 서버가 저장해 둔 썸네일 URL 도 있지만, 화면 크기에 맞는 변형이 필요할 때는 영상 ID 로 직접 만든다
 * (유튜브 썸네일은 영상 ID 만 알면 규칙적으로 주소가 정해진다).
 *
 * 비율이 중요하다:
 * - `hqdefault` 는 **항상 480×360(4:3)** 이고 실제 영상이 가운데 들어간다.
 *   가로 영상은 위아래에, 세로 숏츠는 좌우에 검은 띠가 생긴다.
 * - 그래서 `object-cover` 로 자르면 띠가 정확히 잘려 나간다 —
 *   16:9 카드에서는 480×270 이, 9:16 카드에서는 202×360 이 남는데 이게 곧 원본 프레임이다.
 * - `maxresdefault`(1280×720)는 화질이 좋지만 **없는 영상이 있다**. 그래서 기본값이 아니라
 *   큰 화면에서만 먼저 시도하고, 실패하면 `hqdefault` 로 되돌린다({@link fallbackThumbnail}).
 * - 없는 `maxresdefault` 는 404 와 함께 디코딩 가능한 120×90 "Not Found" JPEG 를 내려 주기도 한다.
 *   이때는 `<img onError>` 가 발생하지 않으므로 `onLoad` 에서 크기도 함께 검사해야 한다.
 */

const BASE = 'https://i.ytimg.com/vi'

/**
 * 목록 카드용.
 *
 * `maxresdefault`(1280×720)를 먼저 쓴다 — 데스크톱 타일이 460px 안팎이라
 * `hqdefault` 를 16:9 로 자른 480×270 으로는 눈에 띄게 뭉갠다.
 * 없는 영상에서는 404 또는 120×90 Not Found 이미지가 오므로
 * {@link handleThumbnailError} 와 {@link handleThumbnailLoad} 를 모두 걸 것.
 */
export const gridThumbnail = (videoKey: string): string =>
  `${BASE}/${videoKey}/maxresdefault.jpg`

/** 상세·큰 카드용. 목록과 같은 주소라 이미 받아 둔 이미지를 그대로 재사용한다. */
export const largeThumbnail = (videoKey: string): string =>
  `${BASE}/${videoKey}/maxresdefault.jpg`

/**
 * `maxresdefault` 가 없을 때 되돌아갈 주소.
 * <p>같은 주소로 다시 떨어지면 무한 루프가 되므로 호출 측에서 한 번만 바꾸도록 비교해 쓴다.
 */
export const fallbackThumbnail = (videoKey: string): string =>
  `${BASE}/${videoKey}/hqdefault.jpg`

/** 카드 비율 — 숏츠는 세로(9:16), 일반 영상은 가로(16:9). */
export const aspectRatioFor = (videoType: YoutubeVideoType): number =>
  videoType === 'SHORTS' ? 9 / 16 : 16 / 9

/**
 * `<img onError>` 핸들러. 고화질 썸네일이 없는 영상에서 깨진 이미지 대신 기본 썸네일을 보여 준다.
 * 이미 되돌린 뒤라면 아무 것도 하지 않는다(같은 주소로 계속 재시도하지 않게).
 */
export const handleThumbnailError = (
  image: HTMLImageElement,
  videoKey: string,
): void => {
  const fallback = fallbackThumbnail(videoKey)
  if (image.src.endsWith('/hqdefault.jpg')) return
  image.src = fallback
}

/**
 * `<img onLoad>` 핸들러. YouTube 는 없는 `maxresdefault` 요청에 404 를 반환하면서도
 * 본문에는 디코딩 가능한 120×90 Not Found JPEG 를 담을 수 있다. 브라우저가 이를 정상 이미지로
 * 처리하면 `onError` 가 오지 않으므로, 그 고정 크기를 감지해 기본 썸네일로 되돌린다.
 */
export const handleThumbnailLoad = (
  image: HTMLImageElement,
  videoKey: string,
): void => {
  if (image.src.endsWith('/hqdefault.jpg')) return
  if (image.naturalWidth !== 120 || image.naturalHeight !== 90) return
  image.src = fallbackThumbnail(videoKey)
}
