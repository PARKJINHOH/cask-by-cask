package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.ReviewAromaProfile;
import com.caskbycask.domain.review.entity.enums.AromaProfilePhase;

import java.util.List;

public record AromaProfileResponse(
        AromaProfilePhase phase,
        Integer schemaVersion,
        List<AromaProfileItemResponse> items
) {
    public static AromaProfileResponse from(ReviewAromaProfile profile) {
        return new AromaProfileResponse(
                profile.getPhase(),
                profile.getSchemaVersion(),
                profile.getItems().stream().map(AromaProfileItemResponse::from).toList()
        );
    }
}
