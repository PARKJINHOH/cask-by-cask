package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.enums.AromaType;
import io.swagger.v3.oas.annotations.media.Schema;

public record AromaProfileItemRequest(
        @Schema(description = "아로마 참조 유형 (ID/CUSTOM)")
        AromaType aromaType,
        @Schema(description = "기존 아로마 ID 또는 사용자가 입력한 아로마")
        String aromaKey,
        @Schema(description = "리뷰 저장 시점에 표시할 아로마명")
        String labelSnapshot,
        @Schema(description = "강도 (1~5)")
        Integer intensity
) {}
