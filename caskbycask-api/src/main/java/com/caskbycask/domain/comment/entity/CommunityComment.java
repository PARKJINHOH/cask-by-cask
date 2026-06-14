package com.caskbycask.domain.comment.entity;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "community_comment",
        indexes = {
                @Index(name = "idx_comment_spirit_id", columnList = "spirit_id"),
                @Index(name = "idx_comment_user_id", columnList = "user_id"),
                @Index(name = "idx_comment_parent_id", columnList = "parent_id")
        }
)
@SQLRestriction("deleted_at IS NULL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("주류(시음) 댓글")
public class CommunityComment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id", nullable = false)
    @Comment("주류(spirit.id)")
    private Spirit spirit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @Comment("작성자(users.id)")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @Comment("부모 댓글(community_comment.id)")
    private CommunityComment parent;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Comment("댓글 내용")
    private String content;

    @Builder.Default
    @Column(nullable = false)
    @Comment("좋아요 수")
    private Integer likeCount = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("숨김 여부")
    private Boolean isHidden = false;

    @Builder.Default
    @Column(nullable = false)
    @Comment("신고 수")
    private Integer reportCount = 0;

    @Column
    @Comment("삭제 일시(소프트삭제)")
    private LocalDateTime deletedAt;

    public void updateContent(String content) {
        this.content = content;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public void hide() {
        this.isHidden = true;
    }

    public void unhide() {
        this.isHidden = false;
    }

    public void incrementLikeCount() {
        this.likeCount++;
    }

    public void decrementLikeCount() {
        if (this.likeCount > 0) {
            this.likeCount--;
        }
    }

    public void incrementReportCount() {
        this.reportCount++;
        // [패치 6] 하드코딩 3 → ReportConstants.SPIRIT_COMMENT_HIDE_THRESHOLD
        if (this.reportCount >= com.caskbycask.global.constants.ReportConstants.SPIRIT_COMMENT_HIDE_THRESHOLD) {
            this.isHidden = true;
        }
    }
}
