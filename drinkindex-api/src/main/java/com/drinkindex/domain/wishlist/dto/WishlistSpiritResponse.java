package com.drinkindex.domain.wishlist.dto;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;

import java.math.BigDecimal;

public record WishlistSpiritResponse(
        Long id,
        String nameKo,
        String nameEn,
        SpiritCategory category,
        String primaryImageUrl,
        BigDecimal avgScore
) {
    public static WishlistSpiritResponse of(Spirit spirit, String primaryImageUrl) {
        return new WishlistSpiritResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory(),
                primaryImageUrl,
                spirit.getAvgScore()
        );
    }
}
