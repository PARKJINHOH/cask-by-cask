package com.drinkindex.domain.pricetracker.entity;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "price_alerts", uniqueConstraints = {
        @UniqueConstraint(name = "uq_price_alert_user_spirit", columnNames = {"user_id", "spirit_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PriceAlert extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id", nullable = false)
    private Spirit spirit;

    @Column(precision = 12, scale = 0)
    private BigDecimal targetPriceKrw; // 면세 가격 제외 KRW 목표가

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    @Column
    private LocalDateTime lastNotifiedAt;

    public void updateTarget(BigDecimal targetPriceKrw) {
        this.targetPriceKrw = targetPriceKrw;
    }

    public void deactivate() {
        this.isActive = false;
    }

    public void markNotified() {
        this.lastNotifiedAt = LocalDateTime.now();
    }
}
