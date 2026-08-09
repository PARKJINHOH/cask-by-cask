package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.enums.AromaProfilePhase;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;

import java.util.List;

public record AromaProfileRequest(
        @Schema(description = "프로파일 구간 (NOSE/PALATE/FINISH)")
        AromaProfilePhase phase,
        @Schema(description = "프로파일 스키마 버전", example = "1")
        Integer schemaVersion,
        @Valid
        List<AromaProfileItemRequest> items
) {}
