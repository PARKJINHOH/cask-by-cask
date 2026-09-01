package com.caskbycask.domain.spirit.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "이미지에 지정할 에디션 목록 — 집합을 통째로 교체한다")
public record SpiritImageVariantAssignRequest(
        @Schema(description = "지정할 하위 에디션 ID 목록. 빈 배열이면 전체 해제(공통 이미지)")
        List<Long> variantIds
) {
}
