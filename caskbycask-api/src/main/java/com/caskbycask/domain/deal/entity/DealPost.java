package com.caskbycask.domain.deal.entity;

import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 주류 핫딜 (크롤러 caskbycask-crawler 가 수집·AI분석한 결과).
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
@Comment("주류 핫딜(크롤러 수집·AI분석)")
public class DealPost extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    /** 원문 URL — 멱등키(중복 수신 방지). */
    @Column(name = "source_url", nullable = false, length = 500)
    @Comment("원문 URL(멱등키)")
    private String sourceUrl;

    /** 출처 사이트 (DCINSIDE / NAVER_CAFE 등). */
    @Column(name = "source_site", nullable = false, length = 50)
    @Comment("출처 사이트(DCINSIDE/NAVER_CAFE 등)")
    private String sourceSite;

    @Column(name = "drink_name", length = 200)
    @Comment("주류명")
    private String drinkName;

    /** 주류 카테고리 (WHISKY|COGNAC|WINE|TEQUILA|RUM|BEER|SOJU|OTHER). 자유문자열로 보관. */
    @Column(name = "drink_category", length = 50)
    @Comment("주류 카테고리(자유 문자열)")
    private String drinkCategory;

    @Column(name = "original_price")
    @Comment("정가")
    private Integer originalPrice;

    @Column(name = "deal_price")
    @Comment("할인가")
    private Integer dealPrice;

    /** 할인율 0.0000 ~ 1.0000. */
    @Column(name = "discount_rate", precision = 5, scale = 4)
    @Comment("할인율(0~1)")
    private BigDecimal discountRate;

    @Column(length = 10)
    @Comment("통화")
    private String currency;

    @Column(length = 200)
    @Comment("판매처")
    private String seller;

    @Column(name = "deal_condition", length = 500)
    @Comment("구매 조건")
    private String dealCondition;

    @Column(name = "expiry_info", length = 200)
    @Comment("종료/마감 정보")
    private String expiryInfo;

    /** AI 신뢰도 1~10. */
    @Column(name = "confidence_score")
    @Comment("AI 신뢰도(1~10)")
    private Integer confidenceScore;

    @Column(name = "summary_ko", columnDefinition = "TEXT")
    @Comment("AI 요약(한글)")
    private String summaryKo;

    @Builder.Default
    @Column(name = "is_visible", nullable = false)
    @Comment("노출 여부")
    private Boolean isVisible = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("검토 상태 — PENDING/APPROVED/REJECTED")
    private DealStatus status = DealStatus.PENDING;

    /** 크롤러가 수집한 시각(UTC). */
    @Column(name = "crawled_at")
    @Comment("크롤링 수집 시각(UTC)")
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
