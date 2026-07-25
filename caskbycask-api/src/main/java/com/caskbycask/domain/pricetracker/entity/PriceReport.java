package com.caskbycask.domain.pricetracker.entity;

import com.caskbycask.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceInputMode;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "price_reports", indexes = {
        @Index(name = "idx_price_report_spirit_status_purchased",
                columnList = "spirit_id,status,purchased_at"),
        @Index(name = "idx_price_report_spirit_status_volume_purchased",
                columnList = "spirit_id,status,volume_ml,purchased_at")
})
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("가격 제보")
public class PriceReport extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id", nullable = false)
    @Comment("주류(spirit.id)")
    private Spirit spirit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    @Comment("판매처(stores.id)")
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(name = "store_type_snapshot", length = 20)
    @Comment("가격 제보 당시 판매처 유형 — DOMESTIC/OVERSEAS/DUTYFREE")
    private StoreType storeTypeSnapshot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id")
    @Comment("제보자(users.id)")
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("상태 — PENDING/APPROVED/REJECTED")
    private PriceReportStatus status = PriceReportStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Comment("통화 — KRW/USD")
    private PriceCurrency currency;

    @Column(precision = 12, scale = 0)
    @Comment("정가")
    private BigDecimal price;            // 정가

    @Column(precision = 12, scale = 0)
    @Comment("행사가")
    private BigDecimal salePrice;        // 행사가

    @Column(precision = 12, scale = 0)
    @Comment("페이백 금액")
    private BigDecimal paybackAmount;    // 페이백

    @Column(precision = 12, scale = 0)
    @Comment("실구매가")
    private BigDecimal actualPrice;      // 실구매가 (서비스 계산 후 저장)

    @Column(name = "actual_price_krw", precision = 14, scale = 0)
    @Comment("등록 당시 환율 기준 원화 실구매가")
    private BigDecimal actualPriceKrw;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "price_input_mode", nullable = false, length = 20)
    @Comment("가격 입력 방식 — AUTO_CONVERTED/KRW_DIRECT")
    private PriceInputMode priceInputMode = PriceInputMode.KRW_DIRECT;

    @Column
    @Comment("거래 당시 병 1개 용량(ml)")
    private Integer volumeMl;

    @Column(precision = 18, scale = 8)
    @Comment("외화 1단위당 원화 환율 스냅샷")
    private BigDecimal exchangeRateSnapshot;

    @Column
    @Comment("자동 환율 기준일")
    private LocalDate exchangeRateDate;

    @Column
    @Comment("구매 일자")
    private LocalDate purchasedAt;

    @Column(length = 500)
    @Comment("제보 설명")
    private String description;

    @Column(length = 255)
    @Comment("제안 판매처명(미등록)")
    private String suggestedStoreName;   // 자동완성에 없는 매장명 직접 입력

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Comment("면세 채널 제안 — AIRPORT/CITY/INFLIGHT/ONLINE")
    private DutyFreeChannel suggestedDutyfreeChannel; // 면세 매장 제안 시 사용자가 고른 채널 (매장 매핑/생성 참고용)

    @Builder.Default
    @Column(nullable = false)
    @Comment("익명 여부")
    private Boolean isAnonymous = false;

    @Builder.Default
    @Column(nullable = false)
    @Comment("자동 이상치 플래그 여부")
    private Boolean autoFlagged = false; // ±30% 이상 차이 시 자동 플래그

    @Builder.Default
    @Column(nullable = false)
    @Comment("검증 완료 여부")
    private Boolean isVerified = false;  // 인증 사진 첨부 후 관리자 확인 배지

    @Builder.Default
    @Column(nullable = false)
    @Comment("신고 수")
    private Integer reportCount = 0;     // 신고 수

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_id")
    @Comment("승인자(users.id)")
    private User approvedBy;

    @Column
    @Comment("승인 일시")
    private LocalDateTime approvedAt;

    @Column(length = 500)
    @Comment("반려 사유")
    private String rejectReason;

    @Column
    @Comment("반려 일시")
    private LocalDateTime rejectedAt;

    @Column
    @Comment("삭제 일시(소프트삭제)")
    private LocalDateTime deletedAt;

    // 이미지는 별도 Repository로 관리 (업로드→임시저장→연결 패턴)
    @OneToMany(mappedBy = "priceReport", fetch = FetchType.LAZY)
    @Builder.Default
    private List<PriceReportImage> images = new ArrayList<>();

    // 면세점 할인 항목은 항상 부모와 함께 관리
    @OneToMany(mappedBy = "priceReport", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PriceDiscountItem> discountItems = new ArrayList<>();

    public void approve(User admin) {
        this.status = PriceReportStatus.APPROVED;
        this.approvedBy = admin;
        this.approvedAt = LocalDateTime.now();
    }

    public void reject(String rejectReason) {
        this.status = PriceReportStatus.REJECTED;
        this.rejectReason = rejectReason;
        this.rejectedAt = LocalDateTime.now();
    }

    public void updateStore(Store store) {
        this.store = store;
    }

    public void resetToPending() {
        this.status = PriceReportStatus.PENDING;
        this.approvedAt = null;
        this.approvedBy = null;
        this.rejectReason = null;
        this.rejectedAt = null;
    }

    public void update(Store store, StoreType storeTypeSnapshot, String suggestedStoreName,
                       DutyFreeChannel suggestedDutyfreeChannel,
                       PriceCurrency currency,
                       BigDecimal price, BigDecimal salePrice, BigDecimal paybackAmount,
                       BigDecimal actualPrice, BigDecimal actualPriceKrw,
                       PriceInputMode priceInputMode, BigDecimal exchangeRateSnapshot,
                       LocalDate exchangeRateDate,
                       Integer volumeMl, LocalDate purchasedAt, String description, Boolean isAnonymous,
                       boolean autoFlagged) {
        this.store = store;
        this.storeTypeSnapshot = storeTypeSnapshot;
        this.suggestedStoreName = suggestedStoreName;
        this.suggestedDutyfreeChannel = suggestedDutyfreeChannel;
        this.currency = currency;
        this.price = price;
        this.salePrice = salePrice;
        this.paybackAmount = paybackAmount;
        this.actualPrice = actualPrice;
        this.actualPriceKrw = actualPriceKrw;
        this.priceInputMode = priceInputMode;
        this.exchangeRateSnapshot = exchangeRateSnapshot;
        this.exchangeRateDate = exchangeRateDate;
        this.volumeMl = volumeMl;
        this.purchasedAt = purchasedAt;
        this.description = description;
        this.isAnonymous = isAnonymous;
        this.autoFlagged = autoFlagged;
    }

    public void updateVolume(Integer volumeMl) {
        this.volumeMl = volumeMl;
    }

    public void updateStoreTypeSnapshot(StoreType storeType) {
        this.storeTypeSnapshot = storeType;
    }

    /**
     * 신규 snapshot을 우선하고, 배포 전 레거시 행은 연결 Store로 보완한다.
     * Store도 없는 레거시 직접 입력은 당시 동작과 동일하게 통화/면세 채널로 추론한다.
     */
    public StoreType getEffectiveStoreType() {
        if (storeTypeSnapshot != null) return storeTypeSnapshot;
        if (store != null && store.getStoreType() != null) return store.getStoreType();
        if (currency == PriceCurrency.USD || suggestedDutyfreeChannel != null) return StoreType.DUTYFREE;
        if (currency != null && currency.isForeignCurrency()) return StoreType.OVERSEAS;
        return StoreType.DOMESTIC;
    }

    public BigDecimal resolveActualPriceKrw() {
        if (actualPriceKrw != null) return actualPriceKrw;
        return convertToKrw(actualPrice);
    }

    public BigDecimal convertToKrw(BigDecimal amount) {
        if (amount == null || currency == null) return null;
        if (currency == PriceCurrency.KRW) {
            return amount.setScale(0, RoundingMode.HALF_UP);
        }
        if (exchangeRateSnapshot == null || exchangeRateSnapshot.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        return amount.multiply(exchangeRateSnapshot).setScale(0, RoundingMode.HALF_UP);
    }

    public void verify() {
        this.isVerified = true;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }
}
