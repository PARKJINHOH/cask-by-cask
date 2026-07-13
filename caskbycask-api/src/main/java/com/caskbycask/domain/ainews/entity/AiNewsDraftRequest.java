package com.caskbycask.domain.ainews.entity;

import com.caskbycask.domain.ainews.entity.enums.AiNewsDraftRequestStatus;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "ai_news_draft_requests", indexes =
        @Index(name = "idx_ai_news_draft_request_queue", columnList = "status,created_at"))
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AiNewsDraftRequest extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String prompt;

    @Column(length = 1500)
    private String referenceUrl1;

    @Column(length = 1500)
    private String referenceUrl2;

    @Column(length = 1500)
    private String referenceUrl3;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiNewsDraftRequestStatus status = AiNewsDraftRequestStatus.PENDING;

    @Column(length = 1000)
    private String failureReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "article_id")
    private AiNewsArticle article;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by_id", nullable = false)
    private User requestedBy;

    public List<String> referenceUrls() {
        return java.util.stream.Stream.of(referenceUrl1, referenceUrl2, referenceUrl3)
                .filter(java.util.Objects::nonNull).toList();
    }

    public void complete(AiNewsArticle article) {
        this.status = AiNewsDraftRequestStatus.COMPLETED;
        this.article = article;
        this.failureReason = null;
    }

    public void fail(String reason) {
        this.status = AiNewsDraftRequestStatus.FAILED;
        this.failureReason = reason;
    }

    public void cancel() {
        this.status = AiNewsDraftRequestStatus.CANCELLED;
    }
}
