package com.caskbycask.domain.ainews.entity;

import com.caskbycask.domain.ainews.entity.enums.AiNewsRunStatus;
import com.caskbycask.domain.ainews.entity.enums.AiNewsRunType;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_news_runs")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AiNewsRun extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100, unique = true)
    private String runKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AiNewsRunType runType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AiNewsRunStatus status;

    @Builder.Default private int candidateCount = 0;
    @Builder.Default private int publishedCount = 0;
    @Builder.Default private int reviewCount = 0;
    @Builder.Default private int duplicateCount = 0;
    @Builder.Default private int errorCount = 0;

    @Column(length = 2000)
    private String errorMessage;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    private LocalDateTime finishedAt;

    public void finish(AiNewsRunStatus status, int candidateCount, int publishedCount,
                       int reviewCount, int duplicateCount, int errorCount, String errorMessage) {
        this.status = status;
        this.candidateCount = candidateCount;
        this.publishedCount = publishedCount;
        this.reviewCount = reviewCount;
        this.duplicateCount = duplicateCount;
        this.errorCount = errorCount;
        this.errorMessage = errorMessage;
        this.finishedAt = LocalDateTime.now();
    }
}
