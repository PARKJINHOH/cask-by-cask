package com.caskbycask.domain.ainews.entity;

import com.caskbycask.domain.ainews.entity.enums.AiNewsCategory;
import com.caskbycask.domain.ainews.entity.enums.AiNewsTopicStatus;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_news_topics")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AiNewsTopic extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 255, unique = true)
    private String normalizedKey;

    @Column(columnDefinition = "TEXT")
    private String aliases;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiNewsCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private AiNewsTopicStatus status = AiNewsTopicStatus.READY;

    @Builder.Default
    @Column(nullable = false)
    private boolean aiSuggested = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean allowRepublish = false;

    private LocalDateTime lastPublishedAt;

    public void update(String title, String aliases, AiNewsCategory category,
                       AiNewsTopicStatus status, boolean allowRepublish) {
        this.title = title;
        this.aliases = aliases;
        this.category = category;
        this.status = status;
        this.allowRepublish = allowRepublish;
    }

    public void markPublished(LocalDateTime publishedAt) {
        this.lastPublishedAt = publishedAt;
        this.status = AiNewsTopicStatus.COMPLETED;
        this.allowRepublish = false;
    }

    public void markDuplicateBlocked() {
        this.status = AiNewsTopicStatus.BLOCKED;
        this.allowRepublish = false;
    }

    public void markHold() {
        if (this.status != AiNewsTopicStatus.COMPLETED) this.status = AiNewsTopicStatus.HOLD;
    }
}
