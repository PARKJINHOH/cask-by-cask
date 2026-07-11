package com.caskbycask.domain.ainews.entity;

import com.caskbycask.domain.ainews.entity.enums.*;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ai_news_articles")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AiNewsArticle extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AiNewsArticleType articleType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AiNewsArticleStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiNewsCategory category;

    @Column(nullable = false, length = 300)
    private String title;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(nullable = false, precision = 5, scale = 4)
    private BigDecimal confidenceScore;

    @Column(length = 64, unique = true)
    private String canonicalUrlHash;

    @Column(nullable = false, length = 255, unique = true)
    private String dedupeKey;

    @Column(length = 1000)
    private String semanticFingerprint;

    private Long postId;
    private Long deletedPostId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private AiNewsTopic topic;

    private Long prefixId;

    @Builder.Default
    @Column(nullable = false)
    private boolean pinned = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean updateAvailable = false;

    @Column(length = 1000)
    private String imageUrl;

    @Column(length = 30)
    private String imageKind;

    @Column(length = 1000)
    private String imageRightsEvidence;

    @Column(length = 100)
    private String modelName;

    @Column(length = 1000)
    private String duplicateReason;

    @Column(length = 2000)
    private String failureReason;

    private LocalDateTime publishedAt;

    @Builder.Default
    @OneToMany(mappedBy = "article", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AiNewsArticleSource> sources = new ArrayList<>();

    public void addSource(AiNewsArticleSource source) {
        sources.add(source);
        source.attach(this);
    }

    public void updateDraft(String title, String content, AiNewsCategory category,
                            Long prefixId, boolean pinned, BigDecimal confidenceScore,
                            String semanticFingerprint) {
        this.title = title;
        this.content = content;
        this.category = category;
        this.prefixId = prefixId;
        this.pinned = pinned;
        this.confidenceScore = confidenceScore;
        this.semanticFingerprint = semanticFingerprint;
    }

    public void markPending(String reason) {
        this.status = AiNewsArticleStatus.PENDING_REVIEW;
        this.failureReason = reason;
    }

    public void publish(Long postId, LocalDateTime publishedAt) {
        this.postId = postId;
        this.deletedPostId = null;
        this.status = AiNewsArticleStatus.PUBLISHED;
        this.publishedAt = publishedAt;
        this.failureReason = null;
        if (topic != null) topic.markPublished(publishedAt);
    }

    public void reject(String reason) {
        this.status = AiNewsArticleStatus.REJECTED;
        this.failureReason = reason;
    }

    public void markDeleted(Long deletedPostId) {
        this.deletedPostId = deletedPostId;
        this.status = AiNewsArticleStatus.DELETED;
    }

    public void restore(Long postId) {
        this.postId = postId;
        this.deletedPostId = null;
        this.status = AiNewsArticleStatus.PUBLISHED;
    }

    public void markUpdateAvailable() {
        this.updateAvailable = true;
    }

    public void applyImageRetry(String title, String content, AiNewsCategory category,
                                BigDecimal confidenceScore, String semanticFingerprint,
                                String imageUrl, String imageKind, String imageRightsEvidence,
                                String modelName) {
        this.title = title;
        this.content = content;
        this.category = category;
        this.confidenceScore = confidenceScore;
        this.semanticFingerprint = semanticFingerprint;
        this.imageUrl = imageUrl;
        this.imageKind = imageKind;
        this.imageRightsEvidence = imageRightsEvidence;
        this.modelName = modelName;
    }

    public void markSkippedDuplicate(String reason) {
        this.status = AiNewsArticleStatus.SKIPPED_DUPLICATE;
        this.duplicateReason = reason;
        this.failureReason = reason;
    }
}
