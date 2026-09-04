package com.caskbycask.domain.venue.dto;

import com.caskbycask.domain.venue.entity.VenueCommentImage;
import io.swagger.v3.oas.annotations.media.Schema;

public record VenueCommentImageResponse(
        @Schema(description = "이미지 고유 ID. 수정 시 imagePlan 에 그대로 실어 보낸다")
        Long id,
        @Schema(description = "서빙 URL")
        String imageUrl,
        @Schema(description = "노출 순서(0부터)")
        Integer sortOrder
) {
    public static VenueCommentImageResponse from(VenueCommentImage image) {
        return new VenueCommentImageResponse(image.getId(), image.getImageUrl(), image.getSortOrder());
    }
}
