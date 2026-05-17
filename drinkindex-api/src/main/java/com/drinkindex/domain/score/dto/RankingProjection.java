package com.drinkindex.domain.score.dto;

// Spring Data JPA 네이티브 쿼리 프로젝션 인터페이스
public interface RankingProjection {
    Long getUserId();
    String getNickname();
    String getRole();
    Integer getCurrentLevel();
    Integer getMaturingPower();
    Long getWeeklyScore();
    Long getMonthlyScore();
}
