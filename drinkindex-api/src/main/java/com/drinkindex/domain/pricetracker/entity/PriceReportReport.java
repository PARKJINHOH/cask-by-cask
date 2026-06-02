package com.drinkindex.domain.pricetracker.entity;

import com.drinkindex.domain.pricetracker.entity.enums.PriceReportReportReason;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportReportStatus;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "price_report_reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PriceReportReport extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "price_report_id", nullable = false)
    private PriceReport priceReport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id")
    private User reporter; // null = 익명

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PriceReportReportReason reason;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private PriceReportReportStatus status = PriceReportReportStatus.PENDING;

    @Column
    private LocalDateTime resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by_id")
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
