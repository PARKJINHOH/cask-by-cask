package com.caskbycask.domain.score.dto;

public record MyRankResponse(
        int rank,
        Long userId,
        String nickname,
        Integer currentLevel,
        Integer maturingPower,
        long periodScore   // 해당 기간의 본인 점수
) {
}
