import type {
  PhotoCardBinding,
  PhotoCardDataContext,
  PhotoCardLayer,
} from '../types/photoCard.types'
import {
  formatAperture,
  formatCamera,
  formatFocalLength,
  formatFocalLength35,
  formatGps,
  formatIso,
  formatShotAt,
  formatShutter,
} from './exifReader'
import { resolveReviewAromaImageUrl } from './reviewAromaImage'

/** 주류 검색 결과로 채워지는 자리인가 — 주류를 새로 고르면 값이 통째로 바뀐다. */
export const isSpiritBinding = (binding: PhotoCardBinding | undefined): boolean =>
  binding != null && (binding.startsWith('SPIRIT_') || binding.startsWith('PRODUCER_'))

/**
 * 바인딩이 가리키는 실제 문자열을 만든다.
 *
 * 자동으로 채워진 값이라도 사용자가 고칠 수 있다 — 고친 순간 `overridden` 이 켜지고,
 * 그 뒤로는 사진이나 주류를 바꿔도 사용자가 쓴 문구를 유지한다.
 * (미등록 주류를 손으로 적거나, 라벨 표기와 DB 표기가 다를 때 필요하다)
 */
export const resolveBindingValue = (
  binding: PhotoCardBinding | undefined,
  context: PhotoCardDataContext,
): string => {
  const { exif, spirit, review, user } = context
  switch (binding) {
    case 'EXIF_CAMERA': return formatCamera(exif)
    case 'EXIF_LENS': return exif?.lensModel ?? ''
    case 'EXIF_APERTURE': return formatAperture(exif?.aperture ?? null)
    case 'EXIF_SHUTTER': return formatShutter(exif?.shutterSpeed ?? null)
    case 'EXIF_ISO': return formatIso(exif?.iso ?? null)
    case 'EXIF_FOCAL_LENGTH': return formatFocalLength(exif?.focalLength ?? null)
    case 'EXIF_FOCAL_LENGTH_35': return formatFocalLength35(exif?.focalLength35 ?? null)
    case 'EXIF_SHOT_AT': return formatShotAt(exif?.shotAt ?? null)
    case 'EXIF_GPS': return formatGps(exif?.latitude ?? null, exif?.longitude ?? null)

    case 'SPIRIT_NAME_KO': return spirit?.nameKo ?? ''
    case 'SPIRIT_NAME_EN': return spirit?.nameEn ?? ''
    case 'SPIRIT_ABV': return spirit?.abv ? `${spirit.abv}%` : ''
    case 'SPIRIT_VOLUME': return spirit?.volumeMl ? `${spirit.volumeMl}ml` : ''
    case 'SPIRIT_VINTAGE': return spirit?.vintageYear ?? ''
    case 'SPIRIT_CATEGORY': return spirit?.category ?? ''
    case 'SPIRIT_REGION': return spirit?.region ?? ''
    case 'SPIRIT_DETAIL': return spirit?.detail ?? ''

    case 'PRODUCER_NAME_KO': return spirit?.producerNameKo ?? ''
    case 'PRODUCER_NAME_EN': return spirit?.producerNameEn ?? ''
    case 'PRODUCER_COUNTRY': return spirit?.producerCountry ?? ''

    case 'REVIEW_TOTAL_SCORE': return review?.totalScore ?? ''
    case 'REVIEW_NOSE_SCORE': return review?.noseScore ?? ''
    case 'REVIEW_TASTE_SCORE': return review?.tasteScore ?? ''
    case 'REVIEW_FINISH_SCORE': return review?.finishScore ?? ''
    case 'REVIEW_NOSE_NOTE': return review?.noseNote ?? ''
    case 'REVIEW_TASTE_NOTE': return review?.tasteNote ?? ''
    case 'REVIEW_FINISH_NOTE': return review?.finishNote ?? ''
    case 'REVIEW_OVERALL': return review?.overall ?? ''
    case 'REVIEW_AROMA_NOSE': return review?.aromaNose ?? ''
    case 'REVIEW_AROMA_TASTE': return review?.aromaTaste ?? ''
    case 'REVIEW_AROMA_FINISH': return review?.aromaFinish ?? ''
    case 'REVIEW_ATTRIBUTION': return review?.attribution ?? ''

    case 'USER_PLACE': return user.place
    case 'USER_MEMO': return user.memo
    case 'USER_DATE': return user.date

    default: return ''
  }
}

/** 화면·캔버스에 실제로 그려질 문자열. 사용자가 고쳤으면 그 값이 우선한다. */
export const resolveLayerText = (
  layer: PhotoCardLayer,
  context: PhotoCardDataContext,
): string => {
  if (layer.type !== 'TEXT') return ''
  if (layer.overridden || !layer.binding || layer.binding === 'NONE') {
    return layer.text ?? ''
  }
  return resolveBindingValue(layer.binding, context)
}

/** 이미지 레이어가 실제로 가리키는 URL. 없으면 그리지 않는다. */
export const resolveLayerImageUrl = (
  layer: PhotoCardLayer,
  context: PhotoCardDataContext,
): string | null => {
  if (layer.type !== 'IMAGE') return null
  switch (layer.source) {
    case 'PRODUCER_LOGO': return context.spirit?.producerLogoUrl ?? null
    case 'SPIRIT_IMAGE': return context.spirit?.spiritImageUrl ?? null
    case 'UPLOAD': return layer.uploadUrl ?? null
    case 'REVIEW_AROMA_NOSE':
    case 'REVIEW_AROMA_TASTE':
    case 'REVIEW_AROMA_FINISH':
      return resolveReviewAromaImageUrl(layer.source, context.review)
    default: return null
  }
}

/**
 * 실제로 그려질 레이어만 남긴다.
 * 값이 비어 있는 자동 텍스트(EXIF 없는 사진 등)는 조용히 빠진다 —
 * 빈 자리에 밑줄이나 구분선만 남는 어색한 카드를 막는다.
 */
export const getDrawableLayers = (
  layers: PhotoCardLayer[],
  context: PhotoCardDataContext,
): PhotoCardLayer[] =>
  layers.filter((layer) => {
    if (layer.visible === false) return false
    if (layer.type === 'TEXT') return resolveLayerText(layer, context).trim().length > 0
    if (layer.type === 'IMAGE') return Boolean(resolveLayerImageUrl(layer, context))
    // ICON·DIVIDER·BOX 는 참조하는 데이터가 없으므로 항상 그린다.
    return true
  })

/**
 * 캔버스에서 <b>집을 수 있는</b> 요소.
 *
 * 그리는 목록과 다르다 — 방금 얹어 아직 글을 안 쓴 텍스트는 화면에 아무것도 안 그려지지만,
 * 선택해서 옮길 수는 있어야 한다. 그리는 목록으로 히트 테스트를 하면 빈 텍스트가 영영 안 잡힌다.
 *
 * 이미지 레이어는 다르다. 가리키는 그림이 없으면 자리 자체가 없어서, 빈 곳을 눌렀는데
 * 보이지도 않는 요소가 잡히면 그게 더 이상하다 — 그건 레이어 목록에서 고르게 둔다.
 */
export const getSelectableLayers = (
  layers: PhotoCardLayer[],
  context: PhotoCardDataContext,
): PhotoCardLayer[] =>
  layers.filter((layer) => {
    if (layer.visible === false) return false
    if (layer.type === 'IMAGE') return Boolean(resolveLayerImageUrl(layer, context))
    return true
  })
