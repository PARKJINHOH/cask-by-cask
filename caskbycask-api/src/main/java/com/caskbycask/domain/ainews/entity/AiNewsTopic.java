package com.caskbycask.domain.ainews.entity;

import com.caskbycask.domain.ainews.entity.enums.AiNewsCategory;
import com.caskbycask.domain.ainews.entity.enums.AiNewsTopicStatus;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 관리자가 직접 쓸 팁·정보 글의 '쓸 거리' 메모.
 *
 * <p>예전에는 AI 자동화가 다음에 쓸 주제를 고르는 큐였다 — 그래서 정규화 키(중복 판정용),
 * 동의어, 재발행 허용, 상태 다섯 가지가 필요했다. 지금은 AI 가 팁 글을 쓰지 않으므로
 * 사람이 읽는 메모 이상일 필요가 없다.
 */
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiNewsCategory category;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private AiNewsTopicStatus status = AiNewsTopicStatus.PLANNED;

    private LocalDateTime lastPublishedAt;

    public void update(String title, AiNewsCategory category, String memo, AiNewsTopicStatus status) {
        this.title = title;
        this.category = category;
        this.memo = memo;
        this.status = status;
    }

    public void markPublished(LocalDateTime publishedAt) {
        this.lastPublishedAt = publishedAt;
        this.status = AiNewsTopicStatus.DONE;
    }

    /** 연결된 글이 반려·삭제되면 다시 '쓸 예정'으로 돌린다. */
    public void markPlanned() {
        this.status = AiNewsTopicStatus.PLANNED;
    }
}
