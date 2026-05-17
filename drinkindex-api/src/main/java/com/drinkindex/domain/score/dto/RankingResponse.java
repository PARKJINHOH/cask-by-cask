package com.drinkindex.domain.score.dto;

public record RankingResponse(
        int rank,
        Long userId,
        String nickname,
        String role,
        Integer currentLevel,
        Integer maturingPower,
        long weeklyScore,
        long monthlyScore,
        String distilleryLogoUrl   // DISTILLERY 역할인 경우에만 사용 (현재는 null)
) {
    public static RankingResponse of(int rank, RankingProjection p) {
        return new RankingResponse(
                rank,
                p.getUserId(),
                p.getNickname(),
                p.getRole(),
                p.getCurrentLevel(),
                p.getMaturingPower(),
                p.getWeeklyScore() != null ? p.getWeeklyScore() : 0L,
                p.getMonthlyScore() != null ? p.getMonthlyScore() : 0L,
                null
        );
    }
}
