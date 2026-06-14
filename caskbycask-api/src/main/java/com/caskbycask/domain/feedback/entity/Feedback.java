package com.caskbycask.domain.feedback.entity;

import com.caskbycask.domain.feedback.entity.enums.FeedbackStatus;
import com.caskbycask.domain.feedback.entity.enums.FeedbackType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

/**
 * 개선·문의 (이슈 트래커형 게시글).
 * - 작성자(author) 본인과 관리자(SUPER_ADMIN/ADMIN)만 조회 가능. 조회수 없음.
 * - 이메일 단방향 문의(Inquiry)와는 별개 도메인.
 */
@Entity
@Table(
        name = "feedback",
        indexes = {
                @Index(name = "idx_feedback_author", columnList = "author_id"),
                @Index(name = "idx_feedback_status", columnList = "status"),
                @Index(name = "idx_feedback_created_at", columnList = "createdAt")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("개선·문의(이슈 트래커)")
public class Feedback extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    @Comment("작성자(users.id)")
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("유형 — BUG/FEATURE/IMPROVEMENT/ETC")
    private FeedbackType type;

    @Column(nullable = false, length = 200)
    @Comment("제목")
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Comment("내용")
    private String content;

    // 첨부 이미지 URL (콤마 구분). 비어있으면 null.
    @Column(columnDefinition = "TEXT")
    @Comment("첨부 이미지 URL(목록)")
    private String imageUrls;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("처리 상태 — RECEIVED/CONFIRMED/IN_PROGRESS/ON_HOLD/RESOLVED/REJECTED")
    private FeedbackStatus status = FeedbackStatus.RECEIVED;

    @Builder.Default
    @Column(nullable = false)
    @Comment("진척률(0~100)")
    private Integer progress = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("댓글 수")
    private Integer commentCount = 0;

    // 공개 여부 — 기본 공개(전체 회원 열람 가능). 비공개는 작성자+관리자만 열람(기존 동작).
    @Builder.Default
    @Column(name = "is_public", nullable = false)
    @Comment("공개 여부")
    private Boolean isPublic = true;

    @Comment("처리 완료 일시")
    private LocalDateTime resolvedAt;

    // ─── 도메인 메서드 ───────────────────────────

    public boolean isOwnedBy(Long userId) {
        return author != null && author.getId().equals(userId);
    }

    public boolean isEditable() {
        return status == FeedbackStatus.RECEIVED;
    }

    /** 공개글이거나 작성자 본인 또는 관리자면 열람 가능. */
    public boolean isVisibleTo(Long userId, boolean isAdmin) {
        return isAdmin || isOwnedBy(userId) || Boolean.TRUE.equals(isPublic);
    }

    /** 작성자 본문 수정 (접수 상태에서만 호출). */
    public void updateContent(FeedbackType type, String title, String content, Boolean isPublic) {
        this.type = type;
        this.title = title;
        this.content = content;
        if (isPublic != null) {
            this.isPublic = isPublic;
        }
    }

    /** 관리자 상태/진척률 변경. progress 가 null 이면 상태 기본 제안값 사용(그것도 null 이면 유지). */
    public void changeStatus(FeedbackStatus status, Integer progress) {
        this.status = status;
        Integer next = (progress != null) ? progress : status.suggestedProgress();
        if (next != null) {
            this.progress = Math.max(0, Math.min(100, next));
        }
        this.resolvedAt = (status == FeedbackStatus.RESOLVED) ? LocalDateTime.now() : null;
    }

    public void incrementCommentCount() { this.commentCount++; }
}
