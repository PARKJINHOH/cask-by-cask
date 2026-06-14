package com.caskbycask.domain.pricetracker.entity;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

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
@Comment("가격 알림 설정")
public class PriceAlert extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("사용자(users.id)")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id", nullable = false)
    @Comment("주류(spirit.id)")
    private Spirit spirit;

    @Column(precision = 12, scale = 0)
    @Comment("목표 가격(원)")
    private BigDecimal targetPriceKrw; // 면세 가격 제외 KRW 목표가

    @Builder.Default
    @Column(nullable = false)
    @Comment("알림 활성 여부")
    private Boolean isActive = true;

    @Column
    @Comment("마지막 알림 일시")
    private LocalDateTime lastNotifiedAt;

    public void updateTarget(BigDecimal targetPriceKrw) {
        this.targetPriceKrw = targetPriceKrw;
    }

    public void deactivate() {
        this.isActive = false;
    }

    public void reactivate() {
        this.isActive = true;
    }

    public void toggleActive() {
        this.isActive = !this.isActive;
    }

    public void markNotified() {
        this.lastNotifiedAt = LocalDateTime.now();
    }

    // 24시간 내 중복 발동 방지
    public boolean isTriggeredRecently() {
        return lastNotifiedAt != null &&
                lastNotifiedAt.isAfter(LocalDateTime.now().minusHours(24));
    }
}
