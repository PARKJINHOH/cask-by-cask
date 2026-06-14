package com.caskbycask.domain.pricetracker.entity;

import com.caskbycask.domain.pricetracker.entity.enums.DiscountType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.math.BigDecimal;

@Entity
@Table(name = "price_discount_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("가격 제보 할인 항목")
public class PriceDiscountItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "price_report_id", nullable = false)
    @Comment("가격 제보(price_reports.id)")
    private PriceReport priceReport;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("할인 유형 — COUPON/PAYMENT/BUNDLE/OTHER")
    private DiscountType discountType;

    @Column(nullable = false, precision = 12, scale = 0)
    @Comment("할인 금액")
    private BigDecimal discountAmount;

    @Column(length = 200)
    @Comment("할인 설명")
    private String description;
}
