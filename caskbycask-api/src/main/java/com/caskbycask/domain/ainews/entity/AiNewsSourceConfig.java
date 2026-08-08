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

    /**
     * 관리자가 차단한 출처. 수집 과정에서 자동 등록된 행을 삭제하면 지우는 대신 이 상태로 남긴다 —
     * 행이 남아 있어야 {@code resolveSource} 가 같은 도메인을 다시 등록하지 않는다.
     */
    @Builder.Default
    @Column(nullable = false)
    private boolean blocked = false;

    private LocalDateTime blockedAt;

    @Builder.Default
    @Column(nullable = false)
    private boolean autoPublishAllowed = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean imageUseAllowed = false;

    /** 관리자가 직접 등록한 것이 아니라 기사 수집 중 자동으로 등록된 출처. 삭제 시 차단으로 남긴다. */
    @Builder.Default
    @Column(nullable = false)
    private boolean autoDiscovered = false;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiNewsSourceCrawlStatus crawlStatus = AiNewsSourceCrawlStatus.NOT_CHECKED;

    private LocalDateTime lastCrawledAt;

    @Column(length = 1000)
    private String lastCrawlError;

    /** 차단 상태는 여기서 건드리지 않는다 — 일반 수정으로 차단이 풀리면 안 된다({@link #unblock()} 전용). */
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
        this.enabled = enabled && !this.blocked;
        this.autoPublishAllowed = autoPublishAllowed && !this.blocked;
        this.imageUseAllowed = imageUseAllowed && !this.blocked;
        if (collectionChanged) {
            this.crawlStatus = AiNewsSourceCrawlStatus.NOT_CHECKED;
            this.lastCrawledAt = null;
            this.lastCrawlError = null;
        }
    }

    /** 삭제 대신 차단. 행이 남아야 같은 도메인이 수집 과정에서 다시 등록되지 않는다. */
    public void block(LocalDateTime blockedAt) {
        this.blocked = true;
        this.blockedAt = blockedAt;
        this.enabled = false;
        this.autoPublishAllowed = false;
        this.imageUseAllowed = false;
        this.sourceType = AiNewsSourceType.UNAPPROVED;
    }

    /** 차단 해제. 곧바로 수집에 쓰이지 않도록 비활성 상태로 되돌린다 — 관리자가 검토 후 직접 켠다. */
    public void unblock() {
        this.blocked = false;
        this.blockedAt = null;
        this.enabled = false;
    }

    public void recordCrawlResult(AiNewsSourceCrawlStatus status, String error, LocalDateTime checkedAt) {
        this.crawlStatus = status;
        this.lastCrawledAt = checkedAt;
        this.lastCrawlError = status == AiNewsSourceCrawlStatus.ERROR ? error : null;
    }
}
