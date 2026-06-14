package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.community.entity.enums.EmojiTargetType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

// [패치 13] 다형성 구조 — 게시판 댓글(POST_COMMENT) + 술 상세 댓글(SPIRIT_COMMENT)을 한 테이블로 통합.
//   기존: comment(post_comments) 단일 FK 참조
//   변경: targetType ENUM + targetId  (UNIQUE: targetType, targetId, emojiId, userId)
@Entity
@Table(
        name = "comment_emoji_reactions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_emoji_reaction_target_emoji_user",
                        columnNames = {"target_type", "target_id", "emoji_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_emoji_reaction_target", columnList = "target_type, target_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("댓글 이모지 반응")
public class CommentEmojiReaction extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    // [패치 13] 대상 유형 (POST_COMMENT / SPIRIT_COMMENT)
    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    @Comment("대상 유형 — POST_COMMENT/SPIRIT_COMMENT")
    private EmojiTargetType targetType;

    // [패치 13] 대상 댓글 ID (post_comments.id 또는 community_comments.id)
    @Column(name = "target_id", nullable = false)
    @Comment("대상 식별자")
    private Long targetId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emoji_id", nullable = false)
    @Comment("이모지(community_emojis.id)")
    private CommunityEmoji emoji;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("사용자(users.id)")
    private User user;
}
