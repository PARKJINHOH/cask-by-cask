package com.drinkindex.domain.community.entity;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "post_comments",
        indexes = {
                @Index(name = "idx_comment_post_id", columnList = "post_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PostComment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    // 대댓글 시 부모 댓글. 2단계 이상 중첩 불가.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private PostComment parent;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    // @닉네임 멘션 시 해당 user_id 저장 (알림 트리거용)
    private Long mentionedUserId;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isAnonymous = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isHidden = false;

    @Builder.Default
    @Column(nullable = false)
    private Integer reportCount = 0;

    private LocalDateTime deletedAt;

    public boolean isDeleted() { return deletedAt != null; }

    public void softDelete() { this.deletedAt = LocalDateTime.now(); }

    public void incrementReportCount() {
        this.reportCount++;
        if (this.reportCount >= 3) {
            this.isHidden = true;
        }
    }

    public void setHidden(Boolean isHidden)  { this.isHidden = isHidden; }

    public void updateContent(String content) { this.content = content; }
}
