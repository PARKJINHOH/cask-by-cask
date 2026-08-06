import type { TFunction } from 'i18next'
import { PHOTO_CARD_ICONS } from '../constants/photoCardIcons'
import type { PhotoCardLayer } from '../types/photoCard.types'

/**
 * 요소가 "무엇인지" 한 마디로.
 *
 * 실제 값이 아니라 <b>자리의 정체</b>를 말한다 — 템플릿 목록처럼 아직 적용하지 않아
 * 값을 알 수 없는 곳에서도 "주류명·조리개가 들어온다"를 보여 줄 수 있어야 한다.
 * 레이어 목록은 값이 있으면 값을 먼저 쓰고, 없을 때 이 이름으로 떨어진다.
 */
export const describeLayer = (layer: PhotoCardLayer, t: TFunction): string => {
  switch (layer.type) {
    case 'TEXT': {
      if (layer.binding && layer.binding !== 'NONE') {
        return t(`photoCard.binding_${layer.binding}`, layer.binding)
      }
      return (layer.text ?? '').trim() || t('photoCard.layerEmptyText')
    }
    case 'ICON':
      return t(PHOTO_CARD_ICONS.find((icon) => icon.key === layer.iconKey)?.labelKey
        ?? 'photoCard.iconSection')
    case 'IMAGE':
      return t(layer.source === 'SPIRIT_IMAGE' ? 'photoCard.imageSourceSpirit'
        : layer.source === 'UPLOAD' ? 'photoCard.imageSourceUpload'
          : 'photoCard.imageSourceLogo')
    case 'BOX':
      return t('photoCard.addBox')
    default:
      return t('photoCard.addDivider')
  }
}
