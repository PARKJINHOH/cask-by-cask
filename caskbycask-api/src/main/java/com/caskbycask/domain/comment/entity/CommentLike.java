package com.caskbycask.domain.comment.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(
        name = "comment_like",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_comment_like_comment_user", columnNames = {"comment_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_comment_like_user_id", columnList = "user_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("시음 댓글 좋아요")
public class CommentLike extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", nullable = false)
    @Comment("시음 댓글(community_comment.id)")
    private CommunityComment comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("사용자(users.id)")
    private User user;
}
