package com.caskbycask.domain.deal.entity;

import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 주류 가격 동향 항목.
 *
 * <p>출처는 두 가지다.
 * <ul>
 *   <li>크롤러(caskbycask-crawler) 수집·AI분석 — is_visible=false, status=PENDING 으로 적재되어
 *       관리자 검토 큐에 들어가고, 관리자가 승인하면 노출된다.</li>
 *   <li>관리자 직접 등록(source_site=ADMIN) — 사람이 확인한 값이라 바로 APPROVED + 노출로 저장된다.
 *       원문 URL 이 없으면 {@code admin://deal/{UUID}} 내부 멱등키를 쓴다.</li>
 * </ul>
 */
@Entity
@Table(
        name = "deal_posts",
        indexes = {
                @Index(name = "idx_deal_posts_status", columnList = "status"),
                @Index(name = "idx_deal_posts_created_at", columnList = "createdAt"),
                @Index(name = "idx_deal_post_spirit_status_visible_volume",
                        columnList = "spirit_id,status,is_visible,volume_ml")
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

    /** 출처 사이트 (DCINSIDE / NAVER_CAFE / ADMIN 등). */
    @Column(name = "source_site", nullable = false, length = 50)
    @Comment("출처 사이트(DCINSIDE/NAVER_CAFE/ADMIN 등)")
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

    /**
     * 수집 당시 환율로 확정한 원화 할인가.
     *
     * <p>가격 차트는 price_reports 와 deal_posts 를 원화 축 하나로 합쳐 집계한다.
     * 외화 딜을 환산 없이 넣으면 "$187 → 187원" 으로 찍혀 차트가 무너지므로,
     * price_reports 의 actual_price_krw 와 같은 의미의 값을 저장 시점에 박제한다.
     * 환율 조회에 실패하면 NULL 로 남고, 그런 행은 차트 집계에서 제외된다.
     */
    @Column(name = "deal_price_krw", precision = 14, scale = 0)
    @Comment("수집 당시 환율 기준 원화 할인가")
    private BigDecimal dealPriceKrw;

    @Column(name = "original_price_krw", precision = 14, scale = 0)
    @Comment("수집 당시 환율 기준 원화 정가")
    private BigDecimal originalPriceKrw;

    @Column(name = "exchange_rate_snapshot", precision = 18, scale = 8)
    @Comment("외화 1단위당 원화 환율 스냅샷")
    private BigDecimal exchangeRateSnapshot;

    @Column(name = "exchange_rate_date")
    @Comment("적용 환율 기준일")
    private LocalDate exchangeRateDate;

    @Column(name = "volume_ml")
    @Comment("핫딜 대상 병 1개 용량(ml)")
    private Integer volumeMl;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id")
    @Comment("연결된 술(spirit.id)")
    private Spirit spirit;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "store_type", nullable = false, length = 20)
    @Comment("판매처 유형 — DOMESTIC/OVERSEAS/DUTYFREE")
    private StoreType storeType = StoreType.DOMESTIC;

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

    public void linkSpiritAndStoreType(Spirit spirit, StoreType storeType) {
        this.spirit = spirit;
        if (storeType != null) {
            this.storeType = storeType;
        }
    }

    /** 관리자 인라인 수정(승인 전 보정). 전달된 값으로 덮어쓴다(null 포함 — 비우기 허용). */
    public void applyAdminEdit(String drinkName, String drinkCategory, Integer originalPrice,
                               Integer dealPrice, Integer volumeMl, BigDecimal discountRate, String currency, String seller,
                               String dealCondition, String expiryInfo, String summaryKo) {
        this.drinkName = drinkName;
        this.drinkCategory = drinkCategory;
        this.originalPrice = originalPrice;
        this.dealPrice = dealPrice;
        this.volumeMl = volumeMl;
        this.discountRate = discountRate;
        this.currency = currency;
        this.seller = seller;
        this.dealCondition = dealCondition;
        this.expiryInfo = expiryInfo;
        this.summaryKo = summaryKo;
    }

    /**
     * 원화 환산값을 확정한다. KRW 딜은 rate 없이(null) 호출해 금액을 그대로 복사한다.
     *
     * <p>{@code PriceReport.convertToKrw} 와 동일하게 scale 0, HALF_UP 으로 맞춘다.
     */
    public void applyExchangeRate(BigDecimal krwPerUnit, LocalDate rateDate) {
        if (isKrw()) {
            this.exchangeRateSnapshot = null;
            this.exchangeRateDate = null;
            this.dealPriceKrw = toKrwScale(toDecimal(this.dealPrice));
            this.originalPriceKrw = toKrwScale(toDecimal(this.originalPrice));
            return;
        }
        if (krwPerUnit == null || krwPerUnit.compareTo(BigDecimal.ZERO) <= 0) {
            this.exchangeRateSnapshot = null;
            this.exchangeRateDate = null;
            this.dealPriceKrw = null;
            this.originalPriceKrw = null;
            return;
        }
        this.exchangeRateSnapshot = krwPerUnit;
        this.exchangeRateDate = rateDate;
        this.dealPriceKrw = convertToKrw(toDecimal(this.dealPrice));
        this.originalPriceKrw = convertToKrw(toDecimal(this.originalPrice));
    }

    public boolean isKrw() {
        return currency == null || currency.isBlank() || "KRW".equalsIgnoreCase(currency);
    }

    /** 차트가 쓰는 원화 실구매가. 할인가가 없으면 정가로 대체한다. */
    public BigDecimal resolveDealPriceKrw() {
        BigDecimal deal = dealPriceKrw != null ? dealPriceKrw : convertToKrw(toDecimal(dealPrice));
        if (deal != null && deal.compareTo(BigDecimal.ZERO) > 0) {
            return deal;
        }
        return resolveOriginalPriceKrw();
    }

    /** 차트가 쓰는 원화 정가. */
    public BigDecimal resolveOriginalPriceKrw() {
        if (originalPriceKrw != null) {
            return originalPriceKrw;
        }
        return convertToKrw(toDecimal(originalPrice));
    }

    private BigDecimal convertToKrw(BigDecimal amount) {
        if (amount == null) return null;
        if (isKrw()) return toKrwScale(amount);
        if (exchangeRateSnapshot == null || exchangeRateSnapshot.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        return toKrwScale(amount.multiply(exchangeRateSnapshot));
    }

    private static BigDecimal toDecimal(Integer value) {
        return value != null ? BigDecimal.valueOf(value) : null;
    }

    private static BigDecimal toKrwScale(BigDecimal value) {
        return value != null ? value.setScale(0, RoundingMode.HALF_UP) : null;
    }
}
