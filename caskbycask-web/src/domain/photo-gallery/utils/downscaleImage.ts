/**
 * 업로드 직전 사진 축소.
 *
 * 서버도 장변 2560 으로 자르지만(PostImageService), 클라이언트에서 먼저 줄이면
 * 모바일 업로드 시간과 데이터가 줄고 10MB 업로드 상한에 걸릴 일도 없다.
 *
 * ⚠️ 출력은 **JPEG** 로 고정한다. WebP 로 올리면
 *   - 서버의 ImageDimensionReader(JDK ImageIO)가 크기를 읽지 못해 width/height 가 null 이 되고
 *     (목록 그리드가 비율을 몰라 4:5 로 폴백 → 로드 후 레이아웃이 튄다),
 *   - WebpConversionService 가 webp 를 변환 대상에서 제외해 서버 재인코딩도 건너뛴다.
 *   JPEG 로 올리면 기존 파이프라인(크기 측정 → WebP 변환 → 축소본 생성)이 그대로 동작한다.
 */

/** 서버의 PostImageService.MAX_STORED_EDGE 와 같은 값. */
export const UPLOAD_MAX_EDGE = 2560
const JPEG_QUALITY = 0.92

/** 이 크기 이하로는 굳이 재인코딩하지 않는다 — 원본을 그대로 보내는 편이 화질에 낫다. */
const REENCODE_MIN_BYTES = 1024 * 1024

const canDownscale = (file: File): boolean =>
  typeof createImageBitmap === 'function' && file.type.startsWith('image/')

/**
 * 장변이 {@link UPLOAD_MAX_EDGE} 를 넘으면 비율을 유지해 줄인 JPEG 로 바꾼다.
 *
 * 줄일 필요가 없거나(작은 사진), 축소가 실패하거나, 결과가 오히려 더 크면 **원본 File 을 그대로** 돌려준다.
 * 업로드를 막지 않는 것이 이 함수의 계약이다.
 */
export const downscaleImageFile = async (file: File): Promise<File> => {
  if (!canDownscale(file)) return file

  let bitmap: ImageBitmap
  try {
    // EXIF 회전을 픽셀에 굽는다 — 캔버스로 다시 그리면 EXIF 방향 정보가 사라지므로,
    // 이걸 빼면 세로로 찍은 사진이 눕는다.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height)
    // 이미 충분히 작고 용량도 부담이 없으면 원본이 최선이다(재인코딩은 손실만 더한다).
    if (longestEdge <= UPLOAD_MAX_EDGE && file.size <= REENCODE_MIN_BYTES) return file

    const ratio = Math.min(1, UPLOAD_MAX_EDGE / longestEdge)
    const width = Math.max(1, Math.round(bitmap.width * ratio))
    const height = Math.max(1, Math.round(bitmap.height * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file

    // JPEG 는 알파가 없다 — 투명 PNG 가 검게 나오지 않도록 흰 바탕을 먼저 깐다.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    })
    if (!blob || blob.size >= file.size) return file

    return new File([blob], toJpegName(file.name), { type: 'image/jpeg' })
  } catch {
    return file
  } finally {
    bitmap.close()
  }
}

/** 서버가 확장자와 매직 바이트의 일치를 요구하므로 이름도 .jpg 로 맞춘다. */
const toJpegName = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.')
  const base = dot > 0 ? fileName.slice(0, dot) : fileName
  return `${base || 'photo'}.jpg`
}
