package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritSort;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

public record SpiritSearchCondition(
        @Schema(description = "검색어 (한글명·영문명 부분 일치)")
        String keyword,
        @Schema(description = "카테고리 필터 (null이면 전체)")
        SpiritCategory category,
        @Schema(description = "생산 국가 필터 (null이면 전체)")
        String country,
        @Schema(description = "최소 알코올 도수")
        BigDecimal minAbv,
        @Schema(description = "최대 알코올 도수")
        BigDecimal maxAbv,
        @Schema(description = "최소 평균 점수")
        BigDecimal minScore,
        @Schema(description = "최대 평균 점수")
        BigDecimal maxScore,
        @Schema(description = "공개 상태 필터 (기본값: ACTIVE)")
        SpiritStatus status,
        @Schema(description = "정렬 기준 (기본값: LATEST)")
        SpiritSort sort
) {
    public SpiritSearchCondition {
        if (status == null) status = SpiritStatus.ACTIVE;
        if (sort == null) sort = SpiritSort.LATEST;
    }
}
