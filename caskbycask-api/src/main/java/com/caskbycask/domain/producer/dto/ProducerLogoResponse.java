package com.caskbycask.domain.producer.dto;

import com.caskbycask.domain.producer.entity.ProducerLogoImage;
import io.swagger.v3.oas.annotations.media.Schema;

public record ProducerLogoResponse(
        @Schema(description = "로고 이미지 ID")
        Long id,
        @Schema(description = "로고 이미지 URL")
        String imageUrl,
        @Schema(description = "정렬 순서 — 0번이 대표(포토카드 자동 채움 시 우선 사용)")
        Integer sortOrder
) {
    public static ProducerLogoResponse from(ProducerLogoImage image) {
        return new ProducerLogoResponse(image.getId(), image.getImageUrl(), image.getSortOrder());
    }
}
