package com.caskbycask.domain.score.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * 레벨 구간 공식 자동생성 요청.
 * 시작점수(baseScore)와 증가율(growthRate)로 1~maxLevel 의 min_score 곡선을 만든다.
 * (프론트 score.types.ts 의 generateLevels 와 동일 공식)
 */
public record GenerateLevelConfigRequest(
        @NotNull @Min(2) @Max(200) Integer maxLevel,
        @NotNull @Min(1) Integer baseScore,
        @NotNull @DecimalMin("1.01") Double growthRate
) {
}
