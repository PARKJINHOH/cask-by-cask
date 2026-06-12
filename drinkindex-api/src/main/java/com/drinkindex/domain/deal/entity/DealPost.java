package com.drinkindex.domain.deal.entity;

import com.drinkindex.domain.deal.entity.enums.DealStatus;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 주류 핫딜 (크롤러 drinkindex-crawler 가 수집·AI분석한 결과).
 * 수신 시 is_visible=false, status=PENDING 으로 적재되어 관리자 검토 큐에 들어간다.
 * 관리자가 승인하면 is_visible=true / APPROVED 로 전환되어 사용자에게 노출된다.
 */
@Entity
@Table(
        name = "deal_posts",
        indexes = {
                @Index(name = "idx_deal_posts_status", columnList = "status"),
                @Index(name = "idx_deal_posts_created_at", columnList = "createdAt")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_deal_posts_source_url", columnNames = "source_url")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class DealPost extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 원문 URL — 멱등키(중복 수신 방지). */
    @Column(name = "source_url", nullable = false, length = 500)
    private String sourceUrl;

    /** 출처 사이트 (DCINSIDE / NAVER_CAFE 등). */
    @Column(name = "source_site", nullable = false, length = 50)
    private String sourceSite;

    @Column(name = "drink_name", length = 200)
    private String drinkName;

    /** 주류 카테고리 (WHISKY|COGNAC|WINE|TEQUILA|RUM|BEER|SOJU|OTHER). 자유문자열로 보관. */
    @Column(name = "drink_category", length = 50)
    private String drinkCategory;

    @Column(name = "original_price")
    private Integer originalPrice;

    @Column(name = "deal_price")
    private Integer dealPrice;

    /** 할인율 0.0000 ~ 1.0000. */
    @Column(name = "discount_rate", precision = 5, scale = 4)
    private BigDecimal discountRate;

    @Column(length = 10)
    private String currency;

    @Column(length = 200)
    private String seller;

    @Column(name = "deal_condition", length = 500)
    private String dealCondition;

    @Column(name = "expiry_info", length = 200)
    private String expiryInfo;

    /** AI 신뢰도 1~10. */
    @Column(name = "confidence_score")
    private Integer confidenceScore;

    @Column(name = "summary_ko", columnDefinition = "TEXT")
    private String summaryKo;

    @Builder.Default
    @Column(name = "is_visible", nullable = false)
    private Boolean isVisible = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private DealStatus status = DealStatus.PENDING;

    /** 크롤러가 수집한 시각(UTC). */
    @Column(name = "crawled_at")
    private LocalDateTime crawledAt;

    // ─── 도메인 메서드 ───────────────────────────

    public void approve() {
        this.status = DealStatus.APPROVED;
        this.isVisible = true;
    }

    public void reject() {
        this.status = DealStatus.REJECTED;
        this.isVisible = false;
    }

    /** 관리자 인라인 수정(승인 전 보정). 전달된 값으로 덮어쓴다(null 포함 — 비우기 허용). */
    public void applyAdminEdit(String drinkName, String drinkCategory, Integer originalPrice,
                               Integer dealPrice, BigDecimal discountRate, String seller,
                               String dealCondition, String expiryInfo, String summaryKo) {
        this.drinkName = drinkName;
        this.drinkCategory = drinkCategory;
        this.originalPrice = originalPrice;
        this.dealPrice = dealPrice;
        this.discountRate = discountRate;
        this.seller = seller;
        this.dealCondition = dealCondition;
        this.expiryInfo = expiryInfo;
        this.summaryKo = summaryKo;
    }
}
