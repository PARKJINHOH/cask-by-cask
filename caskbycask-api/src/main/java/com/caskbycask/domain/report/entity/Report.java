package com.caskbycask.domain.report.entity;

import com.caskbycask.domain.report.entity.enums.ReportStatus;
import com.caskbycask.domain.report.entity.enums.ReportTargetType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

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
@Comment("신고(리뷰/댓글/이미지)")
public class Report extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    @Comment("신고자(users.id)")
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("대상 유형 — REVIEW/COMMENT/IMAGE")
    private ReportTargetType targetType;

    @Column(nullable = false)
    @Comment("대상 식별자")
    private Long targetId;

    @Column(length = 500)
    @Comment("신고 사유")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("처리 상태 — PENDING/RESOLVED/DISMISSED")
    private ReportStatus status = ReportStatus.PENDING;

    @Column
    @Comment("처리 일시")
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
