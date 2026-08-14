import type {
  PhotoCardAromaPhase,
  PhotoCardAromaProfile,
  PhotoCardImageSource,
  PhotoCardReviewInfo,
} from '../types/photoCard.types'

const WIDTH = 240
const HEIGHT = 180
const CENTER_X = 120
const CENTER_Y = 88
const RADIUS = 52

const phaseOf = (source: PhotoCardImageSource | undefined): PhotoCardAromaPhase | null => {
  switch (source) {
    case 'REVIEW_AROMA_NOSE': return 'NOSE'
    case 'REVIEW_AROMA_TASTE': return 'PALATE'
    case 'REVIEW_AROMA_FINISH': return 'FINISH'
    default: return null
  }
}

const xml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const polarPoint = (index: number, count: number, radius: number) => {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count
  return {
    x: CENTER_X + Math.cos(angle) * radius,
    y: CENTER_Y + Math.sin(angle) * radius,
  }
}

const points = (count: number, radius: number): string =>
  Array.from({ length: count }, (_, index) => {
    const point = polarPoint(index, count, radius)
    return `${point.x.toFixed(2)},${point.y.toFixed(2)}`
  }).join(' ')

/**
 * 리뷰 수치로부터 결정적으로 생성되는 읽기 전용 레이더 이미지.
 * 레이어에는 이 data URL을 저장하지 않는다. 그래야 템플릿을 다른 리뷰에 적용할 때
 * 과거 그림이 남지 않고 그 리뷰의 값으로 다시 생성된다.
 */
export const reviewAromaImageDataUrl = (profile: PhotoCardAromaProfile): string | null => {
  if (profile.items.length === 0) return null
  const count = Math.max(3, profile.items.length)
  const guide = Array.from({ length: 5 }, (_, level) => (
    `<polygon points="${points(count, RADIUS * ((level + 1) / 5))}" fill="none" stroke="#d5b06a" stroke-opacity="0.32" stroke-width="0.7"/>`
  )).join('')
  const axes = Array.from({ length: count }, (_, index) => {
    const point = polarPoint(index, count, RADIUS)
    return `<line x1="${CENTER_X}" y1="${CENTER_Y}" x2="${point.x.toFixed(2)}" y2="${point.y.toFixed(2)}" stroke="#d5b06a" stroke-opacity="0.24" stroke-width="0.65"/>`
  }).join('')
  const valueCoordinates = Array.from({ length: count }, (_, index) => {
    const item = profile.items[index]
    const intensity = item ? Math.max(0, Math.min(5, item.intensity)) : 0
    return polarPoint(index, count, RADIUS * (intensity / 5))
  })
  const valuePoints = valueCoordinates
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ')
  const vertices = valueCoordinates
    .map((point) => `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="1.8" fill="#b58232"/>`)
    .join('')
  const labels = profile.items.map((item, index) => {
    const point = polarPoint(index, count, RADIUS + 13)
    const anchor = point.x < CENTER_X - 5 ? 'end' : point.x > CENTER_X + 5 ? 'start' : 'middle'
    const dy = point.y < CENTER_Y - 12 ? -2 : point.y > CENTER_Y + 12 ? 7 : 3
    return `<text x="${point.x.toFixed(2)}" y="${(point.y + dy).toFixed(2)}" text-anchor="${anchor}" fill="#5f6873" font-size="8" font-family="Pretendard, sans-serif">${xml(item.label)}</text>`
  }).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><text x="${CENTER_X}" y="12" text-anchor="middle" fill="#b47719" font-size="11" font-weight="700" font-family="Pretendard, sans-serif">${xml(profile.title)}</text>${guide}${axes}<polygon points="${valuePoints}" fill="#b5823233" stroke="#b58232" stroke-width="1.25" stroke-linejoin="round"/>${vertices}${labels}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const resolveReviewAromaImageUrl = (
  source: PhotoCardImageSource | undefined,
  review: PhotoCardReviewInfo | null,
): string | null => {
  const phase = phaseOf(source)
  if (!phase) return null
  const profile = review?.aromaProfiles?.find((item) => item.phase === phase)
  return profile ? reviewAromaImageDataUrl(profile) : null
}
