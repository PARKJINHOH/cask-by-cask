package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.SpiritImage;
import io.swagger.v3.oas.annotations.media.Schema;

public record SpiritImageResponse(
        @Schema(description = "이미지 고유 ID")
        Long id,
        @Schema(description = "이미지 URL")
        String imageUrl,
        @Schema(description = "대표 이미지 여부")
        Boolean isPrimary,
        @Schema(description = "이미지 정렬 순서 (낮을수록 앞에 표시)")
        Integer sortOrder
) {
    public static SpiritImageResponse from(SpiritImage image) {
        return new SpiritImageResponse(
                image.getId(),
                image.getImageUrl(),
                image.getIsPrimary(),
                image.getSortOrder()
        );
    }
}
