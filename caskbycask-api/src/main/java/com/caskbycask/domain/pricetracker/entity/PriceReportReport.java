package com.caskbycask.domain.pricetracker.entity;

import com.caskbycask.domain.pricetracker.entity.enums.PriceReportReportReason;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportReportStatus;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(name = "price_report_reports", uniqueConstraints = {
        @UniqueConstraint(name = "uq_price_report_report_user",
                columnNames = {"price_report_id", "reporter_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("가격 제보 신고")
public class PriceReportReport extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "price_report_id", nullable = false)
    @Comment("가격 제보(price_reports.id)")
    private PriceReport priceReport;

    // 로그인 회원만 신고 가능. 신고자 정보는 관리자에게만 노출.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    @Comment("신고자(users.id)")
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Comment("신고 사유 — FALSE_PRICE/DUPLICATE/BAD_IMAGE/OTHER")
    private PriceReportReportReason reason;

    @Column(length = 500)
    @Comment("신고 상세")
    private String reasonDetail;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("처리 상태 — PENDING/RESOLVED/DISMISSED")
    private PriceReportReportStatus status = PriceReportReportStatus.PENDING;

    @Column
    @Comment("처리 일시")
    private LocalDateTime resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by_id")
    @Comment("처리자(users.id)")
    private User resolvedBy;

    public void resolve(User admin) {
        this.status = PriceReportReportStatus.RESOLVED;
        this.resolvedAt = LocalDateTime.now();
        this.resolvedBy = admin;
    }

    public void dismiss(User admin) {
        this.status = PriceReportReportStatus.DISMISSED;
        this.resolvedAt = LocalDateTime.now();
        this.resolvedBy = admin;
    }
}
