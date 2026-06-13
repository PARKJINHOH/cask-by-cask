package com.caskbycask.domain.wishlist.dto;

import com.caskbycask.domain.wishlist.entity.enums.WishlistType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record WishlistRequest(
        @Schema(description = "추가할 술 고유 ID")
        @NotNull(message = "spiritId는 필수입니다.") Long spiritId,
        @Schema(description = "위시리스트 유형 (TRIED, WISHLIST, COLLECTION)")
        @NotNull(message = "type은 필수입니다.") WishlistType type
) {}
