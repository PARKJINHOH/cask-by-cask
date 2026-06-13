package com.caskbycask.domain.spirit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SpiritImageReorderRequest(
        @Schema(description = "새로운 순서의 이미지 ID 목록 (첫 번째가 대표 이미지가 됩니다)")
        @NotEmpty
        List<Long> imageIds
) {
}
