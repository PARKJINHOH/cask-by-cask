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

    @Column(nullable = false)
    private boolean autoPublishEnabled;

    @Column(nullable = false)
    private boolean dryRun;

    @Column(nullable = false)
    private int dailyReleaseLimit;

    @Column(nullable = false)
    private int tipIntervalHours;

    @Column(nullable = false, precision = 5, scale = 4)
    private BigDecimal confidenceThreshold;

    @Column(nullable = false)
    private int tavilyMonthlyCreditLimit;

    @Column(precision = 12, scale = 4)
    private BigDecimal openaiMonthlyBudgetUsd;

    private Long openaiMonthlyTokenLimit;

    private Integer openaiMonthlyImageLimit;

    @Column(nullable = false)
    private int whiskyRatio;

    @Column(nullable = false)
    private int wineRatio;

    @Column(nullable = false)
    private int cognacRatio;

    public void update(
            boolean automationEnabled,
            boolean autoPublishEnabled,
            boolean dryRun,
            int dailyReleaseLimit,
            int tipIntervalHours,
            BigDecimal confidenceThreshold,
            int tavilyMonthlyCreditLimit,
            BigDecimal openaiMonthlyBudgetUsd,
            Long openaiMonthlyTokenLimit,
            Integer openaiMonthlyImageLimit,
            int whiskyRatio,
            int wineRatio,
            int cognacRatio
    ) {
        this.automationEnabled = automationEnabled;
        this.autoPublishEnabled = autoPublishEnabled;
        this.dryRun = dryRun;
        this.dailyReleaseLimit = dailyReleaseLimit;
        this.tipIntervalHours = tipIntervalHours;
        this.confidenceThreshold = confidenceThreshold;
        this.tavilyMonthlyCreditLimit = tavilyMonthlyCreditLimit;
        this.openaiMonthlyBudgetUsd = openaiMonthlyBudgetUsd;
        this.openaiMonthlyTokenLimit = openaiMonthlyTokenLimit;
        this.openaiMonthlyImageLimit = openaiMonthlyImageLimit;
        this.whiskyRatio = whiskyRatio;
        this.wineRatio = wineRatio;
        this.cognacRatio = cognacRatio;
    }
}
