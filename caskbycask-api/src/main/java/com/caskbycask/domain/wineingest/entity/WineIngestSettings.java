package com.caskbycask.domain.wineingest.entity;

import com.caskbycask.domain.wineingest.entity.enums.WineIngestProviderMode;
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

    @Column(nullable = false)
    private boolean automationEnabled;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WineIngestProviderMode providerMode;

    @Column(nullable = false)
    private boolean licenseApproved;

    @Column(length = 500)
    private String usageGrantRef;

    @Column(nullable = false)
    private int hourlyLimit;

    @Column(nullable = false)
    private int maxRunItems;

    @Column(nullable = false)
    private boolean slackAlertEnabled;

    public void update(boolean automationEnabled, WineIngestProviderMode providerMode,
                       boolean licenseApproved, String usageGrantRef,
                       int hourlyLimit, int maxRunItems, boolean slackAlertEnabled) {
        this.automationEnabled = automationEnabled;
        this.providerMode = providerMode;
        this.licenseApproved = licenseApproved;
        this.usageGrantRef = usageGrantRef;
        this.hourlyLimit = hourlyLimit;
        this.maxRunItems = maxRunItems;
        this.slackAlertEnabled = slackAlertEnabled;
    }
}
