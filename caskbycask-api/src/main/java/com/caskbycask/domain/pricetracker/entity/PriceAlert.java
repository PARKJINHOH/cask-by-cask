package com.caskbycask.domain.pricetracker.entity;

import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
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
        @UniqueConstraint(name = "uq_price_alert_user_spirit_volume_store",
                columnNames = {"user_id", "spirit_id", "volume_ml", "store_type"})
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

    /** 목표가는 항상 원화다. 해외·면세 가격은 등록 시점 환율로 환산한 원화와 비교한다. */
    @Column(precision = 12, scale = 0)
    @Comment("목표 가격(원)")
    private BigDecimal targetPriceKrw;

    @Column
    @Comment("알림 대상 병 1개 용량(ml), null은 기존 전체 용량 알림")
    private Integer volumeMl;

    /**
     * 알림 대상 구간. 차트 탭(국내/해외/면세)과 1:1 로 대응한다.
     *
     * <p>V96 이전 알림은 국내 KRW 제보에만 반응했으므로 전부 DOMESTIC 으로 백필된다.
     */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "store_type", nullable = false, length = 20)
    @Comment("알림 대상 구간 — DOMESTIC/OVERSEAS/DUTYFREE")
    private StoreType storeType = StoreType.DOMESTIC;

    @Builder.Default
    @Column(nullable = false)
    @Comment("알림 활성 여부")
    private Boolean isActive = true;

    @Column
    @Comment("마지막 알림 일시")
    private LocalDateTime lastNotifiedAt;

    /** 마지막으로 알린 원화 가격. 같은 값(또는 더 비싼 값)에 반복 알림이 나가지 않게 막는다. */
    @Column(name = "last_notified_price_krw", precision = 14, scale = 0)
    @Comment("마지막 알림 발동 시점의 원화 가격")
    private BigDecimal lastNotifiedPriceKrw;

    public void updateTarget(BigDecimal targetPriceKrw) {
        this.targetPriceKrw = targetPriceKrw;
    }

    public void updateVolume(Integer volumeMl) {
        this.volumeMl = volumeMl;
    }

    public void updateStoreType(StoreType storeType) {
        if (storeType != null) {
            this.storeType = storeType;
        }
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

    public void markNotified(BigDecimal notifiedPriceKrw) {
        this.lastNotifiedAt = LocalDateTime.now();
        this.lastNotifiedPriceKrw = notifiedPriceKrw;
    }

    // 24시간 내 중복 발동 방지
    public boolean isTriggeredRecently() {
        return lastNotifiedAt != null &&
                lastNotifiedAt.isAfter(LocalDateTime.now().minusHours(24));
    }

    /**
     * 쿨다운이 끝난 뒤에도 같은 가격으로 다시 알리지는 않는다.
     *
     * <p>알림 대상이 국내에서 국내·해외·면세로 늘어난 만큼, 같은 특가가 반복 등록될 때마다
     * 알림이 쌓이면 사용자가 알림함을 신뢰하지 않게 된다. 직전보다 싸졌을 때만 다시 알린다.
     */
    public boolean isCheaperThanLastNotified(BigDecimal priceKrw) {
        return lastNotifiedPriceKrw == null || priceKrw.compareTo(lastNotifiedPriceKrw) < 0;
    }
}
