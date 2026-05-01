package com.drinkindex.domain.wishlist.dto;

import com.drinkindex.domain.wishlist.entity.enums.WishlistType;
import jakarta.validation.constraints.NotNull;

public record WishlistRequest(
        @NotNull(message = "spiritId는 필수입니다.") Long spiritId,
        @NotNull(message = "type은 필수입니다.") WishlistType type
) {}
