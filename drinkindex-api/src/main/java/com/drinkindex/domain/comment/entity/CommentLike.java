package com.drinkindex.domain.comment.entity;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

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
public class CommentLike extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id", nullable = false)
    private CommunityComment comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
