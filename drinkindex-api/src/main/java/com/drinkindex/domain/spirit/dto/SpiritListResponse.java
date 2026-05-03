package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;

import java.math.BigDecimal;

public record SpiritListResponse(
        Long id,
        String nameKo,
        String nameEn,
        SpiritCategory category,
        String country,
        BigDecimal abv,
        BigDecimal avgScore,
        Integer reviewCount,
        String primaryImageUrl,
        SpiritStatus status
) {
    public static SpiritListResponse of(Spirit spirit, String primaryImageUrl) {
        return new SpiritListResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory(),
                spirit.getCountry(),
                spirit.getAbv(),
                spirit.getAvgScore(),
                spirit.getReviewCount(),
                primaryImageUrl,
                spirit.getStatus()
        );
    }
}
