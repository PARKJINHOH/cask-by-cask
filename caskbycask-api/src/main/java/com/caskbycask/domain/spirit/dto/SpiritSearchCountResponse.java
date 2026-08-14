package com.caskbycask.domain.spirit.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 검색 조건에 걸린 주류 수 (목록 화면의 '총 N개').
 *
 * 목록에는 마스터만 실리므로 카드 수는 {@code spiritCount} 와 같고,
 * 화면에 보여 주는 숫자는 에디션까지 포함한 {@code totalCount} 다.
 */
public record SpiritSearchCountResponse(
        @Schema(description = "조건에 걸린 마스터 주류 수 = 목록 카드 수")
        long spiritCount,
        @Schema(description = "그 마스터들이 거느린 에디션 수")
        long editionCount,
        @Schema(description = "마스터 + 에디션 합계")
        long totalCount
) {
    public static SpiritSearchCountResponse of(long spiritCount, long editionCount) {
        return new SpiritSearchCountResponse(spiritCount, editionCount, spiritCount + editionCount);
    }
}
