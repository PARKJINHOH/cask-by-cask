package com.caskbycask.domain.wineingest.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "wine_ingest_settings")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class WineIngestSettings extends BaseTimeEntity {
    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id;

    /** 켜면 매시 cron이 Vivino 수집 회차를 예약한다. 수동 실행은 이 값과 무관하게 언제든 가능하다. */
    @Column(nullable = false)
    private boolean automationEnabled;

    @Column(nullable = false)
    private int hourlyLimit;

    @Column(nullable = false)
    private int maxRunItems;

    @Column(nullable = false)
    private boolean slackAlertEnabled;

    public void update(boolean automationEnabled, int hourlyLimit, int maxRunItems,
                       boolean slackAlertEnabled) {
        this.automationEnabled = automationEnabled;
        this.hourlyLimit = hourlyLimit;
        this.maxRunItems = maxRunItems;
        this.slackAlertEnabled = slackAlertEnabled;
    }
}
