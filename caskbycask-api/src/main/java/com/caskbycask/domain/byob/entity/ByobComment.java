package com.caskbycask.domain.byob.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(
    name = "byob_comments",
    indexes = {
        @Index(name = "idx_bc_byob",        columnList = "byob_id"),
        @Index(name = "idx_bc_participant",  columnList = "participant_user_id")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("BYOB 모임 댓글")
public class ByobComment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "byob_id", nullable = false)
    @Comment("BYOB 모임(byobs.id)")
    private Byob byob;

    // 이 댓글 쓰레드의 주인(참여자)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_user_id", nullable = false)
    @Comment("참가자 사용자(users.id)")
    private User participantUser;

    // 실제 작성자 (참여자 또는 주최자)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    @Comment("작성자(users.id)")
    private User author;

    @Column(nullable = false, length = 200)
    @Comment("댓글 내용")
    private String content;

    // 최상위 댓글 ID (답글이면 non-null)
    @Column(name = "parent_id")
    @Comment("부모 댓글(byob_comments.id)")
    private Long parentId;
}
