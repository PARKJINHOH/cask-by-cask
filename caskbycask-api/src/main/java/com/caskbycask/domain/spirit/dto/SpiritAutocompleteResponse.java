package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import lombok.Builder;

@Builder
public record SpiritAutocompleteResponse(
        Long id,
        String nameKo,
        String nameEn,
        String seriesIdentifier,
        String seriesIdentifierEn,
        SpiritCategory category,
        String imageUrl,
        String canonicalPathKo,
        String canonicalPathEn
) {
    public SpiritAutocompleteResponse(Long id, String nameKo, String nameEn,
                                      String seriesIdentifier, String seriesIdentifierEn,
                                      SpiritCategory category, String imageUrl,
                                      VariantType variantType, String variantValue, String variantValueEn) {
        this(
                id,
                nameKo,
                nameEn,
                seriesIdentifier,
                seriesIdentifierEn,
                category,
                imageUrl,
                SpiritSlugUtils.canonicalPathKo(id, nameKo, seriesIdentifier, variantType, variantValue),
                SpiritSlugUtils.canonicalPathEn(
                        id, nameKo, nameEn, seriesIdentifier, seriesIdentifierEn,
                        variantType, variantValue, variantValueEn
                )
        );
    }
}
