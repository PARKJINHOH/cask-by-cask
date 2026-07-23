import { getLocalizedSpiritListNames } from '@/domain/spirit/utils/spiritDisplayName';
import type { UserBottle } from '../types/userBottle.types';

export function getUserBottleDisplayNames(bottle: UserBottle, language: string) {
  if (!bottle.spiritId) {
    return {
      primaryName: bottle.spiritNameText?.trim() ?? '',
      secondaryName: '',
    };
  }

  const names = getLocalizedSpiritListNames({
    nameKo: bottle.spiritNameKo ?? '',
    nameEn: bottle.spiritNameEn,
    parentId: bottle.parentId,
    seriesIdentifier: bottle.seriesIdentifier,
    seriesIdentifierEn: bottle.seriesIdentifierEn,
    variantValue: bottle.variantValue,
    variantValueEn: bottle.variantValueEn,
    category: bottle.category,
    vintageYear: bottle.vintageYear,
    vintageStatus: bottle.vintageStatus,
  }, language);

  return names.secondaryName === names.primaryName
    ? { ...names, secondaryName: '' }
    : names;
}
