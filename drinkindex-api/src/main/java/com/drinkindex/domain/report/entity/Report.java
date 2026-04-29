package com.drinkindex.domain.report.entity;

import com.drinkindex.domain.report.entity.enums.ReportStatus;
import com.drinkindex.domain.report.entity.enums.ReportTargetType;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "report",
        indexes = {
                @Index(name = "idx_report_target", columnList = "target_type, target_id"),
                @Index(name = "idx_report_reporter_id", columnList = "reporter_id"),
                @Index(name = "idx_report_status", columnList = "status")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Report extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportTargetType targetType;

    @Column(nullable = false)
    private Long targetId;

    @Column(length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private ReportStatus status = ReportStatus.PENDING;

    @Column
    private LocalDateTime resolvedAt;

    public void resolve() {
        this.status = ReportStatus.RESOLVED;
        this.resolvedAt = LocalDateTime.now();
    }

    public void dismiss() {
        this.status = ReportStatus.DISMISSED;
        this.resolvedAt = LocalDateTime.now();
    }
}
