package com.drinkindex.domain.pricetracker.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "price_report_images")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PriceReportImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "price_report_id", nullable = false)
    private PriceReport priceReport;

    @Column(nullable = false, length = 500)
    private String imageUrl;

    @Builder.Default
    @Column(nullable = false)
    private Integer sortOrder = 0;
}
