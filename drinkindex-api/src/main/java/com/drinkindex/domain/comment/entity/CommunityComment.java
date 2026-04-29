package com.drinkindex.domain.comment.entity;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
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
public class CommunityComment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id", nullable = false)
    private Spirit spirit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private CommunityComment parent;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Builder.Default
    @Column(nullable = false)
    private Integer likeCount = 0;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isHidden = false;

    @Builder.Default
    @Column(nullable = false)
    private Integer reportCount = 0;

    @Column
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
        if (this.reportCount >= 3) {
            this.isHidden = true;
        }
    }
}
