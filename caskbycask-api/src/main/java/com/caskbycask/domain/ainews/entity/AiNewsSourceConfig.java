package com.caskbycask.domain.ainews.entity;

import com.caskbycask.domain.ainews.entity.enums.AiNewsSourceType;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ai_news_source_configs")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AiNewsSourceConfig extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String sourceName;

    @Column(nullable = false, length = 255, unique = true)
    private String domain;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AiNewsSourceType sourceType;

    @Builder.Default
    @Column(nullable = false)
    private boolean enabled = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean autoPublishAllowed = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean imageUseAllowed = false;

    @Column(length = 30)
    private String crawlerType;

    @Column(length = 255)
    private String crawlerTargetKey;

    @Column(length = 500)
    private String crawlerTargetValue;

    public void update(String sourceName, AiNewsSourceType sourceType, boolean enabled,
                       boolean autoPublishAllowed, boolean imageUseAllowed,
                       String crawlerType, String crawlerTargetKey, String crawlerTargetValue) {
        this.sourceName = sourceName;
        this.sourceType = sourceType;
        this.enabled = enabled;
        this.autoPublishAllowed = autoPublishAllowed;
        this.imageUseAllowed = imageUseAllowed;
        this.crawlerType = crawlerType;
        this.crawlerTargetKey = crawlerTargetKey;
        this.crawlerTargetValue = crawlerTargetValue;
    }
}
