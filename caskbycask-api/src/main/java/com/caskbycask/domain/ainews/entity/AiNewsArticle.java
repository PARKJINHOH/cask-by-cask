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

    /** AI 가 물어온 소재의 요약. 본문이 아니다 — 관리자가 기사를 쓸지 판단하고 쓰는 동안 참고한다. */
    @Column(length = 1000)
    private String leadSummary;

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

    @Column(length = 100)
    private String modelName;

    @Column(length = 1000)
    private String duplicateReason;

    @Column(length = 2000)
    private String failureReason;

    private LocalDateTime scheduledAt;

    private LocalDateTime publishedAt;

    @Builder.Default
    @OneToMany(mappedBy = "article", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AiNewsArticleSource> sources = new ArrayList<>();

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "ai_news_article_hashtags", joinColumns = @JoinColumn(name = "article_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "hashtag", nullable = false, length = 30)
    private List<String> hashtags = new ArrayList<>();

    public void addSource(AiNewsArticleSource source) {
        sources.add(source);
        source.attach(this);
    }

    public void updateDraft(String title, String content, AiNewsCategory category,
                            Long prefixId, boolean pinned, List<String> hashtags) {
        this.title = title;
        this.content = content;
        this.category = category;
        this.prefixId = prefixId;
        this.pinned = pinned;
        replaceHashtags(hashtags);
    }

    public void markPending(String reason) {
        this.status = AiNewsArticleStatus.PENDING_REVIEW;
        this.failureReason = reason;
    }

    public void publish(Long postId, LocalDateTime publishedAt) {
        this.postId = postId;
        this.deletedPostId = null;
        this.status = AiNewsArticleStatus.PUBLISHED;
        this.scheduledAt = null;
        this.publishedAt = publishedAt;
        this.failureReason = null;
        if (topic != null) topic.markPublished(publishedAt);
    }

    public void reject(String reason) {
        this.status = AiNewsArticleStatus.REJECTED;
        this.scheduledAt = null;
        this.failureReason = reason;
    }

    public void markDeleted(Long deletedPostId) {
        this.deletedPostId = deletedPostId;
        this.status = AiNewsArticleStatus.DELETED;
        this.scheduledAt = null;
    }

    public void restore(Long postId) {
        this.postId = postId;
        this.deletedPostId = null;
        this.status = AiNewsArticleStatus.PUBLISHED;
    }

    public void markUpdateAvailable() {
        this.updateAvailable = true;
    }

    public void markSkippedDuplicate(String reason) {
        this.status = AiNewsArticleStatus.SKIPPED_DUPLICATE;
        this.duplicateReason = reason;
        this.failureReason = reason;
    }

    public void replaceHashtags(List<String> hashtags) {
        this.hashtags.clear();
        this.hashtags.addAll(hashtags);
    }

    public void schedule(LocalDateTime scheduledAt) {
        this.status = AiNewsArticleStatus.SCHEDULED;
        this.scheduledAt = scheduledAt;
        this.failureReason = null;
    }

    public void cancelSchedule() {
        this.status = AiNewsArticleStatus.PENDING_REVIEW;
        this.scheduledAt = null;
        this.failureReason = "예약발행이 취소되었습니다. 내용을 검토한 후 발행해주세요.";
    }

    public void failScheduledPublish() {
        this.status = AiNewsArticleStatus.FAILED;
        this.scheduledAt = null;
        this.failureReason = "예약발행에 실패했습니다. 내용을 확인한 후 직접 다시 발행해주세요.";
    }
}
