package com.caskbycask.domain.notice.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "notice",
        indexes = {
                @Index(name = "idx_notice_category", columnList = "category"),
                @Index(name = "idx_notice_author_id", columnList = "author_id"),
                @Index(name = "idx_notice_is_published", columnList = "is_published"),
                @Index(name = "idx_notice_published_at", columnList = "published_at"),
                @Index(name = "idx_notice_is_pinned", columnList = "is_pinned")
        }
)
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("공지사항")
public class Notice extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(nullable = false, length = 300)
    @Comment("제목")
    private String title;

    // [보안] XSS: 원본 HTML. DB 저장 전용, API 응답에서 절대 노출 금지.
    // LONGTEXT: HTML 원본은 이미지 src, 서식 태그 등으로 쉽게 수십 KB를 초과하므로 LONGTEXT 필수.
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    @Comment("본문 HTML(원본)")
    private String content;

    // [보안] XSS: jsoup Sanitize 완료본. API 응답은 이 필드만 사용.
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    @Comment("본문 HTML(XSS 필터링)")
    private String contentSanitized;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("분류 — GENERAL/EVENT/UPDATE/MAINTENANCE/NOTICE")
    private NoticeCategory category = NoticeCategory.GENERAL;

    @Builder.Default
    @Column(nullable = false)
    @Comment("상단 고정 여부")
    private Boolean isPinned = false;

    @Builder.Default
    @Column(nullable = false)
    @Comment("게시 여부")
    private Boolean isPublished = false;

    @Column
    @Comment("발행 예정/실제 일시")
    private LocalDateTime publishedAt;

    @Builder.Default
    @Column(nullable = false)
    @Comment("조회 수")
    private Long viewCount = 0L;

    @Builder.Default
    @Column(nullable = false)
    @Comment("추천 수")
    private Long recommendCount = 0L;

    @Builder.Default
    @Column(nullable = false)
    @Comment("노출 순서 (작을수록 위)")
    private Integer displayOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    @Comment("작성자(users.id)")
    private User author;

    @Column
    @Comment("삭제 일시(소프트삭제)")
    private LocalDateTime deletedAt;

    public void update(String title, String content, String contentSanitized, NoticeCategory category) {
        this.title = title;
        this.content = content;
        this.contentSanitized = contentSanitized;
        this.category = category;
    }

    public void pin()      { this.isPinned = true; }
    public void unpin()    { this.isPinned = false; }
    public void publish(LocalDateTime publishedAt) {
        this.isPublished = true;
        this.publishedAt = publishedAt;
    }

    public void unpublish() {
        this.isPublished = false;
        this.publishedAt = null;
    }

    public void incrementViewCount() { this.viewCount++; }

    public void increaseRecommendCount() { this.recommendCount++; }
    public void decreaseRecommendCount() { if (this.recommendCount > 0) this.recommendCount--; }

    public void updateDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }

    public void softDelete() { this.deletedAt = LocalDateTime.now(); }
}
