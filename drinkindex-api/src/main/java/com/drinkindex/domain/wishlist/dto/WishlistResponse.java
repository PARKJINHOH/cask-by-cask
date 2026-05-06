package com.drinkindex.domain.wishlist.dto;

import com.drinkindex.domain.wishlist.entity.Wishlist;
import com.drinkindex.domain.wishlist.entity.enums.WishlistType;
import io.swagger.v3.oas.annotations.media.Schema;

public record WishlistResponse(
        @Schema(description = "위시리스트 항목 고유 ID")
        Long id,
        @Schema(description = "위시리스트 유형 (TRIED, WISHLIST, COLLECTION)")
        WishlistType type,
        @Schema(description = "술 정보")
        WishlistSpiritResponse spirit
) {
    public static WishlistResponse of(Wishlist wishlist, String primaryImageUrl) {
        return new WishlistResponse(
                wishlist.getId(),
                wishlist.getType(),
                WishlistSpiritResponse.of(wishlist.getSpirit(), primaryImageUrl)
        );
    }
}
