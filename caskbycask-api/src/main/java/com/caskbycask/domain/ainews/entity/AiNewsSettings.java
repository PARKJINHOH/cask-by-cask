package com.caskbycask.domain.ainews.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "ai_news_settings")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AiNewsSettings extends BaseTimeEntity {

    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id;

    @Column(nullable = false)
    private boolean automationEnabled;

    /**
     * 수집할 시각을 0~23 으로 나열한 값(예 {@code "9,18"}). cron 은 매시간 돌고,
     * 지금이 그 시각을 지났는지는 서버가 판단한다.
     *
     * <p>간격(시간)이 아니라 시각인 이유는 "하루 두 번, 09시와 18시" 같은 스케줄이
     * 고정 간격으로 표현되지 않기 때문이다 — 09→18 은 9시간, 18→09 는 15시간이다.
     */
    @Column(nullable = false, length = 50)
    private String collectionHours;

    /** 최신 기사로 볼 기간(일). 이 기간 밖의 기사는 소재 후보에 넣지 않는다. */
    @Column(nullable = false)
    private int recentWindowDays;

    @Column(nullable = false)
    private int dailyReleaseLimit;

    @Column(precision = 12, scale = 4)
    private BigDecimal openaiMonthlyBudgetUsd;

    private Long openaiMonthlyTokenLimit;

    @Column(nullable = false)
    private int whiskyRatio;

    @Column(nullable = false)
    private int wineRatio;

    @Column(nullable = false)
    private int cognacRatio;

    public void update(
            boolean automationEnabled,
            String collectionHours,
            int recentWindowDays,
            int dailyReleaseLimit,
            BigDecimal openaiMonthlyBudgetUsd,
            Long openaiMonthlyTokenLimit,
            int whiskyRatio,
            int wineRatio,
            int cognacRatio
    ) {
        this.automationEnabled = automationEnabled;
        this.collectionHours = collectionHours;
        this.recentWindowDays = recentWindowDays;
        this.dailyReleaseLimit = dailyReleaseLimit;
        this.openaiMonthlyBudgetUsd = openaiMonthlyBudgetUsd;
        this.openaiMonthlyTokenLimit = openaiMonthlyTokenLimit;
        this.whiskyRatio = whiskyRatio;
        this.wineRatio = wineRatio;
        this.cognacRatio = cognacRatio;
    }
}
