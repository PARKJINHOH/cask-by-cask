package com.drinkindex.domain.feedback.entity;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

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
public class FeedbackComment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "feedback_id", nullable = false)
    private Feedback feedback;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    // 운영팀(관리자) 답변 여부. 작성 시점의 작성자 역할로 판정.
    @Builder.Default
    @Column(nullable = false)
    private Boolean isAdminReply = false;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
}
