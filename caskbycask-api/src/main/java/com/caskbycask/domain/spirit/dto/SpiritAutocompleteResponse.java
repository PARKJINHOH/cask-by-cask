package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record SpiritAutocompleteResponse(
        Long id,
        String nameKo,
        String nameEn,
        String seriesIdentifier,
        String seriesIdentifierEn,
        Long parentId,
        VariantType variantType,
        String variantValue,
        String variantValueEn,
        Integer displayOrder,
        SpiritCategory category,
        Integer vintageYear,
        WineVintageStatus vintageStatus,
        BigDecimal abv,
        BigDecimal avgScore,
        Integer reviewCount,
        String imageUrl,
        String canonicalPathKo,
        String canonicalPathEn
) {
    public SpiritAutocompleteResponse(Long id, String nameKo, String nameEn,
                                      String seriesIdentifier, String seriesIdentifierEn,
                                      Long parentId, VariantType variantType,
                                      String variantValue, String variantValueEn, Integer displayOrder,
                                      SpiritCategory category, Integer vintageYear,
                                      WineVintageStatus vintageStatus,
                                      BigDecimal abv, BigDecimal avgScore,
                                      Integer reviewCount, String imageUrl,
                                      String parentImageUrl) {
        this(
                id,
                nameKo,
                nameEn,
                seriesIdentifier,
                seriesIdentifierEn,
                parentId,
                variantType,
                variantValue,
                variantValueEn,
                displayOrder,
                category,
                vintageYear,
                vintageStatus,
                abv,
                avgScore,
                reviewCount,
                imageUrl != null ? imageUrl : parentImageUrl,
                SpiritSlugUtils.canonicalPathKo(
                        id, nameKo, seriesIdentifier, variantType, variantValue,
                        category, vintageYear, vintageStatus),
                SpiritSlugUtils.canonicalPathEn(
                        id, nameKo, nameEn, seriesIdentifier, seriesIdentifierEn,
                        variantType, variantValue, variantValueEn,
                        category, vintageYear, vintageStatus
                )
        );
    }
}
