package com.drinkindex.domain.notice.entity;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "notice",
        indexes = {
                @Index(name = "idx_notice_category", columnList = "category"),
                @Index(name = "idx_notice_author_id", columnList = "author_id"),
                @Index(name = "idx_notice_is_published", columnList = "is_published"),
                @Index(name = "idx_notice_is_pinned", columnList = "is_pinned")
        }
)
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Notice extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 300)
    private String title;

    // [보안] XSS: 원본 HTML. DB 저장 전용, API 응답에서 절대 노출 금지.
    // LONGTEXT: HTML 원본은 이미지 src, 서식 태그 등으로 쉽게 수십 KB를 초과하므로 LONGTEXT 필수.
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    // [보안] XSS: jsoup Sanitize 완료본. API 응답은 이 필드만 사용.
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String contentSanitized;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private NoticeCategory category = NoticeCategory.GENERAL;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isPinned = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isPublished = false;

    @Builder.Default
    @Column(nullable = false)
    private Long viewCount = 0L;

    @Builder.Default
    @Column(nullable = false)
    private Long recommendCount = 0L;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column
    private LocalDateTime deletedAt;

    public void update(String title, String content, String contentSanitized, NoticeCategory category) {
        this.title = title;
        this.content = content;
        this.contentSanitized = contentSanitized;
        this.category = category;
    }

    public void pin()      { this.isPinned = true; }
    public void unpin()    { this.isPinned = false; }
    public void publish()  { this.isPublished = true; }
    public void unpublish(){ this.isPublished = false; }

    public void incrementViewCount() { this.viewCount++; }

    public void increaseRecommendCount() { this.recommendCount++; }
    public void decreaseRecommendCount() { if (this.recommendCount > 0) this.recommendCount--; }

    public void softDelete() { this.deletedAt = LocalDateTime.now(); }
}
