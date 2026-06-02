package com.drinkindex.domain.pricetracker.entity;

import com.drinkindex.domain.pricetracker.entity.enums.PriceCurrency;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportStatus;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "price_reports", indexes = {
        @Index(name = "idx_price_report_spirit_status_purchased",
                columnList = "spirit_id,status,purchased_at")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PriceReport extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id", nullable = false)
    private Spirit spirit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id")
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private PriceReportStatus status = PriceReportStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PriceCurrency currency;

    @Column(precision = 12, scale = 0)
    private BigDecimal price;            // 정가

    @Column(precision = 12, scale = 0)
    private BigDecimal salePrice;        // 행사가

    @Column(precision = 12, scale = 0)
    private BigDecimal paybackAmount;    // 페이백

    @Column(precision = 12, scale = 0)
    private BigDecimal actualPrice;      // 실구매가 = salePrice - paybackAmount (자동계산)

    @Column(precision = 10, scale = 4)
    private BigDecimal exchangeRateSnapshot; // 면세 USD 등록 시 환율 스냅샷

    @Column
    private LocalDate purchasedAt;

    @Column(length = 500)
    private String memo;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isAnonymous = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isPublic = true;     // 사진 공개 여부 (사용자 화면 적용)

    @Builder.Default
    @Column(nullable = false)
    private Boolean autoFlagged = false; // ±30% 이상 차이 시 자동 플래그

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    private User approvedBy;

    @Column
    private LocalDateTime approvedAt;

    @Column
    private LocalDateTime deletedAt;

    @Builder.Default
    @OneToMany(mappedBy = "priceReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PriceReportImage> images = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "priceReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PriceDiscountItem> discountItems = new ArrayList<>();

    @PrePersist
    @PreUpdate
    private void calculateActualPrice() {
        if (salePrice != null && paybackAmount != null) {
            this.actualPrice = salePrice.subtract(paybackAmount);
        }
    }

    public void approve(User admin) {
        this.status = PriceReportStatus.APPROVED;
        this.approvedBy = admin;
        this.approvedAt = LocalDateTime.now();
    }

    public void reject() {
        this.status = PriceReportStatus.REJECTED;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public void markAutoFlagged() {
        this.autoFlagged = true;
    }

    public void togglePublic(boolean isPublic) {
        this.isPublic = isPublic;
    }
}
