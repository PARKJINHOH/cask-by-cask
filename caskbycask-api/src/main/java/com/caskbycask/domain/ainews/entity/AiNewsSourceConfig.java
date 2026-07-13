package com.caskbycask.domain.ainews.entity;

import com.caskbycask.domain.ainews.entity.enums.AiNewsSourceType;
import com.caskbycask.domain.ainews.entity.enums.AiNewsSourceCrawlStatus;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_news_source_configs", uniqueConstraints =
        @UniqueConstraint(name = "uk_ai_news_source_scope", columnNames = {"domain", "path_prefix"}))
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

    @Column(nullable = false, length = 255)
    private String domain;

    @Column(nullable = false, length = 1500)
    private String sourceUrl;

    /** 빈 문자열이면 도메인 전체, 값이 있으면 해당 URL 경로와 하위 경로에만 적용한다. */
    @Builder.Default
    @Column(nullable = false, length = 255)
    private String pathPrefix = "";

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

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiNewsSourceCrawlStatus crawlStatus = AiNewsSourceCrawlStatus.NOT_CHECKED;

    private LocalDateTime lastCrawledAt;

    @Column(length = 1000)
    private String lastCrawlError;

    public void update(String sourceName, String sourceUrl, String domain, String pathPrefix,
                       AiNewsSourceType sourceType, boolean enabled,
                       boolean autoPublishAllowed, boolean imageUseAllowed) {
        boolean collectionChanged = !this.sourceUrl.equals(sourceUrl)
                || this.sourceType != sourceType || this.enabled != enabled;
        this.sourceName = sourceName;
        this.sourceUrl = sourceUrl;
        this.domain = domain;
        this.pathPrefix = pathPrefix;
        this.sourceType = sourceType;
        this.enabled = enabled;
        this.autoPublishAllowed = autoPublishAllowed;
        this.imageUseAllowed = imageUseAllowed;
        if (collectionChanged) {
            this.crawlStatus = AiNewsSourceCrawlStatus.NOT_CHECKED;
            this.lastCrawledAt = null;
            this.lastCrawlError = null;
        }
    }

    public void recordCrawlResult(AiNewsSourceCrawlStatus status, String error, LocalDateTime checkedAt) {
        this.crawlStatus = status;
        this.lastCrawledAt = checkedAt;
        this.lastCrawlError = status == AiNewsSourceCrawlStatus.ERROR ? error : null;
    }
}
