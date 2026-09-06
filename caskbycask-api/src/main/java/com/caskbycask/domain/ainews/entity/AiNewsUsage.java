package com.caskbycask.domain.ainews.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_news_usage")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AiNewsUsage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id")
    private AiNewsRun run;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(length = 100)
    private String modelName;

    @Builder.Default private long inputTokens = 0;
    @Builder.Default private long outputTokens = 0;
    @Builder.Default private int imageCount = 0;

    @Builder.Default
    @Column(nullable = false, precision = 12, scale = 6)
    private BigDecimal estimatedCostUsd = BigDecimal.ZERO;

    @Column(nullable = false)
    private LocalDateTime usageAt;
}
