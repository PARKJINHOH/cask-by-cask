package com.drinkindex.domain.wishlist.dto;

import com.drinkindex.domain.wishlist.entity.Wishlist;
import com.drinkindex.domain.wishlist.entity.enums.WishlistType;

public record WishlistResponse(
        Long id,
        WishlistType type,
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
