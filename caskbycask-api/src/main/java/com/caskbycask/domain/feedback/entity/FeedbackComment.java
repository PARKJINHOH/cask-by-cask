package com.caskbycask.domain.feedback.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 개선·문의 댓글 스레드 (작성자 ↔ 운영팀 후속 소통).
 * 작성자 본인과 관리자만 조회/작성 가능.
 */
@Entity
@Table(
        name = "feedback_comment",
        indexes = {
                @Index(name = "idx_feedback_comment_feedback", columnList = "feedback_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("개선·문의 댓글")
public class FeedbackComment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "feedback_id", nullable = false)
    @Comment("개선·문의(feedback.id)")
    private Feedback feedback;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    @Comment("작성자(users.id)")
    private User author;

    // 운영팀(관리자) 답변 여부. 작성 시점의 작성자 역할로 판정.
    @Builder.Default
    @Column(nullable = false)
    @Comment("운영팀 답변 여부")
    private Boolean isAdminReply = false;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Comment("댓글 내용")
    private String content;
}
