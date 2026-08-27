package com.caskbycask.domain.ainews.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_news_article_sources")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AiNewsArticleSource extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "article_id", nullable = false)
    private AiNewsArticle article;

    @Column(nullable = false, length = 1500)
    private String sourceUrl;

    @Column(nullable = false, length = 1500)
    private String canonicalUrl;

    @Column(nullable = false, length = 255)
    private String domain;

    @Column(length = 500)
    private String sourceTitle;

    @Column(length = 2000)
    private String evidenceSummary;

    @Column(length = 64)
    private String contentHash;

    private LocalDateTime publishedAt;

    @Column(nullable = false)
    private LocalDateTime retrievedAt;

    void attach(AiNewsArticle article) {
        this.article = article;
    }

    public void updateUrl(String sourceUrl, String canonicalUrl, LocalDateTime retrievedAt) {
        this.sourceUrl = sourceUrl;
        this.canonicalUrl = canonicalUrl;
        this.sourceTitle = null;
        this.evidenceSummary = null;
        this.contentHash = null;
        this.publishedAt = null;
        this.retrievedAt = retrievedAt;
    }
}
