package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 카테고리별 등록 주류 수 (메인 홈 사이드바 통계).
 *
 * 카탈로그 목록은 마스터만 싣지만, '몇 개가 등록돼 있는가'를 말할 때는
 * 에디션(하위 병입)도 실제 등록된 제품이므로 함께 센다. 어느 쪽인지 알 수 있도록
 * 마스터/에디션을 나눠 내려 주고 화면이 합계를 쓴다.
 */
public record SpiritCategoryStatResponse(
        @Schema(description = "카테고리")
        SpiritCategory category,
        @Schema(description = "마스터 주류 수")
        long spiritCount,
        @Schema(description = "에디션(하위 병입) 수")
        long editionCount,
        @Schema(description = "마스터 + 에디션 합계")
        long totalCount
) {
    public static SpiritCategoryStatResponse of(SpiritCategory category, long spiritCount, long editionCount) {
        return new SpiritCategoryStatResponse(category, spiritCount, editionCount, spiritCount + editionCount);
    }
}
