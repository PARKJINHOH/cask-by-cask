package com.caskbycask.domain.pricetracker.entity;

import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "exchange_rates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("가격 등록용 최신 원화 환율 캐시")
public class ExchangeRate {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    @Comment("외화 ISO 코드")
    private PriceCurrency currency;

    @Column(nullable = false, precision = 18, scale = 8)
    @Comment("외화 1단위당 원화 환율")
    private BigDecimal krwPerUnit;

    @Column(nullable = false, length = 50)
    @Comment("환율 제공자")
    private String provider;

    @Column(nullable = false)
    @Comment("제공자 환율 기준일")
    private LocalDate effectiveDate;

    @Column(nullable = false)
    @Comment("마지막 정상 수집 일시")
    private LocalDateTime fetchedAt;

    public void refresh(BigDecimal krwPerUnit, String provider,
                        LocalDate effectiveDate, LocalDateTime fetchedAt) {
        this.krwPerUnit = krwPerUnit;
        this.provider = provider;
        this.effectiveDate = effectiveDate;
        this.fetchedAt = fetchedAt;
    }
}
