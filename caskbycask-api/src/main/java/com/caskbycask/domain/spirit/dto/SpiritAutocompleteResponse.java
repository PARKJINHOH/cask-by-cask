package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
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
                                      SpiritCategory category, BigDecimal abv, BigDecimal avgScore,
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
                abv,
                avgScore,
                reviewCount,
                imageUrl != null ? imageUrl : parentImageUrl,
                SpiritSlugUtils.canonicalPathKo(id, nameKo, seriesIdentifier, variantType, variantValue),
                SpiritSlugUtils.canonicalPathEn(
                        id, nameKo, nameEn, seriesIdentifier, seriesIdentifierEn,
                        variantType, variantValue, variantValueEn
                )
        );
    }
}
