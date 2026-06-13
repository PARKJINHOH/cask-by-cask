package com.caskbycask.domain.byob.entity;

import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

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
public class ByobComment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "byob_id", nullable = false)
    private Byob byob;

    // 이 댓글 쓰레드의 주인(참여자)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_user_id", nullable = false)
    private User participantUser;

    // 실제 작성자 (참여자 또는 주최자)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, length = 200)
    private String content;

    // 최상위 댓글 ID (답글이면 non-null)
    @Column(name = "parent_id")
    private Long parentId;
}
