package com.caskbycask.domain.wishlist.dto;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

public record WishlistSpiritResponse(
        @Schema(description = "술 고유 ID")
        Long id,
        @Schema(description = "한글 제품명")
        String nameKo,
        @Schema(description = "영문 제품명")
        String nameEn,
        @Schema(description = "Edition list display series identifier")
        String seriesIdentifier,
        @Schema(description = "카테고리")
        SpiritCategory category,
        @Schema(description = "대표 이미지 URL")
        String primaryImageUrl,
        @Schema(description = "전체 리뷰 평균 점수")
        BigDecimal avgScore
) {
    public static WishlistSpiritResponse of(Spirit spirit, String primaryImageUrl) {
        return new WishlistSpiritResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getSeriesIdentifier(),
                spirit.getCategory(),
                primaryImageUrl,
                spirit.getAvgScore()
        );
    }
}
