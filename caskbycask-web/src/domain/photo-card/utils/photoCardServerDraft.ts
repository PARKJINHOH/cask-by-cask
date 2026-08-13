import type {
  PhotoCardLayout,
  PhotoCardSpiritInfo,
  PhotoCardUserInput,
  PhotoExif,
} from '../types/photoCard.types'
import type { PhotoCardDraft } from './photoCardDraft'
import { normalizeLayout } from './layoutSchema'
import type { PhotoTransform } from './photoCardRender'

/**
 * 서버 임시저장에 담기는 것 — 사진을 뺀 나머지 전부.
 *
 * 사진은 파일로 따로 올린다(JSON 에 base64 로 넣으면 30MB 사진이 40MB 문자열이 된다).
 * 여기 있는 것은 되살릴 때 필요한 값뿐이다 — 선택·잠금·되돌리기 기록은 편집 보조라 담지 않는다.
 * 브라우저에 잠시 맡기는 {@link PhotoCardDraft} 와 같은 내용이라, 되살리는 길도 그쪽과 공유한다.
 */
export interface PhotoCardDraftContent {
  /** 담는 모양이 바뀌면 올린다. 모르는 버전은 되살리지 않는다. */
  version: number
  layout: PhotoCardLayout
  photoTransform: PhotoTransform
  exif: PhotoExif | null
  spirit: PhotoCardSpiritInfo | null
  user: PhotoCardUserInput
  /** 되살린 사진에 붙일 이름. 표시용일 뿐 편집에는 쓰이지 않는다. */
  photoName: string | null
}

const CONTENT_VERSION = 1

/** 서버 상한(10MB)보다 넉넉히 아래 — 멀티파트 경계·JSON 파트까지 함께 올라간다. */
const PHOTO_UPLOAD_MAX_BYTES = 9 * 1024 * 1024

/**
 * 다시 굽지 않고 그대로 올릴 수 있는 형식.
 *
 * 서버는 확장자와 실제 바이트가 맞는지 본다 — 확장자 없는 이름("IMG_0001")으로 올리면 거부되므로
 * 형식에 맞는 이름을 새로 붙여 보낸다.
 */
const REUSABLE_PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * 다시 구울 때 시도하는 순서 — [긴 변(px), 품질].
 *
 * 처음 것이 원본에 가장 가깝다. 상한을 넘으면 품질을 낮추고, 그래도 크면 크기를 줄인다.
 * 편집기가 이미 4096px 로 줄여 물고 있으므로 대개 첫 시도에서 끝난다.
 */
const ENCODE_STEPS: [number, number][] = [
  [4096, 0.92], [4096, 0.8], [3072, 0.8], [2048, 0.75],
]

/** 목록 미리보기 크기 — 패널의 썸네일이 64px 이라 화면 배율을 감안해도 이 정도면 충분하다. */
const THUMBNAIL_MAX_EDGE = 360
const THUMBNAIL_QUALITY = 0.7
/** data URI 상한 — 서버 상한(300KB) 아래. 넘으면 미리보기 없이 저장한다. */
const THUMBNAIL_MAX_LENGTH = 200_000

export const buildDraftContent = (source: {
  layout: PhotoCardLayout
  photoTransform: PhotoTransform
  exif: PhotoExif | null
  spirit: PhotoCardSpiritInfo | null
  userInput: PhotoCardUserInput
  photoFile: File | null
}): string => JSON.stringify({
  version: CONTENT_VERSION,
  layout: normalizeLayout(source.layout),
  photoTransform: { ...source.photoTransform },
  exif: source.exif,
  spirit: source.spirit,
  user: { ...source.userInput },
  photoName: source.photoFile?.name ?? null,
} satisfies PhotoCardDraftContent)

/**
 * JSON 을 거치며 문자열이 된 촬영 시각을 Date 로 되돌린다.
 *
 * {@link PhotoExif}.shotAt 은 Date 인데 JSON 에는 Date 가 없다 — 저장할 때 ISO 문자열이 되고,
 * 그대로 편집기에 얹으면 촬영일을 넣어 둔 카드가 되살아나는 <b>순간</b> 그리기가 터진다
 * (문자열에는 getFullYear 가 없다). 브라우저 임시저장은 구조화 복제라 Date 가 그대로 살아 오므로
 * 이 문제가 없다 — JSON 을 쓰는 이쪽만 되돌려 놓아야 양쪽이 같은 값을 다루게 된다.
 */
const reviveExif = (exif: PhotoExif | null | undefined): PhotoExif | null => {
  if (!exif) return null
  // 타입은 Date 지만 JSON 에서 막 나온 실제 값은 문자열이다.
  const raw = exif.shotAt as Date | string | null
  if (raw == null) return { ...exif, shotAt: null }
  const shotAt = raw instanceof Date ? raw : new Date(raw)
  return { ...exif, shotAt: Number.isNaN(shotAt.getTime()) ? null : shotAt }
}

/** 서버에서 받은 문자열을 되살릴 수 있는 모양인지 확인한다. 아니면 null — 없는 셈 친다. */
export const parseDraftContent = (json: string | null | undefined): PhotoCardDraftContent | null => {
  if (!json) return null
  try {
    const parsed = JSON.parse(json) as Partial<PhotoCardDraftContent>
    if (parsed.version !== CONTENT_VERSION || !parsed.layout) return null
    return { ...parsed, exif: reviveExif(parsed.exif) } as PhotoCardDraftContent
  } catch {
    return null
  }
}

/** 편집기가 아는 모양으로 옮긴다 — 브라우저 임시저장과 되살리는 길이 하나로 유지된다. */
export const toRestorableDraft = (
  content: PhotoCardDraftContent,
  photo: Blob | null,
  savedAt: string,
): PhotoCardDraft => ({
  savedAt: Date.parse(savedAt) || Date.now(),
  layout: content.layout,
  photoTransform: content.photoTransform,
  exif: content.exif ?? null,
  spirit: content.spirit ?? null,
  user: content.user,
  photo,
  photoName: content.photoName,
})

/**
 * 올릴 사진을 만든다.
 *
 * 원본을 그대로 보낼 수 있으면 그렇게 한다 — 되살린 뒤 내보낼 최종 이미지의 원본이라,
 * 임시저장 한 번에 화질이 한 단계씩 깎이면 안 된다. 너무 크거나(서버 상한) 브라우저 밖에서
 * 만들어진 형식(HEIC 등)일 때만 편집기가 들고 있는 그림을 JPEG 로 다시 굽는다.
 *
 * @returns 올릴 파일. 사진이 아예 없으면 null.
 */
export const buildDraftPhotoFile = async (
  file: File | null,
  image: HTMLImageElement | null,
): Promise<File | null> => {
  const extension = file ? REUSABLE_PHOTO_EXTENSIONS[file.type] : undefined
  if (file && extension && file.size <= PHOTO_UPLOAD_MAX_BYTES) {
    return new File([file], `photo.${extension}`, { type: file.type })
  }
  if (!image) return null

  for (const [maxEdge, quality] of ENCODE_STEPS) {
    const blob = await encodeJpeg(image, maxEdge, quality)
    if (blob && blob.size <= PHOTO_UPLOAD_MAX_BYTES) {
      return new File([blob], 'photo.jpg', { type: 'image/jpeg' })
    }
  }
  return null
}

/**
 * 목록에서 어떤 카드인지 알아보게 할 작은 미리보기.
 *
 * 못 만들어도 저장 자체는 계속한다 — 미리보기가 없다고 작업을 못 맡길 이유는 없다.
 */
export const buildDraftThumbnail = async (
  renderToBlob: (
    format: 'image/jpeg', quality: number, maxEdge: number,
  ) => Promise<Blob | null>,
): Promise<string | null> => {
  try {
    const blob = await renderToBlob('image/jpeg', THUMBNAIL_QUALITY, THUMBNAIL_MAX_EDGE)
    if (!blob) return null
    const dataUri = await blobToDataUri(blob)
    return dataUri && dataUri.length <= THUMBNAIL_MAX_LENGTH ? dataUri : null
  } catch {
    return null
  }
}

/**
 * 목록에 뜰 이름.
 *
 * 저장할 때마다 이름을 묻지 않는다 — 임시저장은 손이 가벼워야 한다.
 * 카드가 이미 알고 있는 것(주류·장소)에서 짓고, 아무것도 없으면 저장한 날짜로 둔다.
 */
export const suggestDraftName = (
  spirit: PhotoCardSpiritInfo | null,
  user: PhotoCardUserInput,
): string => {
  const candidate = spirit?.nameKo?.trim() || spirit?.nameEn?.trim() || user.place?.trim()
  if (candidate) return candidate.slice(0, 100)
  return new Date().toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

const encodeJpeg = (
  image: HTMLImageElement, maxEdge: number, quality: number,
): Promise<Blob | null> => new Promise((resolve) => {
  const longEdge = Math.max(image.naturalWidth, image.naturalHeight)
  const scale = longEdge > maxEdge ? maxEdge / longEdge : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    resolve(null)
    return
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
})

const blobToDataUri = (blob: Blob): Promise<string | null> => new Promise((resolve) => {
  const reader = new FileReader()
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
  reader.onerror = () => resolve(null)
  reader.readAsDataURL(blob)
})
