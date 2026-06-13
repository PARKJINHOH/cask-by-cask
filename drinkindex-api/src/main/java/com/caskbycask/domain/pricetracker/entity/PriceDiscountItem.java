package com.caskbycask.domain.pricetracker.entity;

import com.caskbycask.domain.pricetracker.entity.enums.DiscountType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "price_discount_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PriceDiscountItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "price_report_id", nullable = false)
    private PriceReport priceReport;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DiscountType discountType;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal discountAmount;

    @Column(length = 200)
    private String description;
}
