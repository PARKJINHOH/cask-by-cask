import type { PhotoExif } from '../types/photoCard.types'

/**
 * 사진에서 촬영 정보를 읽는다.
 *
 * ⚠️ `pick` 옵션을 쓰면 안 된다.
 *   exifr 의 lite 빌드에는 태그 이름 → 코드 사전이 들어 있지 않아 `pick` 을 넘기면
 *   "undefined is not iterable" 로 파싱 자체가 실패한다(전부 빈 값이 된다).
 *   대신 읽을 블록만 켜고, 필요한 값은 결과에서 골라 쓴다.
 *
 * exifr 은 포토카드 페이지에서만 필요하므로 동적 import 한다 — 다른 페이지 번들에 들어가지 않는다.
 * lite 빌드(44KB)로 카메라·렌즈·노출·GPS 까지 모두 읽힌다.
 */
const PARSE_OPTIONS = {
  tiff: true,   // 제조사·모델
  ifd0: true,
  exif: true,   // 노출·렌즈·촬영 시각
  gps: true,    // 촬영 위치 — 카드에 넣을지는 사용자가 ＋ 로 직접 고른다
  interop: false,
  thumbnail: false,
  translateKeys: true,
  translateValues: true,
  reviveValues: true,
} as const

const EMPTY_EXIF: PhotoExif = {
  cameraMake: null,
  cameraModel: null,
  lensModel: null,
  aperture: null,
  shutterSpeed: null,
  iso: null,
  focalLength: null,
  focalLength35: null,
  latitude: null,
  longitude: null,
  shotAt: null,
}

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/\0/g, '')
  return trimmed.length > 0 ? trimmed : null
}

const num = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/** 위경도는 0 과 음수도 유효한 값이라 별도로 다룬다. */
const coord = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * EXIF 는 JPEG 의 맨 앞(SOI 직후 APP1)에 있다. 6MB 짜리 사진을 통째로 읽을 이유가 없어
 * 앞부분만 잘라 파싱하고, 거기서 못 찾으면 그때 전체를 본다.
 */
const HEADER_BYTES = 512 * 1024

export const readPhotoExif = async (file: Blob): Promise<PhotoExif> => {
  try {
    const exifr = await import('exifr/dist/lite.esm.mjs')
    const parse = (exifr as { parse?: unknown }).parse
      ?? (exifr as { default?: { parse?: unknown } }).default?.parse
    if (typeof parse !== 'function') return EMPTY_EXIF

    // File 을 그대로 넘기면 exifr 이 FileReader 경로를 타는데, 브라우저마다 동작이 갈리고
    // 테스트 환경(Node)에는 FileReader 자체가 없다. 바이트를 직접 넘겨 경로를 하나로 고정한다.
    const run = parse as (
      input: Uint8Array, options: unknown,
    ) => Promise<Record<string, unknown> | undefined>

    let raw = await run(new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer()), PARSE_OPTIONS)
    if (!raw?.Make && !raw?.Model && file.size > HEADER_BYTES) {
      raw = await run(new Uint8Array(await file.arrayBuffer()), PARSE_OPTIONS)
    }
    if (!raw) return EMPTY_EXIF

    const shotAtRaw = raw.DateTimeOriginal ?? raw.CreateDate
    const shotAt = shotAtRaw instanceof Date && !Number.isNaN(shotAtRaw.getTime())
      ? shotAtRaw
      : null

    return {
      cameraMake: text(raw.Make),
      cameraModel: text(raw.Model),
      lensModel: text(raw.LensModel),
      aperture: num(raw.FNumber),
      shutterSpeed: num(raw.ExposureTime),
      iso: num(raw.ISO) ?? num(raw.ISOSpeedRatings),
      focalLength: num(raw.FocalLength),
      focalLength35: num(raw.FocalLengthIn35mmFormat),
      latitude: coord(raw.latitude),
      longitude: coord(raw.longitude),
      shotAt,
    }
  } catch {
    // EXIF 가 없거나(스크린샷·메신저로 받은 사진) 포맷을 못 읽어도 편집은 계속돼야 한다.
    return EMPTY_EXIF
  }
}

// ── 표기 포맷 ────────────────────────────────────────────────

/** "SONY α7C II" — 제조사가 모델명에 이미 들어 있으면 중복을 뺀다. */
export const formatCamera = (exif: PhotoExif | null): string => {
  if (!exif) return ''
  const make = exif.cameraMake ?? ''
  const model = exif.cameraModel ?? ''
  if (!make) return model
  if (!model) return make
  const firstWord = make.split(/\s+/)[0].toLowerCase()
  return model.toLowerCase().startsWith(firstWord) ? model : `${make} ${model}`
}

export const formatAperture = (value: number | null): string =>
  value ? `ƒ/${Number.isInteger(value) ? value : Number(value.toFixed(1))}` : ''

/** 1초 미만은 분수(1/250s), 이상은 소수(2.5s)로 — 사진 쪽 관용 표기다. */
export const formatShutter = (value: number | null): string => {
  if (!value) return ''
  if (value >= 1) return `${Number.isInteger(value) ? value : value.toFixed(1)}s`
  return `1/${Math.round(1 / value)}s`
}

export const formatIso = (value: number | null): string => (value ? `ISO ${Math.round(value)}` : '')

export const formatFocalLength = (value: number | null): string =>
  value ? `${Math.round(value * 10) / 10}mm` : ''

/** 휴대폰은 실제 초점거리(6.5mm)보다 35mm 환산(23mm)이 사진 이야기에 맞는다. */
export const formatFocalLength35 = (value: number | null): string =>
  value ? `${Math.round(value)}mm` : ''

export const formatShotAt = (value: Date | null): string => {
  if (!value) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}.${pad(value.getMonth() + 1)}.${pad(value.getDate())}`
}

/**
 * 촬영 위치. "37.4006°N 126.9431°E"
 *
 * 사진에 남아 있는 좌표를 그대로 카드에 박으면 집·직장이 드러날 수 있다.
 * 그래서 읽어 두기만 하고, 카드에 넣는 것은 사용자가 ＋ 를 눌렀을 때만이다.
 */
export const formatGps = (latitude: number | null, longitude: number | null): string => {
  if (latitude == null || longitude == null) return ''
  const ns = latitude >= 0 ? 'N' : 'S'
  const ew = longitude >= 0 ? 'E' : 'W'
  return `${Math.abs(latitude).toFixed(4)}°${ns} ${Math.abs(longitude).toFixed(4)}°${ew}`
}
