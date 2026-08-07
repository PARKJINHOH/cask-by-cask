package com.caskbycask.domain.wineingest.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.wineingest.entity.enums.*;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "wine_ingest_runs")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class WineIngestRun extends BaseTimeEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String runKey;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private WineIngestRunType runType;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private WineIngestRunStatus status;

    @Column(nullable = false) private int requestedLimit;
    @Builder.Default @Column(nullable = false) private int attemptedCount = 0;
    @Builder.Default @Column(nullable = false) private int createdCount = 0;
    @Builder.Default @Column(nullable = false) private int duplicateCount = 0;
    @Builder.Default @Column(nullable = false) private int skippedCount = 0;
    @Builder.Default @Column(nullable = false) private int failedCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_id")
    private User requestedBy;

    @Column(length = 2000) private String errorMessage;
    private LocalDateTime startedAt;
    private LocalDateTime lastHeartbeatAt;
    private LocalDateTime finishedAt;

    public void start() {
        this.status = WineIngestRunStatus.RUNNING;
        this.startedAt = LocalDateTime.now();
        this.lastHeartbeatAt = this.startedAt;
    }

    public void heartbeat() {
        if (status == WineIngestRunStatus.RUNNING) this.lastHeartbeatAt = LocalDateTime.now();
    }

    public void record(WineIngestItemStatus itemStatus) {
        attemptedCount++;
        switch (itemStatus) {
            case CREATED -> createdCount++;
            case DUPLICATE_SKIPPED -> duplicateCount++;
            case NOT_FOUND_SKIPPED -> skippedCount++;
            case FAILED -> failedCount++;
        }
        heartbeat();
    }

    public void finish(String errorMessage) {
        this.errorMessage = errorMessage;
        this.finishedAt = LocalDateTime.now();
        this.lastHeartbeatAt = this.finishedAt;
        boolean runFailed = errorMessage != null && !errorMessage.isBlank();
        boolean onlyNotFound = skippedCount > 0 && createdCount == 0
                && duplicateCount == 0 && failedCount == 0;
        this.status = runFailed && attemptedCount == 0
                ? WineIngestRunStatus.FAILED
                : (failedCount == 0 && !runFailed && !onlyNotFound
                ? WineIngestRunStatus.SUCCEEDED
                : (createdCount > 0 || duplicateCount > 0 || skippedCount > 0
                    ? WineIngestRunStatus.PARTIAL : WineIngestRunStatus.FAILED));
    }

    public void cancel() {
        cancel(null);
    }

    public void cancel(String reason) {
        if (status == WineIngestRunStatus.QUEUED || status == WineIngestRunStatus.RUNNING) {
            status = WineIngestRunStatus.CANCELLED;
            finishedAt = LocalDateTime.now();
            errorMessage = reason;
        }
    }
}
